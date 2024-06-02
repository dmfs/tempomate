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

import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';


export var IssueMenuItem = GObject.registerClass(
    class IssueMenuItem extends PopupMenu.PopupBaseMenuItem {
        _init(issue, summary) {
            super._init({
                reactive: true,
                can_focus: true,
            });

            this.issue_label = new St.Label({
                text: issue,
                style_class: 'issue_label'
            });
            this.add_child(this.issue_label);
            this.label_actor = this.issue_label;

            this.summary_label = new St.Label({text: summary});
            this.add_child(this.summary_label);
        }
    });

