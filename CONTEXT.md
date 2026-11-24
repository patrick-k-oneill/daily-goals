# Daily Goals

A digital legal pad: each morning's page of goals and the gratitude entry written about the day before.

## Language

### The page

**Page**:
Everything written for one day — its three goal sections and the gratitude entry. Today's page is the one being written; a past page reads exactly as it was left.
_Avoid_: screen, view

**Section**:
One cadence's block of goal lines on a page: Daily Goals, Weekly Goals, or Annual Goals. Its lines read in their stored order (`sortOrder`); a new line is written at the bottom. A section keeps one layout rhythm.
_Avoid_: list, category, block

**Period**:
The span a section covers — a day, an ISO week (Monday–Sunday), or a calendar year — identified by a period key (`2026-08-21`, `2026-W34`, `2026`).
_Avoid_: date range, bucket

**Cadence**:
How often a goal recurs: daily, weekly, or annual. A goal's cadence decides which section it is written in.
_Avoid_: frequency, type

### Goals

**Template**:
A recurring goal. It is not itself on any page; it materializes into an entry on each new period's section. A daily template may name the weekdays it repeats on (Monday first); it is written only on those days, and one that names none is written every day. Weekly and annual templates have no weekday schedule. A retired template writes no more lines: removing one of its lines retires it, and so does stopping it. Retirement is permanent (ADR 0008).
_Avoid_: habit, default, recurring goal (as a noun)

**Entry**:
A goal line on a specific period's section, either materialized from a template or written one-off. Its place is its stored `sortOrder`; nothing ranks a line ahead of it.
_Avoid_: goal instance, task, item, starred or key goal (the margin star is retired)

**Stop repeating**:
Retiring a template from one of its lines without crossing that line off, by turning Repeats off in the line's edit form. The line stays where it was written, with its checks and its `templateId`; lines already written on other periods stay too, and no later period gets one. A stopped template never starts again; turning Repeats back on starts a new one.
_Avoid_: pause, disable, archive

**Start repeating**:
Making a template from an entry that has none, or whose template was stopped, by turning Repeats on in the line's edit form. The template takes the entry's title, check count, labels and place, and the entry becomes its line on that period. Every device gives the template the same id (the entry and how many templates were started from it), so starting it on two devices makes one template (ADR 0008).
_Avoid_: resume, revive, restart

**Suggestion**:
A goal the pad offers to write on the current period's section: a faded row at the foot of the section with Add and Decline. It is on no page until it is accepted, and a past page shows none. Only the Daily section offers suggestions, from two sources: carryovers first, then due reminders.
_Avoid_: recommendation, prompt, reminder

**Carry over**:
The first kind of suggestion: an unfinished one-off entry (some check not done) from the most recent earlier period with any entries. Accepting it writes a fresh one-off entry with empty checks that records the entry it was carried from; declining it records the entry so it is never offered again. Either way the earlier entry stays as written. Every device gives the carried entry the same id (the first entry of its chain and the period), so accepting on two devices writes one line, and a carried entry that is crossed off is not offered again on that period. Nothing carries over by itself, and a recurring entry is never offered. A carried entry keeps its source's linked reminder.
_Avoid_: roll over, auto-carry, migrate

**Due reminders**:
The unfinished reminders in the device's Reminders app that are due today or were due earlier, in any list: what Reminders shows under Today. While the "Suggest iOS Reminders due Today" switch in Settings is on, they are the second kind of suggestion: offered on today's Daily section, the longest due first, marked "from Reminders". A reminder with no due date, or one due later, is not offered. A goal both sources hold under one title is offered once, as the carryover. They are read at launch, on each return to the foreground and every minute in front, and are never saved; only iOS has them.
_Avoid_: Today list, Reminders sync, inbox, import

**Linked reminder**:
The reminder an entry was written from, kept on the entry as `reminderId`. A reminder with a linked entry on any page is never offered again, whether or not that entry was finished. Reminder ids belong to one device: a link that arrived by merge or pad file points at nothing on another. The pad is the source of truth and Reminders a mirror (ADR 0011): nothing done on the pad changes a reminder.
_Avoid_: synced reminder, attached reminder

**Place**:
An entry's position in its section, stored as `sortOrder`: a section reads in ascending order, and the numbers need be neither whole nor consecutive. A template has a place too: the one its entry is materialized at.
_Avoid_: rank, priority, position

**Move**:
Giving an entry a new place in its section: long-press its title and drag, or use the title's Move up and Move down actions. Only the moved entry is written: its place becomes a number between its new neighbors'. A lifted entry held near the top or bottom of the window scrolls the page under it.
_Avoid_: reorder (as a noun), sort, rearrange

**Carry forward**:
What a move on the current period does beyond its own page: the moved entry's template takes a place between the templates of the recurring entries now around it, so the next period materializes in the same order. A move on a past page stays on that page.
_Avoid_: propagate, sync (for this)

**Materialize**:
Writing a template's entry onto the current period's section. Only the current period is ever materialized into; past pages are never backfilled. Today's page is always written: the goals core materializes it when the pad rehydrates, when the day turns, when a pad is imported and after a merge. Every device writes the same line: a materialized entry's id is its template and period.
_Avoid_: instantiate, generate

