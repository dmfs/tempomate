import { WorkLog } from "./worklog.js";
import { Duration } from "../date/duration.js";
import { debug } from "../utils/log.js";

class TempoCloudClient {
    constructor(rest_client, user_id, token) {
        this.rest_client = rest_client;
        this.user_id = user_id;
        this.token = token;
    }

    _update_worklog(worklog, callback) {
        debug(`Updating ${worklog}`);
        if (!worklog.worklogId()) {
            throw `Can't update new worklog ${worklog}`
        }

        this.rest_client.put(`/4/worklogs/${worklog.worklogId()}`, [["Authorization", `Bearer ${this.token}`]], this._payload(worklog))
            .then(response => {
                debug("update worklog response ", JSON.stringify(response));
                callback?.(fromTempo(response));
            });
    }

    /*
      See https://apidocs.tempo.io/#tag/Worklogs/operation/createWorklog
     */
    save_worklog(worklog, callback) {
        debug(`Saving ${worklog}`);
        if (worklog.worklogId()) {
            this._update_worklog(worklog, callback)
            return;
        }

        this.rest_client.post('/4/worklogs', [["Authorization", `Bearer ${this.token}`]], this._payload(worklog))
            .then(response => {
                debug("create worklog response ", JSON.stringify(response));
                callback?.(fromTempo(response));
            });
    }

    _payload(worklog) {
        const start = worklog.start();
        return {
            "issueId": worklog.issueId(),
            "startDate": `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}-${start.getDate().toString().padStart(2, '0')}`,
            "startTime": `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}:${start.getSeconds().toString().padStart(2, '0')}`,
            "timeSpentSeconds": Math.max(60, worklog.duration().toSeconds()),
            "authorAccountId": this.user_id
        }
    }
}

function fromTempo(worklog) {
    return worklog
        ? new WorkLog(
            new Date(`${worklog.startDate} ${worklog.startTime}`),
            new Duration(worklog.timeSpentSeconds * 1000),
            worklog.issue.id,
            worklog.tempoWorklogId)
        : undefined;
}

export { TempoCloudClient }