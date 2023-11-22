import GObject from 'gi://GObject';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

export var TrackingSettingsPage = GObject.registerClass({
        GTypeName: 'TrackingSettingsPage',
    },
    class TrackingSettingsPage extends Adw.PreferencesPage {
        _init(settings) {
            super._init({
                title: "Time Tracking",
                icon_name: 'system-run-symbolic',
                name: 'JiraSettingsPage'
            });

            const group = new Adw.PreferencesGroup({title: "Defaults"});

            const duration_row = new Adw.SpinRow({
                title: "Worklog Duration",
                subtitle: "New or updated work-logs end after this duration (in minutes)",
                numeric: true,
                adjustment: new Gtk.Adjustment({
                    lower: 5,
                    upper: 480,
                    "page-increment": 10,
                    "step-increment": 5,
                    value: settings.get_int("default-duration")
                })
            });
            duration_row.connect('unmap', (widget) => settings.set_int("default-duration", widget.value));
            group.add(duration_row);


            const auto_close_gap_row = new Adw.SpinRow({
                title: "Maximum Gap to Close",
                subtitle: "Gaps between work-logs are automatically closes if less or equal (in minutes)",
                numeric: true,
                adjustment: new Gtk.Adjustment({
                    lower: 0,
                    upper: 120,
                    "page-increment": 5,
                    "step-increment": 1,
                    value: settings.get_int("gap-auto-close-minutes")
                })
            });
            auto_close_gap_row.connect('unmap', (widget) => settings.set_int("gap-auto-close-minutes", widget.value));
            group.add(auto_close_gap_row);

            this.add(group);
        }

    });
