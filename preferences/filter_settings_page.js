import GObject from 'gi://GObject';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';


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
    });

export var FilterSettingsPage = GObject.registerClass({
        GTypeName: 'FilterSettingsPage',
    },
    class FilterSettingsPage extends Adw.PreferencesPage {
        _init(settings) {
            super._init({
                title: "JQL",
                icon_name: 'view-list-symbolic',
                name: 'FilterSettingsPage'
            });

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
                const b = new Gtk.Button({
                    valign: Gtk.Align.CENTER
                })
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

    });
