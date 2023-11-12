const {Adw, GObject, Gtk} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;

var TrackingSettingsPage = GObject.registerClass({
        GTypeName: 'TrackingSettingsPage',
    },
    class TrackingSettingsPage extends Adw.PreferencesPage {
        _init() {
            super._init({
                title: "Time Tracking",
                icon_name: 'system-run-symbolic',
                name: 'JiraSettingsPage'
            });

            const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.tempomate.dmfs.org');

            const group = new Adw.PreferencesGroup({title: "Defaults"});

            const duration = new Gtk.SpinButton();
            duration.set_range(5, 480);
            duration.set_value(settings.get_int("default-duration"));
            duration.set_increments(5, 5);

            duration.connect('unmap', (widget) => settings.set_int("default-duration", widget.value));
            const duration_row = new Adw.ActionRow({
                title: "Duration"
            });
            duration_row.add_suffix(duration);
            group.add(duration_row);

            this.add(group);
        }

    });
