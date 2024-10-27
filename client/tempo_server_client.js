import { WorkLog } from "./worklog.js";
import { Duration } from "../date/duration.js";

class TempoServerClient {
    constructor(rest_client, user_id, token) {
        this.rest_client = rest_client;
        this.user_id = user_id;
        this.token = token;
    }

    _update_worklog(worklog, callback) {
        console.debug(`Updating ${worklog}`);
        if (!worklog.worklogId()) {
            throw `Can't update new worklog ${worklog}`
        }

        this.rest_client.put(
            `/rest/tempo-timesheets/4/worklogs/${worklog.worklogId()}`,
            [["Authorization", `Bearer ${this.token}`]],
            this._payload(worklog),
            response => {
                console.debug("update worklog response ", JSON.stringify(response));
                callback?.(fromTempo(response));
            });
    }

    /*
      See https://www.tempo.io/server-api-documentation/timesheets#tag/Worklogs/operation/createWorklog
     */
    save_worklog(worklog, callback) {
        if (worklog.worklogId()) {
            this._update_worklog(worklog, callback)
            return;
        }

        this.rest_client.post(
            '/rest/tempo-timesheets/4/worklogs',
            [["Authorization", `Bearer ${this.token}`]],
            this._payload(worklog),
            response => {
                console.debug("create worklog response ", JSON.stringify(response));
                if (Array.isArray(response) && response.length > 0) {
                    callback?.(fromTempo(response[0]));
                } else {
                    callback?.()
                }
            });
    }

    _payload(worklog) {
        return {
            "billableSeconds": worklog.duration().toSeconds(),
            "includeNonWorkingDays": false,
            "originTaskId": worklog.issueId(),
            "started": this._format_date(worklog.start()),
            "timeSpentSeconds": worklog.duration().toSeconds(),
            "worker": this.user_id
        }
    }

    _format_date(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ` +
            `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.000`;
    }
}

function fromTempo(worklog) {
    return worklog
        ? new WorkLog(
            new Date(worklog.started),
            new Duration(worklog.timeSpentSeconds * 1000),
            worklog.issue.id,
            worklog.tempoWorklogId)
        : undefined;
}

export { TempoServerClient }