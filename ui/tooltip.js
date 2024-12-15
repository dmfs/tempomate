import St from 'gi://St';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Duration } from '../date/duration.js';
import { managedTimer } from '../utils/utils.js';

export var Tooltip = GObject.registerClass(
    class Tooltip extends St.Label {
        _init(actor, tooltip, timeout = 1000) {
            super._init({ text: tooltip, style_class: 'tooltip' });
            this.hide();
            Main.layoutManager.uiGroup.add_child(this);
            Main.layoutManager.uiGroup.set_child_above_sibling(this, null);
            this.tooltip_timeout = null;

            actor.connect('enter-event', (actor, event) => {
                this.tooltip_timeout = managedTimer(Duration.ofMillis(timeout),
                    () => {
                        // TODO: be smarter about the location of the tool tip, or use a system tooltip if there is any
                        let [x, y] = event.get_coords();
                        this.set_position(x, y);
                        this.show();
                    },
                    "tooltip " + tooltip);
            });

            actor.connect('leave-event', () => {
                this.tooltip_timeout?.();
                this.hide();
            });

            actor.connect('destroy', () => {
                this.destroy();
            });
        }

        destroy() {
            this.tooltip_timeout?.();
            Main.layoutManager.uiGroup.remove_child(this);
            super.destroy();
        }
    });
