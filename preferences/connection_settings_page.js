const {Adw, GObject} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;

var ConnectionSettingsPage = GObject.registerClass({
        GTypeName: 'ConnectionSettingsPage',
    },
    class ConnectionSettingsPage extends Adw.PreferencesPage {
        _init() {
            super._init({
                title: "Connection",
                icon_name: 'system-run-symbolic',
                name: 'JiraSettingsPage'
            });

            const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.tempomate.dmfs.org');

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
