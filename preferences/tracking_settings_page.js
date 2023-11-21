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

            const duration = new Gtk.SpinButton({
                valign: Gtk.Align.CENTER
            });
            duration.set_range(5, 480);
            duration.set_value(settings.get_int("default-duration"));
            duration.set_increments(5, 5);

            duration.connect('unmap', (widget) => settings.set_int("default-duration", widget.value));
            const duration_row = new Adw.ActionRow({
                title: "Worklog Duration (Minutes)"
            });
            duration_row.add_suffix(duration);
            group.add(duration_row);

            const auto_close_gap = new Gtk.SpinButton({
                valign: Gtk.Align.CENTER
            });
            auto_close_gap.set_range(0, 120);
            auto_close_gap.set_value(settings.get_int("close-gap-minutes"));
            auto_close_gap.set_increments(5, 5);

            auto_close_gap.connect('unmap', (widget) => settings.set_int("close-gap-minutes", widget.value));
            const auto_close_gap_row = new Adw.ActionRow({
                title: "Close gap if less or equal (Minutes)"
            });
            auto_close_gap_row.add_suffix(auto_close_gap);
            group.add(auto_close_gap_row);

            this.add(group);
        }

    });
