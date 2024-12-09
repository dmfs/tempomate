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
import { ActionButton } from './action_button.js';

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
            let box = new St.BoxLayout({ vertical: true, x_expand: true, x_align: Clutter.ActorAlign.FILL });
            box.add_child(new IssueBoxLayout(issue, ...actions))
            box.add_child(new St.Label({
                text: `From ${hhmmTimeString(worklog.start())} to ${hhmmTimeString(worklog.end())}, ends in ${between(new Date(), worklog.end()).toMinutes()} minutes.`
            }));
            this.add_child(box)
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
            actions.map(action => new ActionButton(action, () => entry.text))
                .forEach(actionButton => inner_layout.add_child(actionButton));
            this.error = new St.Bin();
            vertical_layout.add_child(inner_layout);
            vertical_layout.add_child(this.error);
            this.add_child(vertical_layout);
        }

        set_error(error) {
            this.error.set_child(new St.Label({ text: error, x_expand: true, style: "font-weight:bold; padding-top: 4pt" }));
        }
    });

export var IdleMenuItem = GObject.registerClass(
    class IdleMenuItem extends PopupMenu.PopupBaseMenuItem {
        _init(snoozed_until, ...actions) {
            super._init({
                reactive: false,
                can_focus: false,
            });

            let text;
            if (snoozed_until) {
                text = `Not working on an issue until ${hhmmTimeString(snoozed_until)} `
            }
            else {
                text = "Not working on an issue"
            }
            const box_layout = new St.BoxLayout({ vertical: false, x_expand: true });

            box_layout.add_child(new St.Label({ text: text, x_expand: true }));

            actions.map(action => new ActionButton(action))
                .forEach(actionButton => box_layout.add_child(actionButton));

            this.add_child(box_layout);
        }
    });

