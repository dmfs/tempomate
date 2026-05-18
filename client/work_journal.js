import { between, Duration } from "../date/duration.js";
import { addDuration } from "../date/date.js";
import { fromJsonString, WorkLog } from "./worklog.js";
import { retrying } from '../utils/utils.js';
import { debug } from "../utils/log.js";


class WorkJournal {
    constructor(settings, tempo_client_promise, error_callback) {
        this._settings = settings;
        this.tempo_client_promise = tempo_client_promise;
        this._settings_changed_id = settings.connect('changed', this._settings_changed.bind(this));
        this._settings_changed();
        this._error_callback = error_callback;

        const recent_work = settings.get_string("most-recent-work-log");
        if (recent_work && JSON.parse(recent_work) && ("timeSpentSeconds" in JSON.parse(recent_work))) {
            this._previous_work = undefined;
            this._current_work = undefined;
        } else {
            const parsed = recent_work ? JSON.parse(recent_work) : null;
            const worklog = fromJsonString(recent_work)
            const active = parsed?.hasOwnProperty('active')
                ? parsed.active
                : worklog?.end().getTime() >= new Date().getTime();
            if (worklog && active) {
                this._previous_work = undefined;
                this._current_work = worklog;
            } else {
                this._previous_work = worklog;
                this._current_work = undefined;
            }
        }
    }

    async tempo_client() {
        if (!this._tempo_client) {
            this._tempo_client = await retrying(this.tempo_client_promise(), 5, Duration.ofSeconds(1))
        }
        return Promise.resolve(this._tempo_client);
    }

    _settings_changed() {
        this._gap_auto_close = new Duration(JSON.parse(this._settings.get_int("gap-auto-close-minutes")) * 60 * 1000);
    }

    start_work(issueId, duration, callback) {
        if (this._current_work && this._current_work.issueId() != issueId) {
            this.stop_work();
        }

        const now = new Date();

        if (this._current_work) {
            // continue work
            this._current_work = this._current_work.withDuration(between(this._current_work.start(), now).add(duration));
            const worklog = this._current_work;
            this.tempo_client().then(client => client.save_worklog(worklog, result => {
                callback?.(result);
                this._store_current_work();
            }))
                .catch(error => this._handle_error(error));
        } else {
            if (this._previous_work && between(addDuration(this._previous_work.end(), this._gap_auto_close), now).toMillis() < 0) {
                // gap is small enough, just close it
                if (this._previous_work.issueId() == issueId) {
                    //just adjust the previous log duration
                    this._current_work = this._previous_work.withDuration(between(this._previous_work.start(), now).add(duration));
                    this._previous_work = undefined;
                    const worklog = this._current_work;
                    this.tempo_client().then(client => client.save_worklog(worklog, result => {
                        callback?.(result);
                        this._store_current_work();
                    }))
                        .catch(error => this._handle_error(error));
                } else {
                    // start a new worklog with a start in the past
                    this._current_work = new WorkLog(this._previous_work.end(),
                        between(this._previous_work.end(), now).add(duration),
                        issueId);
                    this._previous_work = undefined;
                    this._store_current_work();
                    const worklog = this._current_work;
                    this.tempo_client().then(client => client.save_worklog(worklog, result => {
                        this._current_work = result;
                        callback?.(result);
                        this._store_current_work();
                    }))
                        .catch(error => this._handle_error(error));
                }
            } else {
                this._current_work = new WorkLog(now, duration, issueId);
                const worklog = this._current_work;
                this.tempo_client().then(client => client.save_worklog(worklog, result => {
                    // update with synced worklog
                    this._current_work = result;
                    callback?.(result);
                    this._store_current_work();
                }))
                    .catch(error => this._handle_error(error));
            }
        }
    }

    sync_work() {
        if (this._current_work) {
            this._current_work = this._current_work.withDuration(between(this._current_work.start(), new Date()));
            const worklog = this._current_work;
            this.tempo_client().then(client => client.save_worklog(worklog, result => {
                this._store_current_work();
            }))
                .catch(error => this._handle_error(error));
        }
    }

    stop_work(callback) {
        if (this._current_work) {
            this._previous_work = this._current_work.withDuration(between(this._current_work.start(), new Date()));
            const worklog = this._previous_work;
            this.tempo_client().then(client => client.save_worklog(worklog))
                .catch(error => this._handle_error(error));
            this._current_work = undefined;
            callback?.();
            this._store_current_work();
        }
    }

    current_work() {
        return this._current_work;
    }

    _handle_error(error) {
        debug(`can't update worklog: ${error}`);
        this._error_callback?.(error);
    }

    _store_current_work() {
        if (this._current_work || this._previous_work) {
            const worklog = this._current_work || this._previous_work;
            const data = JSON.parse(worklog.toJsonString());
            data.active = !!this._current_work;
            debug(`Storing current WorkLog: ${JSON.stringify(data)}`)
            this._settings.set_string("most-recent-work-log", JSON.stringify(data))
        }
    }

    destroy() {
        // see https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/2621
        // this isn't called when the user logs out
        // for the time being, we also update the setting every time we update the work-log
        this._store_current_work();
        this._settings.disconnect(this._settings_changed_id)
    }
}

export { WorkJournal };
