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

import {Tooltip} from "./tooltip.js";
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const {Clutter, St, GObject} = imports.gi;


export var IssueMenuItem = GObject.registerClass(
    class IssueMenuItem extends PopupMenu.PopupBaseMenuItem {
        _init(issue, summary, ...actions) {
            super._init({
                reactive: true,
                can_focus: true,
            });
            let box = new St.BoxLayout({vertical: false, x_expand: true, x_align: Clutter.ActorAlign.FILL});
            box.add_child(new St.Label({text: issue, style_class: 'issue_label'}));
            box.add_child(new St.Label({text: summary, x_expand: true}));
            actions.map(action => this._action_button(action)).forEach(actionButton => box.add_child(actionButton))

            this.add_child(box)
        }

        _action_button(action) {
            let button = new St.Button({
                child: new St.Icon({icon_name: action.icon, style: "height:1.75ex"}),
                can_focus: true,
                style_class: 'button',
                style: 'padding: 0px',
                reactive: true,
                y_align: Clutter.ActorAlign.CENTER
            });
            button.connect('clicked', action.callback);
            if (action.tooltip) {
                new Tooltip(button, action.tooltip)
            }
            return button;
        }
    });
