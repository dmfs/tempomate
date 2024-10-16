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
import {IssueBoxLayout} from "./issue_boxlayout.js";
import {hhmmTimeString} from "../date/date.js";
import {between} from "../date/duration.js";

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

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
            let box = new St.BoxLayout({vertical: true, x_expand: true, x_align: Clutter.ActorAlign.FILL});
            box.add_child(new IssueBoxLayout(issue, ...actions))
            box.add_child(new St.Label({
                text: `From ${hhmmTimeString(worklog.start())} to ${hhmmTimeString(worklog.end())}, ends in ${between(new Date(), worklog.end()).toMinutes()} minutes.`
            }));
            this.add_child(box)
        }

    });
