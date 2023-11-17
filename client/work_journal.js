const Lang = imports.lang;

var WorkJournal = class WorkJournal {
    constructor(jira_client_supplier, username_supplier) {
        this._jira_client_supplier = jira_client_supplier;
        this._current_work_log = null;
        this._username_supplier = username_supplier;
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
        }));
    }

    current_log(result_handler) {
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
