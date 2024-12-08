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
import { Tooltip } from "./tooltip.js";

export var ActionButton = GObject.registerClass(
    class ActionButton extends St.Button {
        _init(action, callback_param_supplier) {
            super._init({
                child: action.icon
                    ? new St.Icon({ icon_name: action.icon, style: "height:1.75ex" })
                    : new St.Label({ text: action.text, style: "margin:0,1ex" }),
                reactive: true,
                can_focus: true,
                style_class: 'button',
                style: 'padding: 0px; margin-left:4pt',
                y_align: Clutter.ActorAlign.CENTER
            });

            this.connect('clicked', () => action.callback(callback_param_supplier?.()));
            if (action.tooltip) {
                new Tooltip(this, action.tooltip)
            }
        }
    });
