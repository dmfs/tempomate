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

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import { ActionButton } from "./action_button.js";

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
            actions.map(action => new ActionButton(action)).forEach(actionButton => this.add_child(actionButton))
        }
    });
