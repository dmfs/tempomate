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

/* exported init */

const GETTEXT_DOMAIN = 'tempomate';

const {GObject, St} = imports.gi;

const Gio = imports.gi.Gio;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;
const Mainloop = imports.mainloop;
const Soup = imports.gi.Soup;
const {IssueMenuItem} = Me.imports.ui.menuitem;

const {TempomateService} = Me.imports.dbus.tempomate_service;
const {JiraApi2Client} = Me.imports.client.jira_client;

const _ = ExtensionUtils.gettext;

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('Tempomate'));

            this.label = new St.Label({
                style_class: 'panel-button',
                text: '⚠️ Not working on an issue ⚠️'
            });
            this.add_child(this.label);
            this.setMenu(new PopupMenu.PopupMenu(this, 0.0, St.Side.TOP, 0));
            this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.tempomate.dmfs.org');
            this._restore()
            this._settingsChangedId = this.settings.connect('changed', Lang.bind(this, this._settingsChanged));
            this._settingsChanged();
            this._refresh_label();
            this.updateUI(this.menu, true);
            this.menu.connect("open-state-changed", Lang.bind(this, this.updateUI))
            this.dbus_service = new TempomateService(Lang.bind(this, this.fetch_and_start_or_continue_work));
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
            this.client = new JiraApi2Client(this.host, this.token)
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
                recent_issues_menu.addMenuItem(this.generateMenuItem(this.recent_issues[issue]));
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

        generateMenuItem(issue) {
            const _this = this;
            const item = new IssueMenuItem(issue.key, issue.fields.summary);
            item.connect('activate', Lang.bind(this, () => this.start_or_continue_work(issue)));
            return item;
        }

        fetch_and_start_or_continue_work(issue) {
            this.client.issue(issue, Lang.bind(this, this.start_or_continue_work))
        }


        start_or_continue_work(issue) {
            if (!issue || !issue.key) {
                return
            }
            this.add_recent_issue(issue);
            this.end_time = new Date(new Date().getTime() + this.default_duration * 1000);

            if (this.current_issue !== issue.key) {
                this.stop_work();
                this.start_time = new Date();
                this.notify('Working on ' + issue.key, "");
                this.label.set_text("Working on " + issue.key);
            } else {
                this.update_label();
            }
            this._log_time(issue.key, this.start_time, this.end_time);
            if (this.stop_work_timeout) {
                Mainloop.source_remove(this.stop_work_timeout);
            }
            this.stop_work_timeout = Mainloop.timeout_add_seconds(this.default_duration, Lang.bind(this, this.stop_work));
        }

        // Add an issue to recent issues and update the UI
        add_recent_issue(issue) {
            this.recent_issues = this.recent_issues.filter((e) => e.key !== issue.key);
            if (this.recent_issues.unshift(issue) > 5) {
                this.recent_issues.length = 5;
            }
        }

        stop_work() {
            Main.notify('Work on ' + this.current_issue + " done");

            if (this.notification) {
                this.notification.destroy(3);
                this.notification = null;
            }
            if (this.stop_work_timeout) {
                Mainloop.source_remove(this.stop_work_timeout);
                this.stop_work_timeout = null;
            }

            if (this.current_issue) {
                this._log_time(this.current_issue, this.start_time, new Date());
                this.current_issue = null;
            }

            this.update_label();
        }

        update_label() {
            if (this.current_issue) {
                const remaining_duration = this.end_time.getTime() - new Date().getTime();
                this.label.set_text("Working on " + this.current_issue + " (" + Math.round((remaining_duration / 60000)) + "m remaining)");
                if (this.notification) {
                    this.notification.update("Working on " + this.current_issue, "" + Math.round((remaining_duration / 60000)) + " minutes remaining");
                }
            } else {
                this.label.set_text("⚠️ Not working on an issue ⚠️");
            }
        }

        _refresh_label() {
            this._removeTimeout();
            this._timeout = Mainloop.timeout_add_seconds(60, Lang.bind(this, this._refresh_label));
            this.update_label();
            return true;
        }

        _removeTimeout() {
            if (this._timeout) {
                Mainloop.source_remove(this._timeout);
                this._timeout = null;
            }
        }

        _refreshFilters() {
            for (const q in this.queries) {
                this._getRequest(this.queries[q].name, this.queries[q].jql);
            }
            this._removeFilterTimeout();
            this._filter_timeout = Mainloop.timeout_add_seconds(900, Lang.bind(this, this._refreshFilters));
            return true;
        }

        _removeFilterTimeout() {
            if (this._filter_timeout) {
                Mainloop.source_remove(this._filter_timeout);
                this._filter_timeout = null;
            }
        }


        destroy() {
            this._save_state();
            if (this.stop_work_timeout) {
                Mainloop.source_remove(this.stop_work_timeout);
            }
            this._removeTimeout();
            this.dbus_service.destroy();
            super.destroy();
        }

        notify(msg, details) {
            if (!this.notifications_source) {
                this.notification_source = new MessageTray.Source("Tempomate", 'system-run-symbolic');
                Main.messageTray.add(this.notification_source);
                this.notification_source.connect("destroy", Lang.bind(this, () => this.notification_source = null));
            }

            if (this.notification) {
                this.notification.destroy(3);
            }

            this.notification = new MessageTray.Notification(this.notification_source, msg, details);

            this.notification.setTransient(false);
            this.notification.setResident(true);

            this.notification_source.showNotification(this.notification);

            this.notification.connect("destroy", Lang.bind(this, () => {
                if (this.notification) {
                    this.notification = null;
                    this.stop_work();
                }
            }));
        }

        _getRequest(key, query) {
            this.client.filter(query, Lang.bind(this, (result) => this.issues[key] = result.issues))
        }

        /*
        See https://www.tempo.io/server-api-documentation/timesheets#tag/Worklogs/operation/createWorklog
        */
        _log_time(issue, start, end) {
            let method = "POST";
            let URL = this.host + '/rest/tempo-timesheets/4/worklogs';
            if (this.current_id && this.current_issue === issue) {
                URL = URL + "/" + this.current_id;
                method = "PUT";
            }

            // TODO convert to local time 
            var start_string = start.toJSON().replace('T', ' ').replace("Z", "");

            let payload = {
                "billableSeconds": Math.round((end.getTime() - start.getTime()) / 1000),
                "includeNonWorkingDays": false,
                "originTaskId": issue,
                "started": start_string,
                "timeSpentSeconds": Math.round((end.getTime() - start.getTime()) / 1000),
                "worker": this.username
            };

            let utf8Encode = new TextEncoder();


            let _httpSession = new Soup.Session();
            let message = Soup.Message.new(method, URL);
            message.request_headers.append("Authorization", "Bearer " + this.token);
            message.set_request_body_from_bytes("application/json", utf8Encode.encode(JSON.stringify(payload)));

            const _this = this;

            _httpSession.send_and_read_async(message, 0, null, (source, response_message) => {
                let body = ''

                try {
                    const bytes = _httpSession.send_and_read_finish(response_message);
                    const decoder = new TextDecoder();
                    body = decoder.decode(bytes.get_data());

                    const json = JSON.parse(body);
                    if (Array.isArray(json)) {
                        _this.current_id = json[0].tempoWorklogId;
                    }
                    _this.current_issue = issue;
                } catch (e) {
                    log(`Could not parse soup response body ${e}`)
                }
            });
        }

        _save_state() {
            this.settings.set_strv("recent-issues", this.recent_issues.map((ri) => JSON.stringify(ri)));
            this.settings.set_string("issue-cache", JSON.stringify(this.issues));
        }
    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
