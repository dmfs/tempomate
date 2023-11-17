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
