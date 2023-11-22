import Gio from 'gi://Gio';

const dbus_interface = '<node>' +
    '<interface name="org.dmfs.gnome.shell.tempomate">\n' +
    '\t<method name="log_work">\n' +
    '\t\t<arg name="issue" type="s" direction="in"/>\n' +
    '\t</method>\n' +
    '</interface>' +
    '</node>'

class TempomateService {
    constructor(callback) {
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(dbus_interface, this);
        this._dbusImpl.export(Gio.DBus.session, '/org/dmfs/gnome/shell/tempomate');
        this._callback = callback;
    }

    log_work(issue) {
        this._callback(issue);
    }

    destroy() {
        this._dbusImpl?.unexport();
        this._dbusImpl = null;
        this._callback = null;
    }
}

export {TempomateService}
