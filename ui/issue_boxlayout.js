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

import { Tooltip } from "./tooltip.js";

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

export var IssueBoxLayout = GObject.registerClass(
    class IssueBoxLayout extends St.BoxLayout {
        _init(issue, ...actions) {
            super._init({
                vertical: false,
                x_expand: true,
                x_align: Clutter.ActorAlign.FILL
            });
            this.add_child(new St.Label({ text: issue.key, style_class: 'issue_label' }));
            this.add_child(new St.Label({ text: issue.fields.summary, x_expand: true }));
            actions.map(action => this._action_button(action)).forEach(actionButton => this.add_child(actionButton))
        }

        _action_button(action) {
            let button = new St.Button({
                child: new St.Icon({ icon_name: action.icon, style: "height:1.75ex" }),
                can_focus: true,
                style_class: 'button',
                style: 'padding: 0px; margin-left:4pt',
                reactive: true,
                y_align: Clutter.ActorAlign.CENTER
            });
            button.connect('clicked', action.callback);
            if (action.tooltip) {
                new Tooltip(button, action.tooltip)
            }
            action.config?.(button);
            return button;
        }

        replace_actions(...actions) {
            let children = this.get_children().slice(2).forEach(child => this.remove_child(child));
            actions.map(action => this._action_button(action)).forEach(actionButton => this.add_child(actionButton))
        }
    });
