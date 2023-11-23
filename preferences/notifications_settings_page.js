import GObject from 'gi://GObject';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

export var NotificationsSettingsPage = GObject.registerClass({
        GTypeName: 'NotificationsSettingsPage',
    },
    class NotificationsSettingsPage extends Adw.PreferencesPage {
        _init(settings) {
            super._init({
                title: "Notifications",
                icon_name: 'system-run-symbolic',
                name: 'NotificationsSettingsPage'
            });


            const group = new Adw.PreferencesGroup({title: "Nag Notifications"});

            const nag_notifications = new Adw.SwitchRow({
                title: "Show nag notification"
            })
            group.add(nag_notifications)
            settings.bind('nag-notifications', nag_notifications, 'active', Gio.SettingsBindFlags.DEFAULT);

            const nag_interval_row = new Adw.SpinRow({
                title: "Nag interval",
                subtitle: "Time between notifications when idle (in seconds)",
                numeric: true,
                adjustment: new Gtk.Adjustment({
                    lower: 30,
                    upper: 600,
                    "page-increment": 30,
                    "step-increment": 10,
                    value: settings.get_int("nag-notification-interval")
                })
            });
            // don't use bind because that updates each time the values changes
            nag_interval_row.connect('unmap', (widget) => settings.set_int("nag-notification-interval", widget.value));
            group.add(nag_interval_row);

            nag_notifications.bind_property('active', nag_interval_row, "sensitive", 0)


            this.add(group);
        }

    });
