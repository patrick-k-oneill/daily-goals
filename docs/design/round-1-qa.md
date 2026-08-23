# Daily Goals — Round 1 QA Report

QA pass over `round-1-spec.md` P0-1 … P1-6 against the working tree (uncommitted round-1
changes on top of `e82258c`), executed 2026-08-22 on the live dev server at
`http://localhost:8081` (Chrome browser pane: desktop + 375pt + 320pt, light + dark) and
on an iPhone 17 Pro simulator (402×874pt) via Expo Go. Every PASS below was personally
witnessed — interactions performed, store state inspected via `localStorage` before and
after, screenshots taken at each layout breakpoint.

## Verdict

**SHIP** — all 24 ACs verified, 23 PASS, 1 partial (AC-6.4's 44pt target is real on
native but not on web, see D2). No S1 blockers. One S2 found (pre-existing journal
autosave tug-of-war, not introduced by this round — but worth fixing soon). Gates are
green and match the engineering notes exactly.

---

## Gate results (run by QA, not taken on faith)

- `npm run check:all` → **exit 0**. typecheck clean, `expo lint` clean, jest
  **6 suites / 50 tests, all passing** (0.3s), prettier clean. Matches the claimed
  31→50 test growth.
- `npx react-doctor@latest --verbose` (full scan, 44 files) → **100/100, no issues**.
- `git diff -- src/constants/theme.ts` → exactly one line (`rule: '#2E4049'` →
  `'#3D5A69'`); light palette byte-identical (AC-5.3).
- Contrast independently recomputed with WCAG relative luminance:
  `#3D5A69` vs `#171410` = **2.504:1** (old value: 1.701:1).

### Test audit

Read all four new/extended suites (`goals/store.test.ts`, `events/logic.test.ts`,
`constants/theme.test.ts`, `goals/logic.test.ts`). All assertions are falsifiable and
match the implementation contract:

- `store.test.ts` resets zustand state per test, mocks AsyncStorage with the package's
  own jest mock, and asserts entry-count invariants that would fail if the
  `isCurrentPeriod` guard regressed. The "seeds templates even when first page viewed is
  past" case is a genuinely sneaky regression trap — good test.
- `events/logic.test.ts` asserts _reference identity_ (`toBe`) for the blank-title no-op,
  which is stronger than deep equality and pins the documented behavior.
- `theme.test.ts` implements the real WCAG formula (verified against my independent
  computation) rather than asserting a magic number.
- `logic.test.ts` covers the exact 340/339 fit boundary and both week/year rollovers.

No test asserts the wrong thing; none can pass vacuously. One nit (not a defect):
`store.test.ts` uses the real `todayKey()` — a suite started milliseconds before
midnight could theoretically flake. Negligible.

---

## AC table

