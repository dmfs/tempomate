import { addDuration } from "../date/date.js";
import { between, Duration } from "../date/duration.js";

class WorkLog {
    constructor(start, duration, issueId, worklogId) {
        this._start = start;
        this._duration = duration;
        this._issueId = issueId;
        this._worklogId = worklogId;
    }

    /**
     * The start Date of the WorkLog.
     */
    start() {
        return this._start;
    }

    /**
     * The end Date of the WorkLog.
     */
    end() {
        return addDuration(this._start, this._duration);
    }

    /**
     * The Duration of the WorkLog.
     */
    duration() {
        return this._duration;
    }

    /**
     * The identifier of the issue this WorkLog belongs to.
     */
    issueId() {
        return this._issueId;
    }

    /**
     * The identifier of this worklog on the remote end or undefined if this has not been synced yet.
     */
    worklogId() {
        return this._worklogId;
    }

    /**
     * Returns a new WorkLog like this with an updated duration.
     */
    withDuration(duration) {
        return new WorkLog(this._start, duration, this._issueId, this._worklogId);
    }

    /**
       * Returns a new WorkLog like this with an updated end date.
       */
    withEnd(end) {
        return new WorkLog(this._start, between(this._start, end), this._issueId, this._worklogId);
    }

    /**
       * Returns a new WorkLog like this with an updated end date.
       */
    withStart(start) {
        return new WorkLog(start, between(start, this.end()), this._issueId, this._worklogId);
    }


    toString() {
        return `Worklog for ${this._issueId} from ${this._start} for ${this._duration} millis`;
    }

    toJsonString() {
        return JSON.stringify({
            start: this._start.toISOString(),
            duration: this._duration.toMillis(),
            issueId: this._issueId,
            worklogId: this._worklogId ? this._worklogId : null
        });
    }
}

function fromJsonString(jsonString) {
    if (!jsonString) {
        return undefined;
    }
    const json = JSON.parse(jsonString);
    return json
        ? new WorkLog(new Date(json.start), new Duration(json.duration), json.issueId, json.worklogId || undefined)
        : undefined;
}

export { WorkLog, fromJsonString };

