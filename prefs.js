const {Adw, Gio, GLib, GObject, Gtk} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const _ = ExtensionUtils.gettext;

const ConnectionSettingsPage = GObject.registerClass({
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

    })


const JqlObject = GObject.registerClass({
        GTypeName: 'JqlObject',
        Properties: {
            'name': GObject.ParamSpec.string('name', 'name', 'name', GObject.ParamFlags.READWRITE, null),
            'jql': GObject.ParamSpec.string('jql', 'jql', 'jql', GObject.ParamFlags.READWRITE, null),
        }
    },
    class JqlObject extends GObject.Object {
        _init(jql_data) {
            super._init(jql_data);
        }
    })

const JqlSettingsPage = GObject.registerClass({
        GTypeName: 'JqlSettingsPage',
    },
    class JqlSettingsPage extends Adw.PreferencesPage {
        _init() {
            super._init({
                title: "JQL",
                icon_name: 'view-list-symbolic',
                name: 'JqlSettingsPage'
            });

            const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.tempomate.dmfs.org');

            const group = new Adw.PreferencesGroup({title: "Queries"});
            const label_factory = new Gtk.SignalListItemFactory()
            label_factory.connect("setup", (widget, item) => item.set_child(new Gtk.Entry()))
            label_factory.connect("bind", (widget, item) => {
                const label = item.get_child()
                const jql = item.get_item()
                label.set_text(jql.name)
                label.bind_property("text", jql, "name", GObject.BindingFlags.BIDIRECTIONAL)
            })


            const jql_factory = new Gtk.SignalListItemFactory()
            jql_factory.connect("setup", (widget, item) => item.set_child(new Gtk.Entry()))
            jql_factory.connect("bind", (widget, item) => {
                const label = item.get_child()
                const jql = item.get_item()
                label.set_text(jql.jql)
                label.bind_property("text", jql, "jql", GObject.BindingFlags.BIDIRECTIONAL)
            })

            const store = new Gio.ListStore()

            const delete_button_factory = new Gtk.SignalListItemFactory()
            delete_button_factory.connect("setup", (widget, item) => {
                const b = new Gtk.Button()
                b.set_child(new Adw.ButtonContent({
                    label: "",
                    "icon-name": "list-remove"
                }))
                return item.set_child(b);
            })
            delete_button_factory.connect("bind", (widget, item) =>
                item.get_child().connect("clicked", (w) => {
                    const [found, pos] = store.find(item.get_item())
                    return store.remove(pos);
                }))


            const selection = new Gtk.SingleSelection()

            selection.set_model(store)

            const list_view = new Gtk.ColumnView()
            list_view.set_model(selection)


            list_view.append_column(Gtk.ColumnViewColumn.new("Label", label_factory))
            list_view.append_column(Gtk.ColumnViewColumn.new("JQL", jql_factory))
            list_view.append_column(Gtk.ColumnViewColumn.new("", delete_button_factory))

            let jqls = settings.get_strv('jqls').map((s) => JSON.parse(s)).forEach((jql) => store.append(new JqlObject(jql)));
            const list_row = new Adw.PreferencesRow()
            list_row.set_child(list_view)
            group.add(list_row)

            group.connect("unmap", (widget) => {
                let result = []
                for (let i = 0; i < store.n_items; ++i) {
                    result.push(JSON.stringify({name: store.get_item(i).name, jql: store.get_item(i).jql}))
                }
                settings.set_strv('jqls', result)
            })

            const add_button = new Gtk.Button()
            add_button.set_child(
                new Adw.ButtonContent({
                    label: "",
                    "icon-name": "list-add"
                }))
            add_button.connect("clicked", (w) => store.append(new JqlObject({name: "", jql: ""})))

            const button_row = new Adw.PreferencesRow()
            button_row.set_child(add_button)
            group.add(button_row)

            this.add(group);
        }

    })

const Preferences = class {

    constructor(window) {
        window.add(new ConnectionSettingsPage());
        window.add(new JqlSettingsPage());
    }
}

/** */
function init() {
    ExtensionUtils.initTranslations("tempomate");
}

/**
 * @returns {Gtk.Widget} - the prefs widget
 */
function fillPreferencesWindow(window) {
    let preferences = new Preferences(window);
}
