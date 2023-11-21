const {Adw, GObject, Gtk, Gio} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;

var NotificationsSettingsPage = GObject.registerClass({
        GTypeName: 'NotificationsSettingsPage',
    },
    class NotificationsSettingsPage extends Adw.PreferencesPage {
        _init() {
            super._init({
                title: "Notifications",
                icon_name: 'system-run-symbolic',
                name: 'NotificationsSettingsPage'
            });

            const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.tempomate.dmfs.org');

            const group = new Adw.PreferencesGroup({title: "Nag Notifications"});

            const nag_switch = new Gtk.Switch({
                valign: Gtk.Align.CENTER
            })
            const nag_notifications = new Adw.ActionRow({
                title: "Show nag notification"
            })
            nag_notifications.add_suffix(nag_switch)
            group.add(nag_notifications)
            settings.bind('nag-notifications', nag_switch, 'active', Gio.SettingsBindFlags.DEFAULT);

            const nag_interval = new Gtk.SpinButton({
                valign: Gtk.Align.CENTER
            });
            nag_interval.set_range(30, 600);
            nag_interval.set_value(settings.get_int("nag-notification-interval"));
            nag_interval.set_increments(10, 30);

            // don't use bind because that updates each time the values changes
            nag_interval.connect('unmap', (widget) => settings.set_int("nag-notification-interval", widget.value));
            const nag_interval_row = new Adw.ActionRow({
                title: "Nag interval (Seconds)"
            });
            nag_interval_row.add_suffix(nag_interval);


            group.add(nag_interval_row);

            this.add(group);
        }

    });
