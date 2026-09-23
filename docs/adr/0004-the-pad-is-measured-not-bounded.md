# The pad's storage is measured, not bounded

Every page is kept forever (ADR 0001) and each store persists as one JSON blob that zustand rewrites in full on every change. Measured before optimizing anything: a pad written every morning — 10 daily, 8 weekly and 5 annual recurring goals, a ~400-character gratitude entry a day, 100 events a year — takes, as persisted UTF-8 JSON (`storageFootprint`, pinned by `footprint.test.ts`):

| Years | goals     | gratitude | events | total     |
| ----- | --------- | --------- | ------ | --------- |
| 1     | 746,516   | 177,768   | 9,619  | 933,903   |
| 3     | 2,234,235 | 533,278   | 28,887 | 2,796,400 |
| 5     | 3,721,916 | 888,788   | 48,128 | 4,658,832 |

Growth is linear at ~0.93 MB a year, four fifths of it goal entries (the `checks` arrays of `"empty"`/`"done"`/`"missed"` strings are most of that). The ceilings: iOS AsyncStorage has none (values over 1 KB become their own file in the sandbox); Android's default database cap is 6 MiB (`AsyncStorage_db_size_in_MB`); web `localStorage` is ~5 MiB per origin. Five years fits under all three; year six crosses the web line and year seven Android's.

Decision: no change to persistence now. The pad's first and unbounded device is the iPhone, Android is not a target, and the web build is a stopgap for the Mac until the Designed-for-iPad build (#9) — a horizon well short of six years. Instead of a bound, the size is kept visible and pinned: the Pad footer shows the live footprint (`useStorageFootprint`), and the test above fails the moment a persisted shape moves the figures, which is the moment to revisit this record.

When the tripwire fires, in order: partition `goals` by year so a check tap rewrites one year's blob (~750 KB) rather than the whole history — this also matters for sync (#6), which should never push a multi-megabyte document per tap; then `expo-sqlite/kv-store` on native for the Android cap and sync hydration reads — not on web, where its alpha support needs COEP/COOP headers GitHub Pages can't set, so the web cap stays whatever `localStorage` allows; never prune. A compact `checks` encoding was noticed but rejected for now: it changes the persisted and pad-file schemas for a saving the horizon doesn't yet need.
