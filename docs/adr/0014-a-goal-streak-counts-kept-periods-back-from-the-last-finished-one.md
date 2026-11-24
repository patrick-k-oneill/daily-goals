# A goal streak counts kept periods back from the last finished one

The Daily and the Weekly section each show a streak (#94), a pill in the section header like the gratitude one: `goalStreak` in `goals/logic.ts`, a pure query over the entries with the page's day passed in. Nothing new is stored, so the streak syncs, imports and exports with the entries it is read from.

- **A period is kept** when every check on every one of its lines is done, the same bar as the Achieved header (ADR 0009). A check marked missed breaks the streak: a streak of days attended to would grow on days nothing was done.
- **A week is kept by its weekly goals alone**, whatever its days did. The two streaks answer different questions and neither waits on the other.
- **A period with no lines neither breaks nor extends** the streak. Since #65 a daily goal may skip weekdays, so a day with nothing written is not a day missed; it is passed over as if it were not there.
- **The current period is still being written.** The streak counts back from the period before it, and the current one adds one once its section is achieved, after the same settling a check tap gets, so a tap cycled past done to missed never shows a number that then falls back. It never breaks the streak before it is over.
- **On an earlier page** the pill reads as it stood on that page: periods after the page's are not counted.
- **The pill shows from two up**, and the Annual section has none: a streak of years is not a number worth a glance.

Rejected: a longest streak, which needs either stored state or a second number in a header that has room for one; a page-level streak or reward moment for a fully done page, which would outrank the sections that already have theirs; counting a missed mark as kept; and requiring a week's days to be kept for the week to count, which makes the weekly streak a copy of the daily one that is harder to keep.
