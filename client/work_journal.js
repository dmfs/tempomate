import { between, Duration } from "../date/duration.js";
import { addDuration } from "../date/date.js";
import { fromJsonString, WorkLog } from "./worklog.js";


class WorkJournal {
    constructor(settings, tempo_client, worklog_updated_callback) {
        this._settings = settings;
        this.tempo_client = tempo_client;
        this._settings_changed_id = settings.connect('changed', this._settings_changed.bind(this));
        this._settings_changed();
        this.worklog_updated_callback = worklog_updated_callback;

        const recent_work = settings.get_string("most-recent-work-log");
        if (recent_work && JSON.parse(recent_work) && ("timeSpentSeconds" in JSON.parse(recent_work))) {
            this._previous_work = undefined;
            this._current_work = undefined;
        } else {
            // new format
            const worklog = fromJsonString(recent_work)
            if (worklog?.end().getTime() < new Date().getTime()) {
                this._previous_work = worklog;
                this._current_work = undefined;
            } else {
                this._previous_work = undefined;
                this._current_work = worklog;
            }
        }
    }

    _settings_changed() {
        this._gap_auto_close = new Duration(JSON.parse(this._settings.get_int("gap-auto-close-minutes")) * 60 * 1000);
    }

    start_work(issueId, duration, callback) {
        if (this._current_work && this._current_work.issueId() == issueId) {
            this.stop_work();
        }

        const now = new Date();

        if (this._current_work) {
            // continue work
            this._current_work = this._current_work.withDuration(between(this._current_work.start(), now).add(duration));
            this.tempo_client.save_worklog(this._current_work, result => {
                callback?.(result);
                this._store_current_work();
            });
        } else {
            if (this._previous_work && between(addDuration(this._previous_work.end(), this._gap_auto_close), now).toMillis() < 0) {
                // gap is small enough, just close it
                if (this._previous_work.issueId() == issueId) {
                    //just adjust the previous log duration
                    this._current_work = this._previous_work.withDuration(between(this._previous_work.start(), now).add(duration));
                    this._previous_work = undefined;
                    this.tempo_client.save_worklog(this.current_work(), result => {
                        callback?.(result);
                        this._store_current_work();
                    })
                } else {
                    // start a new worklog with a start in the past
                    this.tempo_client.save_worklog(
                        new WorkLog(this._previous_work.end(),
                            between(this._previous_work.end(), now).add(duration),
                            issueId),
                        result => {
                            this._previous_work = undefined;
                            this._current_work = result;
                            callback?.(result);
                            this._store_current_work();
                        })
                }
            } else {
                this._current_work = new WorkLog(now, duration, issueId);
                this.tempo_client.save_worklog(this._current_work, result => {
                    // update with synced worklog
                    this._current_work = result;
                    callback?.(result);
                    this._store_current_work();
                });
            }
        }
    }

    stop_work(callback) {
        if (this._current_work) {
            this._previous_work = this._current_work.withDuration(between(this._current_work.start(), new Date()));
            this.tempo_client.save_worklog(this._previous_work);
            this._current_work = undefined;
            callback?.();
            this._store_current_work();
        }
    }

    current_work() {
        return this._current_work;
    }

    _store_current_work() {
        if (this._current_work || this._previous_work) {
            console.debug(`Storing current WorkLog: ${(this._current_work || this._previous_work)?.toJsonString()}`)
            this._settings.set_string("most-recent-work-log", (this._current_work || this._previous_work)?.toJsonString())
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
