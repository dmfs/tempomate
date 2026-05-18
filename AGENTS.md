# Tempomate - GNOME Shell Extension

Jira Tempo time tracking from the GNOME Shell panel. UUID: `tempomate@dmfs.org`, GNOME Shell 46-49.

## Architecture

```
extension.js          Main entry point. TempomateExtension (Extension) → Indicator (PanelMenu.Button)
prefs.js              Preferences window, loads 4 settings pages

client/
  jira_client.js      Factory: jira_client_from_config(settings) → JiraServerClient | JiraCloudClient
  rest_client.js      RestClient wrapping Soup.Session (get/post/put, rejects on non-2xx)
  tempo_server_client.js  Tempo Server API v4 (/rest/tempo-timesheets/4/worklogs)
  tempo_cloud_client.js   Tempo Cloud API v4 (/4/worklogs)
  work_journal.js     WorkJournal: tracks current/previous work sessions, gap-bridging logic, persists to GSettings
  worklog.js          WorkLog value object (start, duration, issueId, worklogId), JSON serialization

date/
  date.js             Date helpers: addDuration, secondsFromNow, hhmmTimeString, startOfDay, dayAfter/Before
  duration.js         Duration class (immutable, millis-based), between(from, to)

dbus/
  tempomate_service.js  D-Bus service (org.dmfs.gnome.shell.tempomate), exposes log_work(issueKey)

ui/
  notification_state_machine.js  Manages all notifications: working, stopped, idle nag (with snooze), errors
  menuitem.js         IssueMenuItem, CurrentIssueMenuItem, EditableMenuItem, IdleMenuItem
  issue_boxlayout.js  Horizontal layout: issue key (bold) + summary + actions
  action_button.js    Icon/text button with tooltip and callback
  tooltip.js          Hover tooltip (dark background, delayed show)

utils/
  log.js              debug() → console.debug with "tempomate:" prefix
  utils.js            Timer management: managedTimer, interval, timeout, retrying, destroy (global cleanup)

preferences/
  connection_settings_page.js   Jira Server / Cloud connection config (URL, username, tokens)
  filter_settings_page.js       JQL filter CRUD (ColumnView with editable rows)
  tracking_settings_page.js     Default duration, auto-stop, gap-close minutes
  notifications_settings_page.js  Nag notifications toggle, interval, working hours/days
  deployment.js       Deployment(id, name, preferences_function) data holder

schemas/
  org.gnome.shell.extensions.tempomate.dmfs.org.gschema.xml  All GSettings keys
```

## Key Data Flow

1. **Start work**: User clicks issue → `Indicator.start_or_continue_work(issue)` → `WorkJournal.start_work()` → Tempo API `save_worklog()` → `NotificationStateMachine.start_work()` (shows persistent notification)
2. **Stop work**: `Indicator.stop_work()` → `WorkJournal.stop_work()` → `NotificationStateMachine.stop_work()` → starts idle nag interval
3. **Idle nag**: `NotificationStateMachine._start_idle()` → `interval()` → `_show_idle_notification()` (checks `_is_within_working_hours()` first)
4. **Settings change**: GSettings 'changed' signal → `Indicator._settingsChanged()` → rebuilds client, work journal, passes settings to notification state machine

## Extension Lifecycle

- `enable()`: Creates Indicator, adds to panel. Indicator._init() restores state, connects settings, starts label update (60s) and issue refresh (900s) intervals.
- `disable()`: Saves state, cancels all timers, destroys notification source, D-Bus service, work journal. Calls `destroy_timers()` from utils.

## Settings Schema Pattern

- Schema ID: `org.gnome.shell.extensions.tempomate.dmfs.org`
- Read in `_settingsChanged()` via `settings.get_boolean/get_int/get_strv`
- Preferences UI uses `Adw` widgets: `SwitchRow` (bound via `settings.bind()`), `SpinRow` (saved on `unmap` signal), `ExpanderRow` with child switches
- Sensitivity binding: `nag_notifications.bind_property('active', dependent_row, 'sensitive', 0)`

## GI Dependencies

`GObject`, `St`, `Clutter`, `Adw`, `Gtk`, `Gio`, `GLib`, `Soup` — all via `gi://`

## Conventions

- ES modules with named exports (no default exports except TempomateExtension)
- Timer functions return cancellation functions (call to cancel)
- WorkLog is immutable — `withDuration()` returns new instance
- JSON serialization for persistence in GSettings string/strv keys
- GObject.registerClass for all UI components
- Error notifications via `NotificationStateMachine.show_error(title, body)`
- Credentials: Bearer auth (Server), Basic auth (Cloud)

## Build

`make dist` → ZIP archive excluding .git, screenshots, dev files. Schema must be recompiled after changes: `glib-compile-schemas schemas/`
