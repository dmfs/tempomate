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

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { IssueBoxLayout } from "./issue_boxlayout.js";
import { hhmmTimeString } from "../date/date.js";
import { between } from "../date/duration.js";

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import { Tooltip } from "./tooltip.js";
import { TimeEditor } from './time_editor.js';
import { debug } from '../utils/log.js';

export var IssueMenuItem = GObject.registerClass(
    class IssueMenuItem extends PopupMenu.PopupBaseMenuItem {
        _init(issue, ...actions) {
            super._init({
                reactive: true,
                can_focus: true,
            });
            this.add_child(new IssueBoxLayout(issue, ...actions))
        }
    });


export var CurrentIssueMenuItem = GObject.registerClass(
    class CurrentIssueMenuItem extends PopupMenu.PopupBaseMenuItem {
        _init(issue, worklog, ...actions) {
            super._init({
                reactive: true,
                can_focus: true,
            });
            this._actions = actions;
            this.worklog = worklog;
            this.box = new St.BoxLayout({ vertical: true, x_expand: true, x_align: Clutter.ActorAlign.FILL });
            this.issueBoxLayout = new IssueBoxLayout(issue, ...actions);
            this.box.add_child(this.issueBoxLayout);

            this.label = new St.Label({
                text: `From ${hhmmTimeString(worklog.start())} to ${hhmmTimeString(worklog.end())}, ends in ${between(new Date(), worklog.end()).toMinutes()} minutes.`
            })
            this.box.add_child(this.label);
            this.add_child(this.box)
        }

        edit(callback) {
            const startEntry = new TimeEditor(this.worklog.start());
            const endEntry = new TimeEditor(this.worklog.end());
            this.reactive = false;

            this.issueBoxLayout.replace_actions({
                icon: "emblem-ok-symbolic",
                tooltip: "Apply changes",
                config: button => {
                    startEntry.connect('valid', (element, valid) => button.reactive = valid && endEntry.valid);
                    endEntry.connect('valid', (element, valid) => button.reactive = valid && startEntry.valid
                    );
                },
                callback: () => {
                    callback(startEntry.update(this.worklog.start()), endEntry.update(this.worklog.end()));
                }
            }, {
                icon: "process-stop-symbolic",
                tooltip: "Cancel",
                callback: () => {
                    this.box.remove_child(this.editor_box);
                    this.editor_box = null;
                    this.box.add_child(this.label);
                    this.reactive = true;
                    this.issueBoxLayout.replace_actions(...this._actions)
                }
            })

            this.box.remove_child(this.label);
            this.editor_box = new St.BoxLayout({
                vertical: false, x_expand: true, x_align: Clutter.ActorAlign.FILL
            });
            this.editor_box.add_child(new St.Label({ text: "start: ", y_align: Clutter.ActorAlign.CENTER }))
            this.editor_box.add_child(startEntry);
            this.editor_box.add_child(new St.Label({ text: " end: ", y_align: Clutter.ActorAlign.CENTER }))
            this.editor_box.add_child(endEntry);

            this.box.add_child(this.editor_box);
        }
    });

export var EditableMenuItem = GObject.registerClass(
    class EditableMenuItem extends PopupMenu.PopupBaseMenuItem {
        _init(...actions) {
            super._init({
                reactive: false,
                can_focus: true,
            });

            const vertical_layout = new St.BoxLayout({ vertical: true, x_expand: true });
            const inner_layout = new St.BoxLayout({ vertical: false, x_expand: true });
            const entry = new St.Entry({ hint_text: "Issue ID", x_expand: true });
            inner_layout.add_child(entry)
            actions.map(action => this._action_button(action, () => entry.text))
                .forEach(actionButton => inner_layout.add_child(actionButton));
            this.error = new St.Bin();
            vertical_layout.add_child(inner_layout);
            vertical_layout.add_child(this.error);
            this.add_child(vertical_layout);
        }

        _action_button(action, value_supplier) {
            let button = new St.Button({
                child: new St.Icon({ icon_name: action.icon, style: "height:1.75ex" }),
                can_focus: true,
                style_class: 'button',
                style: 'padding: 0px; margin-left:4pt',
                reactive: true,
                y_align: Clutter.ActorAlign.CENTER
            });
            button.connect('clicked', () => action.callback(value_supplier()));
            if (action.tooltip) {
                new Tooltip(button, action.tooltip)
            }
            return button;
        }

        set_error(error) {
            this.error.set_child(new St.Label({ text: error, x_expand: true, style: "font-weight:bold; padding-top: 4pt" }));
        }
    });
