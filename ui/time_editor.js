import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { addDuration, hhmmTimeString, startOfDay } from '../date/date.js';
import { Duration } from '../date/duration.js';
import { debug } from '../utils/log.js';

const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export var TimeEditor = GObject.registerClass({
    Signals: {
        valid: {
            param_types: [GObject.TYPE_BOOLEAN],
        }
    }
},
    class TimeEditor extends St.Entry {
        _init(initialDate) {
            super._init({ text: hhmmTimeString(initialDate), style: "padding: 4pt" });
            this._is_valid = true;
            this.connect('notify::text', () => this.validate());

            const [width] = new Clutter.Text({ text: "00:00" }).get_preferred_width(-1);

            // Fix the entry's width
            this.set_width(width + 16 /* fixed margin for now, needs to be scaled properly later on */);
        }

        validate() {
            const text = this.get_text();
            const valid = timeRegex.test(text);
            if (valid != this._is_valid) {
                this._is_valid = valid;
                this.emit('valid', valid);
            }

            if (!this._is_valid) {
                //      entry.set_style_class_name('invalid-time'); // Add a style class for visual feedback
            } else {
                //      entry.set_style_class_name('');
            }
        }

        get valid() {
            return this._is_valid;
        }

        update(date) {
            const text = this.get_text();
            if (!timeRegex.test(text)) {
                return date;
            }
            const [hours, minutes] = text.split(":").map(Number);
            return addDuration(startOfDay(date), Duration.ofSeconds(hours * 3600 + minutes * 60));
        }

    });
