import St from 'gi://St';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export var Tooltip = GObject.registerClass(
    class Tooltip extends St.Label {
        _init(actor, tooltip, timeout = 1000) {
            super._init({text: tooltip, style_class: 'tooltip'});
            this.hide();
            Main.layoutManager.uiGroup.add_child(this);
            Main.layoutManager.uiGroup.set_child_above_sibling(this, null);
            this.tooltip_timeout = null;

            actor.connect('enter-event', (actor, event) => {
                this.tooltip_timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeout,
                    () => {
                        // TODO: be smarter about the location of the tool tip, or use a system tooltip if there is any
                        let [x, y] = event.get_coords();
                        this.set_position(x, y);
                        this.show();
                        this.tooltip_timeout = undefined;
                        return GLib.SOURCE_REMOVE;
                    });
            });

            actor.connect('leave-event', () => {
                this._remove_timeout();
                this.hide();
            });

            actor.connect('destroy', () => {
                this.destroy();
            });
        }

        _remove_timeout() {
            if (this.tooltip_timeout) {
                GLib.Source.remove(this.tooltip_timeout);
                this.tooltip_timeout = null;
            }
        }

        destroy() {
            this._remove_timeout();
            Main.layoutManager.uiGroup.remove_child(this);
            super.destroy();
        }
    });
