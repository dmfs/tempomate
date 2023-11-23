import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import GLib from 'gi://GLib';

class NotificationStateMachine {

    constructor() {
        this._current_issue = null;
        this._settings = {};
        this._start_idle_timeout();
    }

    update_settings(settings) {
        const old_settings = this._settings;
        this._settings = settings;
        if (!this._current_issue &&
            (old_settings.idle_notifications !== settings.idle_notifications ||
                old_settings.idle_notification_interval !== settings.idle_notification_interval)) {
            this._start_idle_timeout();
        }
    }

    start_work(issue, details, work_stopped_callback) {
        if (this._current_issue === issue) {
            // not a new issue, just update
            if (this._notification) {
                this._notification.update("Working on " + issue, details);
            }
            return;
        }

        log("notifying work on " + issue);

        this._remove_idle_timeout();

        this._dispose_notification();

        this._notification = new MessageTray.Notification(this._ensure_notification_source(), "Working on " + issue, details);
        this._notification.setTransient(false);
        this._notification.setResident(true);

        this._notification.connect("destroy", () => {
            if (this._notification) {
                this._notification = null;
                work_stopped_callback()
            }
        });
        this._ensure_notification_source().showNotification(this._notification);
        this._current_issue = issue;
    }


    stop_work() {
        if (!this._current_issue) {
            // nothing to do
            return;
        }

        this._dispose_notification();

        const notification = new MessageTray.Notification(this._ensure_notification_source(), "Stopped work on " + this._current_issue);
        notification.setTransient(true);
        notification.setResident(false);

        this._ensure_notification_source().showNotification(notification);
        this._current_issue = null;

        this._start_idle_timeout();
    }


    _idle() {
        log("idle called")
        if (this._settings.idle_notifications && !this._current_issue) {

            log("creating idle notification")
            this._dispose_notification();

            this._notification = new MessageTray.Notification(this._ensure_notification_source(), "⚠️ Your work is not tracked ⚠️");
            this._notification.setTransient(true);
            this._notification.connect("destroy", () => this._notification = null);

            this._ensure_notification_source().showNotification(this._notification);
            this._start_idle_timeout();
        }
    }

    _start_idle_timeout() {
        this._remove_idle_timeout();
        log("submitting idle timeout");
        this._idle_timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._settings.idle_notification_interval, () => {
            this._idle();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _remove_idle_timeout() {
        if (this._idle_timeout) {
            log("dropping idle timeout");
            GLib.Source.remove(this._idle_timeout);
        }
    }

    _dispose_notification() {
        if (this._notification) {
            log("notification disposed")
            const old_notification = this._notification;
            this._notification = null;
            old_notification.destroy();
        }
    }

    _ensure_notification_source() {
        // notification sources destroy themselves when the last notification is closed, make sure we create a new one if necessary
        if (!this._notification_source) {
            this._notification_source = new MessageTray.Source("Tempomate", 'system-run-symbolic');
            Main.messageTray.add(this._notification_source);
            this._notification_source.connect("destroy", () => this._notification_source = null);
        }
        return this._notification_source;
    }


    destroy() {
        log("state machine diposed")
        this._dispose_notification();
        this._remove_idle_timeout();
    }
}

export {NotificationStateMachine}
