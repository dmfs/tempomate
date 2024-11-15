import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import GLib from 'gi://GLib';

class NotificationStateMachine {

    constructor() {
        this._current_issue_key = null;
        this._settings = {};
        this._start_idle_timeout();
        this._snooze_nag_until = undefined;
    }

    update_settings(settings) {
        const old_settings = this._settings;
        this._settings = settings;
        if (!this._current_issue_key &&
            (old_settings.idle_notifications !== settings.idle_notifications ||
                old_settings.idle_notification_interval !== settings.idle_notification_interval)) {
            this._start_idle_timeout();
        }
    }

    start_work(issue, details, notification_closed_callback) {
        this._snooze_nag_until = undefined;
        if (this._current_issue_key === issue.key) {
            // not a new issue, just update
            if (this._notification) {
                this._notification.set_property("title", "Working on " + issue.key)
                this._notification.set_property("body", details);
            }
            return;
        }
        this._remove_idle_timeout();
        this._dispose_notification();

        this._notification = new MessageTray.Notification({
            source: this._ensure_notification_source(),
            title: "Working on " + issue.key,
            body: details,
            'is-transient': false,
            resident: true
        });

        this._notification.connect("destroy", () => {
            if (this._notification) {
                this._notification = null;
                notification_closed_callback?.()
            }
        });
        this._ensure_notification_source().addNotification(this._notification);
        this._current_issue_key = issue.key;
    }


    stop_work() {
        if (!this._current_issue_key) {
            // nothing to do
            return;
        }

        this._dispose_notification();

        const notification = new MessageTray.Notification({
            source: this._ensure_notification_source(),
            title: "Stopped work on " + this._current_issue_key,
            'is-transient': true,
            resident: false
        });

        this._ensure_notification_source().addNotification(notification);
        this._current_issue_key = null;

        this._start_idle_timeout();
    }


    _idle() {
        if (new Date() < this._snooze_nag_until) {
            this._start_idle_timeout();
            return;
        }

        if (this._settings.idle_notifications && !this._current_issue_key) {

            this._dispose_notification();

            this._notification = new MessageTray.Notification({
                source: this._ensure_notification_source(),
                title: "⚠️ Your work is not tracked ⚠️",
                'is-transient': true
            });
            this._notification.connect("destroy", () => this._notification = null);
            this._notification.addAction("Snooze for 15 minutes", () => {
                this._snooze_nag_until = new Date(new Date().getTime() + 15 * 60 * 1000)
            });

            this._ensure_notification_source().addNotification(this._notification);
            this._start_idle_timeout();
        }
    }

    _start_idle_timeout() {
        this._remove_idle_timeout();
        let now = new Date();
        this._idle_timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT,
            now < this._snooze_nag_until
                ? (this._snooze_nag_until.getTime() - now.getTime()) / 1000
                : this._settings.idle_notification_interval,
            () => {
                this._idle();
                return GLib.SOURCE_CONTINUE;
            });
    }

    _remove_idle_timeout() {
        if (this._idle_timeout) {
            GLib.Source.remove(this._idle_timeout);
        }
    }

    _dispose_notification() {
        if (this._notification) {
            const old_notification = this._notification;
            this._notification = null;
            old_notification.destroy();
        }
    }

    _ensure_notification_source() {
        // notification sources destroy themselves when the last notification is closed, make sure we create a new one if necessary
        if (!this._notification_source) {
            this._notification_source = new MessageTray.Source({ title: "Tempomate", iconName: 'system-run-symbolic' });
            Main.messageTray.add(this._notification_source);
            this._notification_source.connect("destroy", () => this._notification_source = null);
        }
        return this._notification_source;
    }


    destroy() {
        this._notification_source?.destroy()
        this._notification_source = null;
        this._dispose_notification();
        this._remove_idle_timeout();
    }
}

export { NotificationStateMachine }
