const Lang = imports.lang;

var WorkJournal = class WorkJournal {
    constructor(settings, jira_client_supplier, username_supplier) {
        this._settings = settings;
        this._jira_client_supplier = jira_client_supplier;
        this._username_supplier = username_supplier;
        this._settings_changed_id = settings.connect('changed', Lang.bind(this, this._settings_changed));
        this._settings_changed();

        const last_work_log = JSON.parse(settings.get_string("most-recent-work-log"));
        this._previous_work_log = null;
        this._current_work_log = last_work_log && new Date().getTime() < new Date(last_work_log.started).getTime() + last_work_log.timeSpentSeconds * 1000 ? last_work_log : null;
        this._current_work = this._current_work_log ? {
            key: this._current_work_log.issue.key,
            start: new Date(last_work_log.started),
            duration: last_work_log.timeSpentSeconds
        } : null;
    }

    _settings_changed() {
        this._gap_auto_close_minutes = JSON.parse(this._settings.get_int("gap-auto-close-minutes"));
    }

    start_work(issue, duration = 3600) {
        if (this._current_work && this._current_work.key !== issue) {
            this.stop_work();
        }

        const now = new Date();

        if (this._current_work) {
            // continue work
            this.log_work(issue, this._current_work.start, new Date(now.getTime() + duration * 1000))
            this._current_work.duration = (now.getTime() - this._current_work.start.getTime()) / 1000 + duration
        } else {
            let start = now;
            if (this._previous_work_log) {
                const prev_end = new Date(this._previous_work_log.started).getTime() + this._previous_work_log.timeSpentSeconds * 1000;
                if (now.getTime() < prev_end + this._gap_auto_close_minutes * 1000 * 60) {
                    if (this._previous_work_log.issue.key === issue) {
                        // same issue, just extend the work-log
                        this._current_work_log = this._previous_work_log;
                        start = new Date(this._previous_work_log.started)
                    } else {
                        // new issue, continue seamlessly
                        start = new Date(prev_end);
                        log("dating work back to " + start);
                    }
                }
            }
            this.log_work(issue, start, new Date(now.getTime() + duration * 1000))
            this._current_work = {
                key: issue,
                start: now,
                duration: duration
            }
        }
    }

    stop_work() {
        if (this._current_work) {
            const started = new Date(this._current_work_log.started);
            const now = new Date();
            this._previous_work_log = this._current_work_log;
            this._previous_work_log.timeSpentSeconds = (now.getTime() - started.getTime()) / 1000
            this.log_work(this._current_work_log.issue.key, started, now);
            this._current_work_log = null;
            this._current_work = null;
        }
    }

    current_work() {
        if (this._current_work) {
            return this._current_work;
        }
    }

    /*
      See https://www.tempo.io/server-api-documentation/timesheets#tag/Worklogs/operation/createWorklog
      */
    log_work(issue, start, end) {
        log("logging work for " + issue + " from " + start + " until " + end);
        let method = "POST";
        let path = '/rest/tempo-timesheets/4/worklogs';
        if (this._current_work_log && this._current_work_log.issue.key === issue) {
            path += "/" + this._current_work_log.tempoWorklogId;
            method = "PUT";
        }

        let payload = {
            "billableSeconds": Math.round((end.getTime() - start.getTime()) / 1000),
            "includeNonWorkingDays": false,
            "originTaskId": issue,
            "started": this._format_date(start),
            "timeSpentSeconds": Math.round((end.getTime() - start.getTime()) / 1000),
            "worker": this._username_supplier()
        };

        this._jira_client_supplier()._request(method, path, payload, Lang.bind(this, (response) => {
            log(JSON.stringify(response))
            if (Array.isArray(response)) {
                this._current_work_log = response[0];
            }
            this._settings.set_string("most-recent-work-log", JSON.stringify(this._current_work_log))
        }));
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
                    const current = response.find(r => new Date(r.started).getTime() <= now && now < new Date(r.started).getTime() + r.timeSpentSeconds * 1000)
                    if (current) {
                        result_handler(current);
                    }
                }
            });
    }

    destroy() {
        // see https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/2621
        // this isn't called when the user logs out
        // for the time being, we also update the setting every time we update the work-log
        this._settings.set_string("most-recent-work-log", JSON.stringify(this._current_work_log))

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
