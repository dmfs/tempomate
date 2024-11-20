import GObject from 'gi://GObject';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { Deployment } from './deployment.js';


const deployments = [
    new Deployment("jira-server",
        "Jira Server / Data Center",
        settings => {
            const server_group = new Adw.PreferencesGroup({ title: "Jira Server / Data Center" });

            const host = new Adw.EntryRow({
                title: "Jira URL base",
                text: settings.get_string("host")
            });
            host.connect('unmap', (widget) => settings.set_string("host", widget.text))
            server_group.add(host);

            const username = new Adw.EntryRow({
                title: "Username",
                text: settings.get_string("username")
            });
            username.connect('unmap', (widget) => settings.set_string("username", widget.text));
            server_group.add(username);

            const token = new Adw.PasswordEntryRow({
                title: "API Token",
                text: settings.get_string("token")
            });
            token.connect('unmap', (widget) => settings.set_string("token", widget.text))
            server_group.add(token);

            return server_group;
        }
    ),

    new Deployment("jira-cloud",
        "Jira Cloud",
        settings => {
            const group = new Adw.PreferencesGroup({ title: "Jira Cloud" });

            const host = new Adw.EntryRow({
                title: "Jira URL base",
                text: settings.get_string("jira-cloud-host")
            });
            host.connect('unmap', (widget) => settings.set_string("jira-cloud-host", widget.text))
            group.add(host);

            const username = new Adw.EntryRow({
                title: "Email address",
                text: settings.get_string("jira-cloud-username")
            });
            username.connect('unmap', (widget) => settings.set_string("jira-cloud-username", widget.text));
            group.add(username);

            const jira_token = new Adw.PasswordEntryRow({
                title: "Jira API Token",
                text: settings.get_string("jira-cloud-token")
            });
            jira_token.connect('unmap', (widget) => settings.set_string("jira-cloud-token", widget.text))
            group.add(jira_token);

            const tempo_token = new Adw.PasswordEntryRow({
                title: "Tempo API Token",
                text: settings.get_string("tempo-cloud-token")
            });
            tempo_token.connect('unmap', (widget) => settings.set_string("tempo-cloud-token", widget.text))
            group.add(tempo_token);

            return group;
        }
    )
]

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

            const group = new Adw.PreferencesGroup({ title: "Connection" });

            const deploymentSelector = new Adw.ComboRow({
                title: "Jira Deployment",
                model: new Gtk.StringList({ strings: deployments.map(deployment => deployment.name) }),
            });
            group.add(deploymentSelector);

            const viewStack = new Adw.ViewStack();
            deployments.forEach(
                deployment => viewStack.add_titled(
                    deployment.preferences_function(settings),
                    deployment.id,
                    deployment.name));

            group.add(viewStack);

            deploymentSelector.connect('notify::selected-item', () => viewStack.set_visible_child_name(deployments.at(deploymentSelector.selected)?.id));
            deploymentSelector.connect('unmap', (widget) => settings.set_string("deployment-type", deployments.at(widget.selected)?.id));

            deploymentSelector.set_selected(deployments.findIndex(deployment => deployment.id == settings.get_string("deployment-type")));

            this.add(group);
        }
    });
