import {ConnectionSettingsPage} from './preferences/connection_settings_page.js';
import {FilterSettingsPage} from './preferences/filter_settings_page.js';
import {TrackingSettingsPage} from './preferences/tracking_settings_page.js';
import {NotificationsSettingsPage} from './preferences/notifications_settings_page.js';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class TempomatePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.add(new ConnectionSettingsPage(settings));
        window.add(new FilterSettingsPage(settings));
        window.add(new TrackingSettingsPage(settings));
        window.add(new NotificationsSettingsPage(settings));
    }
}
