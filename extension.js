/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {JiraApi2Client} from './client/jira_client.js';
import {WorkJournal} from './client/work_journal.js';
import {TempomateService} from './dbus/tempomate_service.js';
import {IssueMenuItem} from './ui/menuitem.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {NotificationStateMachine} from './ui/notification_state_machine.js';

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init(settings) {
            super._init(0.0, _('Tempomate'));

            this.label = new St.Label({
                style_class: 'panel-button',
                text: '⚠️ Not working on an issue ⚠️'
            });
            this.add_child(this.label);
            this.setMenu(new PopupMenu.PopupMenu(this, 0.0, St.Side.TOP, 0));
            this.settings = settings;
            this._work_journal = new WorkJournal(this.settings, () => this.client, () => this.username);
            this._notification_state_machine = new NotificationStateMachine();
            this._restore()
            this._settingsChangedId = this.settings.connect('changed', this._settingsChanged.bind(this));
            this._settingsChanged();
            this.update_label();
            this.updateUI(this.menu, true);
            this.menu.connect("open-state-changed", this.updateUI.bind(this))
            this.dbus_service = new TempomateService(this.fetch_and_start_or_continue_work.bind(this));
            if (this._work_journal.current_work()) {
                // set up stop timer if recent work has been restored
                const remaining = this._work_journal.current_work().start.getTime() / 1000 + this._work_journal.current_work().duration - new Date().getTime() / 1000;
                if (remaining > 0) {
                    this.stop_work_timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, remaining, () => {
                        this.stop_work();
                        return GLib.SOURCE_REMOVE;
                    });
                }
            }

            this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, () => {
                this.update_label();
                return GLib.SOURCE_CONTINUE;
            });

            this._filter_refresh_timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 900, () => {
                this._refreshFilters();
                return GLib.SOURCE_CONTINUE;
            });
        }

        _restore() {
            this.issues = JSON.parse(this.settings.get_string("issue-cache"));
            this.recent_issues = this.settings.get_strv("recent-issues")
                .map((i) => JSON.parse(i))
                .filter((issue) => issue.key && issue.fields);
        }

        _settingsChanged() {
            this.default_duration = this.settings.get_int("default-duration") * 60;
            this.queries = this.settings.get_strv('jqls').map((s) => JSON.parse(s));
            this.host = this.settings.get_string('host');
            this.username = this.settings.get_string('username');
            this.token = this.settings.get_string('token');
            this.client = new JiraApi2Client(this.host, this.token);

            this._notification_state_machine.update_settings({
                idle_notifications: this.settings.get_boolean("nag-notifications"),
                idle_notification_interval: this.settings.get_int("nag-notification-interval")
            })

            this._refreshFilters();
        }

        updateUI(menu, opened) {
            if (!opened) {
                return;
            }
            this.menu.removeAll();

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(_('Recent Issues')));

            const recent_issues_menu = new PopupMenu.PopupMenuSection()
            for (const issue in this.recent_issues) {
                if (this.recent_issues[issue].key === this._work_journal.current_work()?.key) {
                    recent_issues_menu.addMenuItem(this.generateMenuItem(this.recent_issues[issue], {
                        icon: "process-stop-symbolic",
                        tooltip: "Stop work",
                        callback: () => {
                            this.stop_work();
                            this.menu.close(true);
                        }
                    }));
                } else {
                    recent_issues_menu.addMenuItem(this.generateMenuItem(this.recent_issues[issue]));
                }
            }
            this.menu.addMenuItem(recent_issues_menu);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(_('Queries')));

            for (const q in this.queries) {

                let section = new PopupMenu.PopupSubMenuMenuItem(this.queries[q].name, true);

                for (const issue in this.issues[this.queries[q].name]) {
                    section.menu.addMenuItem(this.generateMenuItem(this.issues[this.queries[q].name][issue]));
                }
                this.menu.addMenuItem(section);
            }
        }

        generateMenuItem(issue, ...actions) {
            const _this = this;
            const item = new IssueMenuItem(issue.key, issue.fields.summary, ...actions);
            item.connect('activate', () => this.start_or_continue_work(issue));
            return item;
        }

        fetch_and_start_or_continue_work(issue) {
            this.client.issue(issue, this.start_or_continue_work.bind(this))
        }


        start_or_continue_work(issue) {
            if (!issue || !issue.key) {
                return
            }
            log("starting work " + issue.key)
            this.add_recent_issue(issue);
            this._work_journal.start_work(issue.key, this.default_duration);
            if (this.stop_work_timeout) {
                GLib.Source.remove(this.stop_work_timeout);
            }
            this.stop_work_timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this.default_duration, () => {
                this.stop_work();
                return GLib.SOURCE_REMOVE;
            })
            this.update_label();
        }

        // Add an issue to recent issues and update the UI
        add_recent_issue(issue) {
            this.recent_issues = this.recent_issues.filter((e) => e.key !== issue.key);
            if (this.recent_issues.unshift(issue) > 5) {
                this.recent_issues.length = 5;
            }
        }

        stop_work() {
            if (!this._work_journal.current_work()) {
                // nothing to do
                return;
            }
            log("stopping work")
            this._notification_state_machine.stop_work();

            if (this.stop_work_timeout) {
                GLib.Source.remove(this.stop_work_timeout);
                this.stop_work_timeout = null;
            }
            this._work_journal.stop_work();
            this.update_label();
        }

        update_label() {
            const current_work = this._work_journal.current_work();
            if (current_work) {
                const remaining_duration = current_work.start.getTime() + current_work.duration * 1000 - new Date().getTime();
                this.label.set_text(current_work.key + " (" + Math.round((remaining_duration / 60000)) + "m remaining)");
                this._notification_state_machine.start_work(current_work.key, Math.round((remaining_duration / 60000)) + " minutes remaining");
            } else {
                this.label.set_text("⚠️ Not working on an issue ⚠️");
            }
        }

        _refreshFilters() {
            for (const q in this.queries) {
                this.client.filter(this.queries[q].jql, (result) => this.issues[this.queries[q].name] = result.issues)
            }
        }

        destroy() {
            this._save_state();
            if (this.stop_work_timeout) {
                GLib.Source.remove(this.stop_work_timeout);
                this.stop_work_timeout = null;
            }

            if (this._timeout) {
                GLib.Source.remove(this._timeout);
                this._timeout = null;
            }

            if (this._filter_refresh_timeout) {
                GLib.Source.remove(this._filter_refresh_timeout);
                this._filter_timeout = null;
            }

            this._notification_state_machine.destroy();
            this._work_journal.destroy();
            this.dbus_service.destroy();
            this.settings.disconnect(this._settingsChangedId);
            this.settings = null;
            super.destroy();
        }

        _save_state() {
            this.settings.set_strv("recent-issues", this.recent_issues.map((ri) => JSON.stringify(ri)));
            this.settings.set_string("issue-cache", JSON.stringify(this.issues));
        }
    });

export default class TempomateExtension extends Extension {
    constructor(metadata) {
        super(metadata);
    }

    enable() {
        this._indicator = new Indicator(this.getSettings());
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
