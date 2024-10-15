const {St, GObject, GLib} = imports.gi;
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export var Tooltip = GObject.registerClass(
    class Tooltip extends GObject.Object {
        _init(actor, tooltip, timeout = 1000) {
            super._init();
            this.tooltip_label = new St.Label({text: tooltip, style_class: 'tooltip'});
            this.tooltip_label.hide();
            Main.layoutManager.uiGroup.add_child(this.tooltip_label);
            Main.layoutManager.uiGroup.set_child_above_sibling(this.tooltip_label, null);

            this.tooltip_timeout = null;
            actor.connect('enter-event', (actor, event) => {
                this.tooltip_timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeout,
                    () => {
                        // TODO: be smarter about the location of the tool tip, or use a system tooltip if there is any
                        let [x, y] = event.get_coords();
                        this.tooltip_label.set_position(x, y);
                        this.tooltip_label.show();
                        return GLib.SOURCE_REMOVE;
                    });
            });

            actor.connect('leave-event', () => {
                this._remove_timeout();
                this.tooltip_label.hide();
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
            Main.layoutManager.uiGroup.remove_child(this.tooltip_label);
            this.tooltip_label.destroy();
            this.tooltip_label = null;
        }
    });