| AC     | Result  | Evidence                                                                                                                                                                                                                                         |
| ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1.1 | PASS    | 375pt: "Daily Prod Blocks" (7) stacked — star+title line 1, all 7 boxes on one row below, title left edge aligned with the single-check row's checks column, zero orphans (screenshot).                                                          |
| AC-1.2 | PASS    | 375pt: "Fitness" stacked, all 7 labeled boxes on one row, each label above its own box, "Core" attached (screenshot).                                                                                                                            |
| AC-1.3 | PASS    | Desktop (720pt column): every seeded goal inline, checks before title, matches prior look (screenshot). 6-check "Weekly Prod" correctly stays inline even at 375pt.                                                                              |
| AC-1.4 | PASS    | 320pt viewport: 1-check "Recurring Dailies" renders inline (screenshot); unit test covers 262pt row width.                                                                                                                                       |
| AC-1.5 | PASS    | Stacked rows: star sits on line 1, centered against it (375pt + native screenshots). Edge case noted in D4 for _inline_ rows with wrapped titles.                                                                                                |
| AC-1.6 | PASS    | `goalRowLayout(rowWidth, checkCount)` pure + exported in `logic.ts`; tests cover 317/678 widths and the exact 340/339 boundary.                                                                                                                  |
| AC-2.1 | PASS    | Flipped today→8/18 (4 days): localStorage entries 11 before and after. Later flipped 30 days to Thu 7/23/26: 13 before/after, zero new entries. Store test confirms.                                                                             |
| AC-2.2 | PASS    | 8/18 showed "Nothing written on this page yet." + "+ Add goal"; added "QA Past Goal" → persisted with `periodKey: "2026-08-18"` only, no template created, invisible on today's page.                                                            |
| AC-2.3 | PASS    | Full reload with baseline data: `ensurePeriod` ran for today/week/year, entry count stayed 11 (idempotent). Materialization-on-new-period unit-tested.                                                                                           |
| AC-2.4 | PASS    | `isCurrentPeriod` pure in `logic.ts`; tests cover all cadences, Sun 8/23→Mon 8/24 week boundary, and New Year rollover.                                                                                                                          |
| AC-3.1 | PASS    | Web: × on every event row; click → confirm dialog ("Remove event / Remove "QA Event Renamed"?"); cancel left the event, confirm removed it. Native: × renders on the row, tap → iOS Alert (Cancel/Remove), Remove deletes.                       |
| AC-3.2 | PASS*   | Colors are tokens only: `textSecondary` at rest, `missed` on hover (rgb values verified via computed style). 28×28 box + 8pt hitSlop = 44×44 as the spec's "(hitSlop counts)" allows — but hitSlop is functionally inert on web (D2).            |
| AC-3.3 | PASS    | Tapping row body opened the form pre-filled (chip Sun 8/23, title, time, note); changed date→Tue 8/25, title→"QA Event Renamed " (trailing spaces), time→"7pm sharp"; Save persisted all three (title trimmed), row re-rendered with new values. |
| AC-3.4 | PASS    | Captured raw `daily-goals/events` bytes, edited title + date chip in the form, pressed Cancel → stored string byte-identical (`===` on the raw localStorage value).                                                                              |
| AC-3.5 | PASS    | `applyEventUpdate` trims like `addEvent`, blank title → same-array no-op; unit-tested incl. blanked time/note collapsing to `undefined`. Trimming also witnessed live in AC-3.3.                                                                 |
| AC-4.1 | PASS    | Web top bar: exactly Today + Journal. Native tab bar: exactly Today + Journal (screenshots).                                                                                                                                                     |
| AC-4.2 | PASS    | Navigated to `/week` → landed on `/`, Today page rendered, no 404/blank.                                                                                                                                                                         |
| AC-4.3 | PASS    | `week.tsx` is a `<Redirect href="/" />`; grep found no other week-route references; `check:all` clean.                                                                                                                                           |
| AC-5.1 | PASS    | 2.504:1 ≥ 2.5:1, asserted by `theme.test.ts` and recomputed independently.                                                                                                                                                                       |
| AC-5.2 | PASS    | Dark screenshots at desktop and 375pt: every goal-row separator and the event-row separator clearly discernible at 1×.                                                                                                                           |
| AC-5.3 | PASS    | Working-tree diff on `theme.ts` is exactly the one dark `rule` line.                                                                                                                                                                             |
| AC-6.1 | PASS    | Add (add-goal + event form) and Save (editor): computed opacity 0.4 when empty, press does nothing (store + form state unchanged), opacity 1 on first non-space char, re-dims when reduced to whitespace. Whitespace-only (" ") stays dimmed.    |
| AC-6.2 | PASS    | `aria-disabled="true"` on the rendered button while title empty/whitespace; removed when enabled.                                                                                                                                                |
| AC-6.3 | PASS    | Off-state switch shows a visible `border`-colored track in web light + dark (dark knob light mode / light knob dark mode), and the native platform track renders (screenshots).                                                                  |
| AC-6.4 | PARTIAL | Five rapid taps = five increments (1→6, verified); glyph unchanged; box 28×30. But the 8pt hitSlop that carries it to 44×44 does not extend the DOM hit target on web (D2) — effective web target is 28×30. Native hitSlop is real.              |

---

## Defects

### D1 · S2 — Journal text can be silently reverted: two mounted gratitude editors fight over the same entry (pre-existing, NOT a round-1 regression)

