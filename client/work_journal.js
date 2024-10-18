import {between, Duration} from "../date/duration.js";
import {addDuration} from "../date/date.js";
import {fromJsonString, WorkLog} from "./worklog.js";


class WorkJournal {
    constructor(settings, jira_client_supplier, username_supplier, worklog_updated_callback) {
        this._settings = settings;
        this._jira_client_supplier = jira_client_supplier;
        this._username_supplier = username_supplier;
        this._settings_changed_id = settings.connect('changed', this._settings_changed.bind(this));
        this._settings_changed();
        this.worklog_updated_callback = worklog_updated_callback;

        const recent_work = settings.get_string("most-recent-work-log");
        if (recent_work && JSON.parse(recent_work) && ("timeSpentSeconds" in JSON.parse(recent_work))) {
            // legacy format, to be removed
            const last_work_log = JSON.parse();
            this._current_work = fromTempo(last_work_log && new Date().getTime() < new Date(last_work_log.started).getTime() + last_work_log.timeSpentSeconds * 1000
                ? last_work_log
                : undefined);
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

    start_work(issue, duration, callback) {
        if (this._current_work && this._current_work.issueId() !== issue) {
            this.stop_work();
        }

        const now = new Date();

        if (this._current_work) {
            // continue work
            this._current_work = this._current_work.withDuration(between(this._current_work.start(), now).add(duration));
            this._save_worklog(this._current_work, result => {
                callback?.(result);
                this._store_current_work();
            });
        } else {
            if (this._previous_work && between(addDuration(this._previous_work.end(), this._gap_auto_close), now).toMillis() < 0) {
                // gap is small enough, just close it
                if (this._previous_work.issueId() === issue) {
                    //just adjust the previous log duration
                    this._current_work = this._previous_work.withDuration(between(this._previous_work.start(), now).add(duration));
                    this._previous_work = undefined;
                    this._save_worklog(this.current_work(), result => {
                        callback?.(result);
                        this._store_current_work();
                    })
                } else {
                    // start a new worklog with a start in the past
                    this._save_worklog(
                        new WorkLog(this._previous_work.end(),
                            between(this._previous_work.end(), now).add(duration),
                            issue),
                        result => {
                            this._previous_work = undefined;
                            this._current_work = result;
                            callback?.(result);
                            this._store_current_work();
                        })
                }
            } else {
                this._current_work = new WorkLog(now, duration, issue);
                this._save_worklog(this._current_work, result => {
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
            this._save_worklog(this._previous_work);
            this._current_work = undefined;
            callback?.();
            this._store_current_work();
        }
    }

    current_work() {
        return this._current_work;
    }

    /*
     See https://www.tempo.io/server-api-documentation/timesheets#tag/Worklogs/operation/createWorklog
     */
    _save_worklog(worklog, callback) {
        if (worklog.worklogId()) {
            this._update_worklog(worklog, callback)
            return;
        }
        console.debug(`creating worklog for ${worklog.issueId()} from ${worklog.start()} lasting ${worklog.duration().toSeconds()}`);

        let payload = {
            "billableSeconds": worklog.duration().toSeconds(),
            "includeNonWorkingDays": false,
            "originTaskId": worklog.issueId(),
            "started": this._format_date(worklog.start()),
            "timeSpentSeconds": worklog.duration().toSeconds(),
            "worker": this._username_supplier()
        };

        this._jira_client_supplier().post(
            '/rest/tempo-timesheets/4/worklogs',
            payload,
            response => {
                console.debug("create worklog response ", JSON.stringify(response));
                if (Array.isArray(response) && response.length > 0) {
                    callback?.(fromTempo(response[0]));
                } else {
                    callback?.()
                }
            });
    }

    _update_worklog(worklog, callback) {
        console.debug(`Updating ${worklog}`);
        if (!worklog.worklogId()) {
            throw `Can't update new worklog ${worklog}`
        }

        const payload = {
            "billableSeconds": worklog.duration().toSeconds(),
            "includeNonWorkingDays": false,
            "originTaskId": worklog.issueId(),
            "started": this._format_date(worklog.start()),
            "timeSpentSeconds": worklog.duration().toSeconds(),
            "worker": this._username_supplier()
        };

        this._jira_client_supplier().put(
            `/rest/tempo-timesheets/4/worklogs/${worklog.worklogId()}`,
            payload,
            response => {
                console.debug("update worklog response ", JSON.stringify(response));
                callback?.(fromTempo(response));
            });
    }

    // not in use yet
    _current_log(result_handler) {
        this._jira_client_supplier().post("/rest/tempo-timesheets/4/worklogs/search", {
                from: (d => new Date(d.setDate(d.getDate() - 1)))(new Date).toISOString().substring(0, 10), // yesterday
                to: (d => new Date(d.setDate(d.getDate() + 1)))(new Date).toISOString().substring(0, 10), // tomorrow
                worker: [this._username_supplier()]
            },
            (response) => {
                if (Array.isArray(response)) {
                    const now = new Date().getTime();
                    result_handler(response.find(r => new Date(r.started).getTime() <= now && now < new Date(r.started).getTime() + r.timeSpentSeconds * 1000));
                }
            });
    }

    _store_current_work() {
        console.debug(`Storing current WorkLog: ${(this._current_work || this._previous_work)?.toJsonString()}`)
        this._settings.set_string("most-recent-work-log", (this._current_work || this._previous_work)?.toJsonString())
    }

    destroy() {
        // see https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/2621
        // this isn't called when the user logs out
        // for the time being, we also update the setting every time we update the work-log
        this._store_current_work();
        this._settings.disconnect(this._settings_changed_id)
    }

    _format_date(date) {
        const options = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        };
        const dateTimeFormat = new Intl.DateTimeFormat('de-DE', options);
        const parts = dateTimeFormat.formatToParts(date)
            .filter((p) => p.type !== "literal")
            .reduce((result, next) => {
                const x = {}
                x[next.type] = next.value;
                return Object.assign(result, x);
            }, {});

        return parts.year + "-" + parts.month + "-" + parts.day + " " + parts.hour + ":" + parts.minute + ":" + parts.second + ".000";
    }

}

function fromTempo(worklog) {
    return worklog
        ? new WorkLog(
            new Date(worklog.started),
            new Duration(worklog.timeSpentSeconds * 1000),
            worklog.issue.key,
            worklog.tempoWorklogId)
        : undefined;
}

export {WorkJournal};