**Seed**:
The recurring goals a brand-new pad starts with, before anything has been saved.

**Check**:
One box on an entry: empty, done (✓), or missed (✕). A tap cycles empty → done → missed → empty. An entry has between one and ten checks; a template's target count says how many.
_Avoid_: checkbox, tick, completion

**Check label**:
A short word over one check of a multi-check entry, like Fitness's Legs/Push/Pull: positional, at most six characters, written from the goal form and inherited from the template. A one-check entry has none.
_Avoid_: sublabel, tag, caption

**Achieved**:
A section with every check on every entry done, once it has settled; its header then reads "Daily Goals Achieved!" (or Weekly, Annual). A section with no entries is never achieved. A section a check tap has just completed is settling: for a moment it keeps its plain header, so a check cycled past done to missed never shows as achieved.
_Avoid_: complete, finished, all done

**Reward moment**:
The reinforcement played when a check tap achieves a section: the header's red-pen flourish drawn in, with a haptic. It plays once per period per section, only on the current period, and only ever from a tap — a rehydrated, imported or merged pad plays none. Which periods have played is remembered per device, outside the pad.
_Avoid_: celebration, confetti

### Journal

**Reflection date**:
The day a gratitude entry is about — the day before it is written. Entries are keyed by reflection date, never by writing date.
_Avoid_: entry date, journal date

**Gratitude entry**:
The morning's text about one reflection date, stored as plain text. Lines may be bullets: a medium filled circle and a space at the top tier, or a medium hollow circle indented two spaces for the one tier below (U+26AB and U+26AA, each followed by U+FE0E so it draws as text). Only text beyond bullets and whitespace counts as written; emptying the text removes the entry.
_Avoid_: journal post, note

**Streak**:
Consecutive reflection dates with a gratitude entry, counted back from the current reflection date. This morning being unwritten does not break it.

### Backup

**Pad file**:
The whole pad — templates, entries, declined suggestions, gratitude entries and their tombstones — written to one JSON file under a schema version. Importing one replaces the pad wholesale; merging belongs to sync.
_Avoid_: backup file, snapshot, dump

**Footprint**:
The pad's size on this device — the bytes of each store's persisted JSON, and their total — projected for future years in ADR 0004.
_Avoid_: storage usage, disk size, quota

### Feedback

**Feedback note**:
An unshaped note to self written from Settings and filed as a GitHub issue labelled `needs-triage`: a one-line title and a description that becomes the body, closed by a footer saying where it was written. It is never part of the pad.
_Avoid_: bug report, ticket, comment

### Device

**Settings**:
The view behind the gear in the page's fixed header: the Reminders switch, where sync stands, the pad file's export and import, and the feedback note. Nothing in it sets the text size.
_Avoid_: pad footer, preferences, options

**Text size**:
The multiplier every text style, and every length that holds text, is drawn at: 100% to 200%. It is derived, never set in the app: the system's text size (Dynamic Type on iOS, the font scale on Android, the browser's default font size on web) times the Mac's zoom.
_Avoid_: font scale, accessibility size

**Zoom**:
The Mac's part of the text size: a step from 100% to 200%, moved by Zoom In (⌘+) and Zoom Out (⌘−) in the View menu. It is kept on the Mac across launches, never written to the pad file or synced, and no other device has one.
_Avoid_: text size (for the Mac's step alone), magnification

### Sync

**Stamp**:
The moment an item was last written, kept on the item (`updatedAt`, or a gratitude entry's `writtenAt`). The epoch is the stamp of a line nobody has written on yet; legacy, a millisecond after it, the stamp of an item from before stamps.
_Avoid_: timestamp, version, revision

**Tombstone**:
The record a removed item leaves behind: its key and when it was removed, kept beside the items so no other device's copy brings it back.
_Avoid_: soft delete, deleted flag

**Merge**:
Reconciling two copies of the pad item by item, the later stamp winning and tombstones removing what was crossed off (ADR 0005). A merge never overwrites and never drops data that isn't tombstoned. A check count merges by its own stamp, so a later write that never touched the count keeps its marks and loses only an old count. A template retired on either copy stays retired, from its first retirement and the day it was made on (ADR 0008). Declined suggestions merge as a union: declined on one device is declined on all.
_Avoid_: sync (for the rule itself), overwrite, replace

**Cloud pad**:
The pad as iCloud Drive holds it: files under `pad/` in the hidden root of the app's container — each feature's index, and one file of entries per year — that every device pulls from and pushes to (ADR 0006).
_Avoid_: backup, remote copy, server

**Pull**:
Reading the cloud pad and merging it into this device's pad. Happens when the pad opens, returns to the foreground, hears another device write, or iCloud comes back.
_Avoid_: download, fetch, refresh

**Push**:
Writing the cloud files this device's pad differs from, a moment after the last write. Never before a pull, never over a file that couldn't be read.
_Avoid_: upload, save to cloud, backup