- **Repro (web):** 1) Open Today (it renders a `GratitudeEditor` for the current
  reflection date). 2) Switch to Journal (renders a second `GratitudeEditor` for the
  same date — both stay mounted under the web tab navigator). 3) Append text in the
  Journal editor and wait for "Saved ✓". 4) Watch `localStorage['daily-goals/gratitude']`:
  `writtenAt` keeps bumping and the text **alternates forever** between your new text and
  the stale draft held by the hidden Today editor.
- **Witnessed:** entry text flipped new→old→new→old with fresh `writtenAt` stamps
  (03:08:20 / 03:08:42 / 03:09:52 / 03:10:52 UTC), with zero user input between samples.
  Which version survives depends on when the tab is closed — a coin-flip data loss on
  journal writing. (In a hidden tab the loop is timer-throttled to ~1/min; visible, it
  cycles every ~1.2s.)
- **Expected:** typing in one editor saves once; nothing overwrites it.
- **Suspected cause:** `EditorCard` in
  `src/features/gratitude/components/gratitude-editor.tsx` — the autosave effect
  (`if (text === savedText) return; setTimeout(save, 600)`) re-arms whenever the _store_
  changes under a stale local draft, so every save by editor A makes editor B "dirty" and
  vice-versa. Mounted pairs: `src/app/index.tsx:47` + `src/app/journal.tsx:25` (same
  reflection date); the Journal catch-up editor and a flipped-back Today page can form a
  second pair. Fix direction: save only drafts dirtied by user input (dirty flag), or
  resync the draft from the store when the editor isn't focused.
- **Status:** both mounts and the effect predate round 1 (present at HEAD); reported
  because QA witnessed live data loss. The round-1 diff does not touch this file.

### D2 · S3 — hitSlop is a no-op on react-native-web: steppers and event-× have 28pt effective targets on web (AC-3.2 / AC-6.4 web shortfall)

- **Repro:** open any add/edit form on web, click 4px above the "+" stepper's box (inside
  the claimed hitSlop zone) → nothing increments; `document.elementFromPoint` at that
  spot returns the parent `<div>`, not the button. Same geometry applies to the event ×
  (28×28 box).
- **Expected:** ≥44×44pt effective target per AC-3.2/AC-6.4.
- **Actual:** 28×30 (steppers) / 28×28 (×) on web; hitSlop only works on native (where
  the ACs do hold).
- **Suspected cause:** react-native-web does not project `hitSlop` into DOM hit-testing;
  the engineering notes' "28pt + 8pt hitSlop = 44×44 effective" is true only on native.
  Fix: real padding on web (e.g., `padding: 8` with negative margin to keep the glyph
  position), or platform-forked style.
- Mitigation: desktop mice are precise; mobile-web is where this bites.

### D3 · S3 — At 402pt (iPhone 17 Pro, the actual device width), 7-check goals go inline and the title wraps to two ragged lines

- **Repro:** launch in Expo Go on iPhone 17 Pro (402pt wide). Weekly "Recurring Dailies"
  (7 checks) renders inline: 7 boxes left, title squeezed into the ~124pt remainder and
  wrapped to two lines — visually the exact "ragged right-hand column" the spec's design
  review called broken. The 8-check "Daily Prod" stacks correctly on the same screen.
- **Expected (design intent):** the marquee goal row holds its shape at phone width.
- **Actual:** the fit rule (`checksGroupWidth(7)=220 + 120 ≤ ~344`) legitimately chooses
  inline at 402pt; every 375pt AC still passes. This is a spec-tuning gap, not an
  implementation bug: `MIN_INLINE_TITLE_WIDTH = 120` is too small for real titles at the
  most common iPhone width. Suggest raising the minimum (~160) or measuring actual title
  width; one constant in `src/features/goals/logic.ts`.

### D4 · S4 — In inline layout, a wrapped multi-line title centers the star against the whole row, not the first line

