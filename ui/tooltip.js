const {St, GObject} = imports.gi;
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export var Tooltip = GObject.registerClass(
    class Tooltip extends GObject.Object {
        _init(actor, tooltip) {
            super._init();
            this.tooltip_label = new St.Label({text: tooltip, style_class: 'tooltip'});

            actor.connect('enter-event', (actor, event) => {
                Main.layoutManager.uiGroup.add_child(this.tooltip_label);
                Main.layoutManager.uiGroup.set_child_above_sibling(this.tooltip_label, null);

                // TODO: be smarter about the location of the tool tip, or use a system tooltip if there is any
                let [x, y] = event.get_coords();
                this.tooltip_label.set_position(x, y);
            });

            actor.connect('leave-event', () => {
                Main.layoutManager.uiGroup.remove_child(this.tooltip_label);
            });

            actor.connect('destroy', () => {
                this.destroy();
            });
        }

        destroy() {
            Main.layoutManager.uiGroup.remove_child(this.tooltip_label);
            this.tooltip_label.destroy();
            this.tooltip_label = null;
        }
    });
