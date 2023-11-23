import GObject from 'gi://GObject';
import Adw from 'gi://Adw';

export var ConnectionSettingsPage = GObject.registerClass({
        GTypeName: 'ConnectionSettingsPage',
    },
    class ConnectionSettingsPage extends Adw.PreferencesPage {
        _init(settings) {
            super._init({
                title: "Connection",
                icon_name: 'system-run-symbolic',
                name: 'JiraSettingsPage'
            });

            const group = new Adw.PreferencesGroup({title: "Jira Connection"});

            const host = new Adw.EntryRow({
                title: "Jira URL base",
                text: settings.get_string("host")
            });
            host.connect('unmap', (widget) => settings.set_string("host", widget.text))
            group.add(host);

            const username = new Adw.EntryRow({
                title: "Username",
                text: settings.get_string("username")
            });
            username.connect('unmap', (widget) => settings.set_string("username", widget.text));
            group.add(username);

            const token = new Adw.PasswordEntryRow({
                title: "API Token",
                text: settings.get_string("token")
            });
            token.connect('unmap', (widget) => settings.set_string("token", widget.text))
            group.add(token);

            this.add(group);
        }

    });