- **Repro:** web 375pt, add a 1-check goal with an 84-char title → renders inline (per
  AC-1.4), title wraps to 3 lines, star and checkbox float vertically centered across the
  block. Same on native weekly rows whose titles wrap (D3).
- AC-1.5 says the star rides the first line "in both layouts"; inline was also mandated
  unchanged (AC-1.3), and this is the pre-existing inline behavior. Cosmetic; only
  visible when an inline title wraps.

---

## Regression pass (web) — all witnessed, all clean

- **Check cycling:** empty→✓→✕→empty on today's "Daily Prod Blocks", store verified at
  each step. **Rapid multi-tap:** 9 total taps (incl. 3 double-clicks) = exactly 3 full
  cycles, final state consistent with tap count.
- **Star:** starring "Recurring Dailies" floated it above the other starred goal in
  sortOrder order; unstar restored; store round-tripped to baseline.
- **Add goal:** repeats switch off shows visible track (light + dark); stepper caps at
  10 (11 clicks → "10 checks") and floors at 1.
- **Edit-in-place:** rename + resize 2→3 preserved the existing ✓ mark and synced store;
  editor reopens pre-filled; Save dims on whitespace title; Remove shows the correct
  one-off copy ("from this page?") vs recurring copy ("…and stop it repeating in future
  periods?").
- **Removing a recurring goal from a past page (8/19)** removed only that page's entry,
  kept today's entry, and deactivated the template — same behavior as from today, and the
  confirm copy states the future-period consequence honestly. Cancel path left everything
  untouched. (Design note, not a defect: past-page removal still kills future repetition;
  the dialog does warn.)
- **Page flips:** ‹ flips back with red date + ›; tapping the date snaps to today from
  1 day and from 30 days back. Upcoming events correctly hidden on past pages.
- **30+ day fast flip:** 30 consecutive back-flips to Thu 7/23/26 (crossing a month and
  ~5 ISO weeks): no crash, zero console errors, zero new entries (13→13), all sections
  honest-blank, gratitude editor keyed to the flipped day.
- **Events:** add with time + note → row renders "Sun 8/23 · QA Event · @ time ·
  note-in-red-handwriting"; note renders in accent Caveat at 375pt and desktop, light and
  dark.
- **Journal:** autosave persists ("Saved ✓", probe text survived a full reload — the
  oscillation in D1 is a dual-mount issue, not an autosave failure); calendar shows the
  red ✓ only on the written day (Aug 21); today/future days muted; tapping past day 15
  opens the catch-up editor below; ‹ to July renders an empty month without errors, › returns,
  and the › chevron disappears at the current month (capped).
- **Persistence:** every mutation appeared in localStorage immediately; full reloads
  rehydrated identical state.
- **Dark mode:** Today + Journal fully rendered in dark at desktop and 375pt; rule lines
  visible everywhere (AC-5.2).
- **Console:** `read_console_messages onlyErrors` after every phase — zero errors the
  entire session.

## Break-it pass — results

| Attack                                                | Result                                                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Whitespace-only titles (add-goal, editor, event form) | Buttons stay dimmed + `aria-disabled`; press is inert (AC-6.1/6.2 hold).                                                                  |
| Rapid multi-tap on one check                          | Final state exactly matches tap count; no dropped/doubled cycles.                                                                         |
| 84-char title at 375pt                                | Inline (1 check), wraps to 3 lines, no overflow; `scrollWidth === 375` (no horizontal scroll). See D4 for the star.                       |
| 10-check goal at 375pt                                | Stacked; boxes wrap 9+1 into a second row — the spec-sanctioned "count alone exceeds the width" case; first row full, no layout breakage. |
| Edit event → Cancel                                   | Stored bytes identical (AC-3.4).                                                                                                          |
| Remove recurring goal from past page vs today         | Identical semantics; only the targeted entry removed; template deactivated with explicit confirm copy either way.                         |
| Flip back 30+ days quickly                            | No crash, no console errors, no new entries, month/week boundaries crossed cleanly.                                                       |
| Journal month with no entries (July)                  | Clean empty grid, nav returns, no errors.                                                                                                 |

## Native spot-check (iPhone 17 Pro, Expo Go)

- Exactly 2 tabs (Today, Journal) with icons — AC-4.1 native.
- 8-check "Daily Prod" renders stacked with all boxes on one row, no orphans; star on
  line 1. 7-check rows render inline at 402pt per the fit rule (see D3). No orphan boxes
  anywhere.
- Check tap works (✓ appeared, then cycled back to empty).
- Add-event form opens inline with wrapping date chips; typed title enabled the Add
  button; added event showed the × ; × → native Alert (Cancel / destructive Remove);
  Remove deleted the row.
- Repeats switch off-state shows a visible platform track; Add renders dimmed while
  empty (P1-6 native).
- The engineering note's "one-frame inline→stacked settle on first paint" was not
  observable via screenshots; no mis-layout was ever captured.

## Notes / limitations

- Enter-to-submit (`onSubmitEditing`) could not be exercised — the browser pane's
  synthetic key events don't reach RN's submit handler (tool limitation, clicks were used
  instead). Worth a 10-second manual check.
- The pre-existing phantom entries (8/19–8/21) were verified untouched, per spec.
- Gratitude "Reflecting on Sat, Aug 15" catch-up placeholder still shows the example text
  (P2-7 — explicitly deferred, listed for completeness).

## Data cleanup

All test artifacts were removed. Web: `daily-goals/goals`, `daily-goals/events`, and
`daily-goals/gratitude` were byte-restored to the exact pre-QA snapshot (11 entries /
5 templates / 0 events / original journal text and `writtenAt`) and verified after a
final reload; browser left on Today, desktop, light. Native: the test check was cycled
back to empty and the test event removed; no residue. Nothing was left uncleaned.

---

## Defect-fix verification

Re-verification pass over the "Defect fixes" section of `round-1-engineering.md`,
executed 2026-08-22→23 (local midnight rolled over mid-session; see data note) against
the live dev server at `http://localhost:8081` (Chrome browser pane: desktop 1280pt +
375pt, light) and the iPhone 17 Pro simulator (402×874pt, Expo Go). Every verdict below
was personally witnessed; store state was sampled via `localStorage` at each step.

### Gates (re-run by QA)

- `npm run check:all` → **exit 0**: typecheck clean, lint clean, jest **7 suites /
  54 tests all passing** (0.33s), prettier clean. Matches the claimed 50→54 growth
  (new `gratitude/store.test.ts`).
- `npx react-doctor@latest` (full scan, 45 files) → **100/100, no issues**.

### Verdicts

| Defect                                | Verdict            | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 (S2, journal tug-of-war)           | **VERIFIED FIXED** | Both editors co-mounted (Today + Journal, confirmed 2 textareas in DOM); typed probe into the Journal editor, then sampled the persisted entry 5× over ~66s: text and `writtenAt` byte-identical every sample (old loop cycled ~1.2s visible). Both textareas updated live on each keystroke. Clearing to whitespace removed the entry from the store and BOTH editors snapped to empty (the typed space itself didn't survive — the store is the single source of truth); typing again recreated the entry with a fresh `writtenAt`.   |
| D2 (S3, web hit targets)              | **VERIFIED FIXED** | Steppers: − and + both measure exactly **44×44** via `getBoundingClientRect`; `elementFromPoint` 5px above the + glyph's box resolves to the "More checks" BUTTON; a real click there incremented 1→2. Event ×: 44×44 box; `elementFromPoint` probes 5px outside the glyph on **all four sides** resolve into the ×; a real click 5px above the glyph fired the remove confirm (cancel kept the event, confirm removed it). Form/event-row visual density unchanged (screenshots vs round-1). Pane rendered fine, so no BLOCKED probes. |
| D3 (S3, 402pt stacking)               | **VERIFIED FIXED** | Simulator (fresh Expo Go reload, 402pt): weekly 7-check "Recurring Dailies" and "Fitness" both render **stacked** — title line 1, all 7 boxes on one row below, labels attached, star on line 1, no ragged inline titles. Web 375pt: 6-check "Weekly Prod" now stacks (intentional), 7-check rows stack, 1-check rows stay inline. Desktop (1280pt): every seeded goal inline, unchanged. See observation O1 below on 6-check at native 402pt.                                                                                          |
| D4 (S4, star on wrapped inline title) | **VERIFIED FIXED** | Web 375pt, 70-char 1-check goal: inline layout, title wraps to 3 lines (72pt), star center **315 = first-line center 315** (block center would be 339; `starTop − titleTop = −2` exactly per the fix). Desktop: labeled Fitness row still inline with star center = title center = checks-group center (556 = 556 = 556) — centered as before. Test goal removed.                                                                                                                                                                       |

### Regression smoke (web) — all witnessed, all clean

- Check cycle empty→✓→✕→empty verified in the store at each step.
- Goal add (1 check) → rename + resize 1→3 via editor (same entry id, checks
  preserved/extended) → remove with the correct one-off confirm copy
  ("…from this page?"); store back to pre-test count.
- Page flip ‹ to Sat 8/22 (red date, both chevrons, prior state intact — star +
  done check preserved) → date tap snapped back to today; **zero entries added**
  by the past-page visit.
- Journal calendar: red ✓ on Aug 21 only; selecting past day 15 opened the
  "Reflecting on Sat, Aug 15" catch-up editor below; re-tap deselected and closed
  it; future days muted.
- Event: add → tap-to-edit prefilled → rename + time "3pm" saved (same id,
  trimmed) → × removed via confirm. (Same flow doubled as D2's × probes.)
- `read_console_messages onlyErrors` at session end: **zero errors for the entire
  session.**

### New defects

**None.** Two observations, neither a regression:

- **O1 (note, not a defect):** at native 402pt the 6-check "Weekly Prod" renders
  _inline_ — single line, no title wrap, no visual breakage. The engineering note
  claims 6-check stacks at "375–402pt (188 + 160 > 317/344)", but the real native
  row measures wider than the note's ~344pt estimate, so the fit rule legitimately
  picks inline there (the 7-check rows still stack: 380 > row width). Web 375pt
  behaves exactly as claimed. Only the note's arithmetic is off, not the code.
- **O2 (cosmetic, momentary):** the D4 star is block-centered for one frame after
  a wrapped inline row first lays out, then snaps to line 1 when the title's
  `onLayout` reports — same class as the known one-frame inline→stacked settle.
  Also, the checkbox in a wrapped inline row remains block-centered; the D4 fix
  scoped the _star_ (per AC-1.5) and inline geometry was mandated unchanged
  (AC-1.3), so this is pre-existing behavior, listed for completeness.

### Verification limitations

- Real pointer clicks were used for every D2 hit-target probe (desktop pane).
  Some non-D2 interactions (form opens, editor buttons) were driven via
  dispatched DOM clicks after `computer` clicks timed out in the hidden pane at
  375pt — acceptable because those steps verified store semantics, not hit
  geometry. Synthetic Backspace/Enter still don't reach RN handlers (known tool
  limitation; Enter-to-submit remains worth a 10-second manual check).
- D1 native typing feel (per-keystroke persistence, long entry) was not
  exercised — simulator text entry couldn't be cleaned up reliably, and the two
  editors never co-mount on native. Native tap handling was smoke-tested instead
  (check cycled ✓→✕→empty and left clean).

### Data / environment restoration

Local midnight rolled over mid-session (8/22→8/23), so on reload the app
organically materialized the two recurring daily entries for 2026-08-23 — normal
`ensurePeriod` behavior, not QA residue. Final state verified: goals 13 entries /
5 templates, **zero QA-titled residue**, 8/22's starred goal and done check
byte-preserved; events `[]` as found; `daily-goals/gratitude` **byte-identical**
to the pre-test snapshot (original text + `writtenAt`). Native: test check cycled
back to empty; nothing else touched. Browser left on Today, desktop, light.

### Round-1 verdict (post-fix)

**SHIP** — all four defect fixes verified against reality, gates green
(check:all exit 0, 54 tests; react-doctor 100/100), regression smoke clean,
zero console errors, no new defects.
