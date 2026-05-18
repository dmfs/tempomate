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

            const nag_sound_row = new Adw.SwitchRow({
                title: "Play knock sound",
                subtitle: "Play an audible knock when showing nag notifications"
            });
            group.add(nag_sound_row);
            settings.bind('nag-notification-sound', nag_sound_row, 'active', Gio.SettingsBindFlags.DEFAULT);

            nag_notifications.bind_property('active', nag_interval_row, "sensitive", 0)
            nag_notifications.bind_property('active', nag_sound_row, "sensitive", 0)

            const working_hours_group = new Adw.PreferencesGroup({title: "Working Hours"});

            const work_hours_start_row = new Adw.SpinRow({
                title: "Start hour",
                subtitle: "Hour when nag notifications begin (0-23)",
                numeric: true,
                adjustment: new Gtk.Adjustment({
                    lower: 0,
                    upper: 23,
                    "page-increment": 1,
                    "step-increment": 1,
                    value: settings.get_int("work-hours-start")
                })
            });
            work_hours_start_row.connect('unmap', (widget) => settings.set_int("work-hours-start", widget.value));
            working_hours_group.add(work_hours_start_row);
            nag_notifications.bind_property('active', work_hours_start_row, "sensitive", 0);

            const work_hours_end_row = new Adw.SpinRow({
                title: "End hour",
                subtitle: "Hour when nag notifications stop (0-23)",
                numeric: true,
                adjustment: new Gtk.Adjustment({
                    lower: 0,
                    upper: 23,
                    "page-increment": 1,
                    "step-increment": 1,
                    value: settings.get_int("work-hours-end")
                })
            });
            work_hours_end_row.connect('unmap', (widget) => settings.set_int("work-hours-end", widget.value));
            working_hours_group.add(work_hours_end_row);
            nag_notifications.bind_property('active', work_hours_end_row, "sensitive", 0);

            const work_days_row = new Adw.ExpanderRow({
                title: "Working days",
                subtitle: "Days when nag notifications are active"
            });
            working_hours_group.add(work_days_row);
            nag_notifications.bind_property('active', work_days_row, "sensitive", 0);

            const day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const current_days = settings.get_strv("work-days");
            const day_switches = [];
            for (let i = 0; i < 7; i++) {
                const day_switch = new Adw.SwitchRow({
                    title: day_names[i]
                });
                day_switch.set_active(current_days.includes(String(i)));
                work_days_row.add_row(day_switch);
                day_switches.push({index: i, widget: day_switch});
            }

            work_days_row.connect('unmap', () => {
                const active_days = day_switches
                    .filter(d => d.widget.get_active())
                    .map(d => String(d.index));
                settings.set_strv("work-days", active_days);
            });

            this.add(group);
            this.add(working_hours_group);
        }

    });
