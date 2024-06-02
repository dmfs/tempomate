# Tempomate

A Gnome Shell extension for mindless time tracking in Tempo Timesheets

TODO: readme content

## DBus interface

You can start or extend a work-log by calling an interface via DBus like:

```bash
gdbus call --session --dest org.gnome.Shell --object-path /org/dmfs/gnome/shell/tempomate --method org.dmfs.gnome.shell.tempomate.log_work ISSUE
```

With `ISSUE` being the issue ID of the ticket you're working on.

### Example

You can use this interface to create a work-log whenever you check out a branch that contains a Jira issue ID by
creating a post-checkout hook with the following content

```bash
#!/bin/bash

BRANCH_CHECKOUT=$3

if [ "${BRANCH_CHECKOUT}" = "1" ] ; then
        BRANCH=$(git rev-parse --abbrev-ref HEAD)
        ISSUE=$(echo "${BRANCH}" | grep -P -o '\b[A-Z]+-\d+\b') && \
                gdbus call --session --dest org.gnome.Shell --object-path /org/dmfs/gnome/shell/tempomate \
                --method org.dmfs.gnome.shell.tempomate.log_work "${ISSUE}" > /dev/null || true
fi
```

# License

Copyright (C) 2024 dmfs GmbH

This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public
License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied
warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program; if not, write to the Free
Software Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.


