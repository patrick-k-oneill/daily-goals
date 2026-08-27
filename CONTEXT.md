# Daily Goals

A digital legal pad: each morning's page of goals, the events jotted at the bottom of it, and the gratitude entry written about the day before.

## Language

### The page

**Page**:
Everything written for one day — its three goal sections, the upcoming events, and the gratitude entry. Today's page is the one being written; a past page reads exactly as it was left.
_Avoid_: screen, view

**Section**:
One cadence's block of goal lines on a page: Daily Goals, Weekly Goals, or Annual Goals. A section keeps one layout rhythm.
_Avoid_: list, category, block

**Period**:
The span a section covers — a day, an ISO week (Monday–Sunday), or a calendar year — identified by a period key (`2026-08-21`, `2026-W34`, `2026`).
_Avoid_: date range, bucket

**Cadence**:
How often a goal recurs: daily, weekly, or annual. A goal's cadence decides which section it is written in.
_Avoid_: frequency, type

### Goals

**Template**:
A recurring goal. It is not itself on any page; it materializes into an entry on each new period's section.
_Avoid_: habit, default, recurring goal (as a noun)

**Entry**:
A goal line on a specific period's section, either materialized from a template or written one-off.
_Avoid_: goal instance, task, item

**Materialize**:
Writing a template's entry onto the current period's section. Only the current period is ever materialized into; past pages are never backfilled.
_Avoid_: instantiate, generate

**Seed**:
The recurring goals a brand-new pad starts with, before anything has been saved.

**Check**:
One box on an entry: empty, done (✓), or missed (✕). A tap cycles empty → done → missed → empty. An entry has between one and ten checks; a template's target count says how many.
_Avoid_: checkbox, tick, completion

**Star**:
The margin mark on a page's key goal. Starred entries float to the top of their section.
_Avoid_: pin, favorite, priority

### Journal

**Reflection date**:
The day a gratitude entry is about — the day before it is written. Entries are keyed by reflection date, never by writing date.
_Avoid_: entry date, journal date

**Gratitude entry**:
The morning's free text about one reflection date. Emptying the text removes the entry.
_Avoid_: journal post, note

**Streak**:
Consecutive reflection dates with a gratitude entry, counted back from the current reflection date. This morning being unwritten does not break it.

### Events

**Upcoming event**:
A dated jotting at the bottom of today's page — a title, an optional time label, an optional aside — shown from its date onward.
_Avoid_: appointment, reminder, calendar item

### Backup

**Pad file**:
The whole pad — templates, entries, gratitude entries and upcoming events — written to one JSON file under a schema version. Importing one replaces the pad wholesale; merging belongs to sync.
_Avoid_: backup file, snapshot, dump
