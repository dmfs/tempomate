const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {ConnectionSettingsPage} = Me.imports.preferences.connection_settings_page;
const {FilterSettingsPage} = Me.imports.preferences.filter_settings_page;
const {TrackingSettingsPage} = Me.imports.preferences.tracking_settings_page;


/** */
function init() {
    ExtensionUtils.initTranslations("tempomate");
}

/**
 * Populates the preferences window
 */
function fillPreferencesWindow(window) {
    window.add(new ConnectionSettingsPage());
    window.add(new FilterSettingsPage());
    window.add(new TrackingSettingsPage());
}
