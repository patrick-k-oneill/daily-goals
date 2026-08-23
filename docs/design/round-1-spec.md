# Daily Goals — Design Review & Spec, Round 1

Reviewed live at `http://localhost:8081` (web) on 2026-08-22: desktop light, desktop dark,
and 375pt mobile, exercising check-cycling, starring, add/edit/remove goals, page-flipping,
add/remove events, the Week tab, and the Journal (editor, calendar, day selection).
All findings verified against the running app and the source.

---

## 1. Design review

### What works

The identity is genuinely there, and it is the app's best asset. On desktop light,
the Today page reads unmistakably as the pad: warm paper, the red margin rule,
the top-left handwritten date, big centered underlined Caveat headings, and the exact
section order of the paper original (Daily → Weekly → Annual → Upcoming → Gratitude).
This is a real translation, not a skin.

- **Check-cycling feels like pen marks.** ✓ in ink color, ✕ in the muted `missed` red,
  blank as an empty box. Three taps, no menus, exactly right (`src/components/ui/check-box.tsx`).
- **The page-flip signal is clear.** On a past page the date turns accent red, gains a ›,
  and tapping the date snaps back to today. Cheap, legible state signaling.
- **Microcopy is in the owner's voice.** "Nothing written on this page yet.",
  "No events jotted down.", and the add-event placeholder "Scribbled aside, e.g. omg lol"
  keep the artifact's warmth without getting cute.
- **The gratitude model is faithfully carried through.** The entry is keyed to the day
  reflected on, so Friday's page and Saturday morning's writing session show the same
  block — which is exactly how the paper works.
- **The Journal calendar is quiet and appropriate.** A ✓ per written morning, handwritten
  month header, no gamification noise beyond the streak pill.
- **Architecture supports the design.** Tokens are real (`src/constants/theme.ts`),
  no hardcoded colors leaked into feature components, and the pure-logic layer makes the
  behavioral fixes below cheap and testable.

### What fails

Ordered by how much they betray the product.

1. **The signature goal row collapses on a phone.** (Today, mobile 375pt, light.)
   "Daily Prod Blocks" ×7: the checks wrap 6-then-1 — a single orphan box dangling on a
   second row — while the title is squeezed into a ragged right-hand column and wraps to
   two lines. "Fitness" strands its labeled "Core" box alone on row two. The star floats
   vertically centered across both check rows, anchored to nothing. The multi-check goal
   is the app's marquee object, and at phone width — the width this ritual will actually
   happen at — it looks broken. Cause: `styles.checks { maxWidth: '60%' }` plus a single
   inline flex row in `src/features/goals/components/goal-row.tsx`.

2. **Flipping to a past page fabricates history.** Verified: paging back to Wed 8/19
   instantly wrote blank "Recurring Dailies" and "Daily Prod Blocks" entries for that day
   into the persisted store (`GoalList`'s `useEffect` → `ensurePeriod` runs for every
   period viewed; `src/features/goals/components/goal-list.tsx:23-25`). Merely _looking_
   at old pages litters storage with phantom entries and makes past pages lie — a page
   never written on now claims goals existed and went unmarked. On paper, an unwritten
   page stays blank. That blankness is the truthful record.

3. **Events can't be edited and their delete is invisible.** The only way to remove an
   event is a 400ms long-press (`upcoming-events.tsx:58-61`) — a gesture with zero
   affordance anywhere in the UI, and one that essentially doesn't exist for a mouse.
   There is no edit at all: a typo in "IRC @ 4pm–5:30pm" means finding the secret
   long-press, confirming a delete, and retyping. Goals set the pattern — tap to edit
   in place — and events silently break it.

4. **The Week tab is a strict subset of Today.** Side-by-side verified: it renders the
   same Weekly Goals and Annual Goals rows, same period, same data, minus the daily
   section, events, and gratitude — and it can't even flip to past weeks. It occupies a
   third of the navigation while offering nothing Today doesn't. Every tab must earn its
   place; this one doesn't.

5. **Dark mode loses the rule lines.** The blue rules are half the pad's identity.
   In dark, `rule` (#2E4049) on `background` (#171410) computes to ~1.7:1 contrast,
   rendered at hairline width — the goal-row separators effectively vanish (verified in
   dark screenshots). Light mode keeps the identity; dark mode quietly drops it.

6. **Forms give no feedback and hide their controls.** The Add/Save buttons render
   fully opaque when the title is empty, but pressing them silently does nothing
   (`add-goal-row.tsx:31`, `goal-row.tsx:89`) — a dead button with no disabled state.
   The "Repeats every day" Switch sets only `trackColor.true`, so on web the off state is
   a floating white knob with no visible track on cream paper (verified, mobile add-goal
   form). The −/+ check steppers are ~22pt glyphs — under Apple's 44pt floor even with
   hitSlop.

7. Smaller sins, still sins (P2 material):
   - **Journal calendar dead-tap:** tapping the current reflection date (the only ✓ day)
     highlights the cell and shows nothing — its editor is above the calendar, but no
     scroll or pointer says so (`journal.tsx:32-34`).
   - **The catch-up editor's placeholder reads as real text.** Select a past unwritten
     day and the card shows "Amy, Leto, sharing a great night, eating tasty food…" in
     placeholder gray — at a glance it looks like a written entry.
   - **Starring teleports the row.** `byPadOrder` (`logic.ts:112`) floats the starred
     goal to the top instantly; the thing you just tapped jumps out from under your
     finger with no transition. On paper, the star is drawn next to the line — the line
     doesn't move.
   - **Web top bar says "Daily Goals" 60px above a page heading that says "Daily Goals".**
   - **Calendar noise:** a faint dot under all ~25 unwritten days, and today is
     indistinguishable from future days.

---

## 2. Spec

Six P0/P1 items, one overnight pass. All colors via `src/constants/theme.ts` tokens;
behavior changes land in `logic.ts` as pure, unit-tested functions; no new dependencies;
Expo Go stays working.

---

### P0-1 · Goal rows must hold their shape at phone width

**Rationale:** The multi-check goal row — the app's signature object — visually breaks at
375pt (orphaned checks, right-crammed two-line titles, unanchored star).

**Intended behavior:** A goal row has two layouts, chosen deterministically:

- **Inline (unchanged):** star · checks · title on one line — used whenever the full
  checks group plus a minimum title width (120pt) fits in the row's measured width.
  Desktop keeps today's exact look.
- **Stacked:** when they don't fit, the goal takes two ruled lines, like a big goal on
  paper: line 1 = star + title (full remaining width); line 2 = the checks group,
  left-aligned under the title's left edge, wrapping into full rows only when the count
  alone exceeds the width. Check labels (Legs/Push/Pull…) stay attached above their boxes.

Width comes from the row's `onLayout` (or `useWindowDimensions`); the checks group width
is computable: `n × 28 + (n − 1) × 4`. Remove `maxWidth: '60%'` from `styles.checks`.
Touched: `src/features/goals/components/goal-row.tsx`; the fit rule as a pure helper in
`src/features/goals/logic.ts` with tests.

**Acceptance criteria**

- AC-1.1 At 375pt viewport, a 7-check goal ("Daily Prod Blocks") renders stacked: title on
  one line starting at the same left edge as single-check goal titles' checks column, all
  7 boxes in a single row beneath it, zero orphaned boxes.
- AC-1.2 At 375pt, "Fitness" (7 labeled checks) renders stacked with all 7 labeled boxes
  on one row; "Core" is not orphaned; each label sits above its own box.
- AC-1.3 At desktop width (720pt content column), every seeded goal renders inline,
  pixel-equivalent to the current layout (checks before title).
- AC-1.4 A 1-check goal renders inline at every width ≥ 320pt.
- AC-1.5 The star renders on the first line of the row in both layouts, vertically
  centered against that line only.
- AC-1.6 The fit decision is a pure exported function in `logic.ts` (row width, check
  count in; layout mode out) with unit tests covering the 375/720 boundaries.

---

### P0-2 · Past pages must not materialize recurring goals

**Rationale:** Browsing history currently writes phantom blank entries into storage for
every past period viewed, falsifying the record and growing the store on idle flipping.

**Intended behavior:** Recurring templates materialize **only into the current period**
of their cadence (today's day key, this ISO week, this year). A past page renders exactly
the entries stored for it — if nothing was written, it shows "Nothing written on this
page yet." That blank page is correct and intended, matching paper. Manual "+ Add goal"
on a past page still works (you may always write on an old page). No retroactive cleanup
of already-created phantom entries (indistinguishable from genuinely unmarked days).

Touched: `src/features/goals/store.ts` (`ensurePeriod` guard),
`src/features/goals/logic.ts` (pure `isCurrentPeriod(cadence, periodKey, todayKey)` or
equivalent) + `logic.test.ts`.

**Acceptance criteria**

- AC-2.1 With seeded templates, flipping Today back one or more days creates zero new
  entries in the goals store (store entry count identical before/after, verified by test
  and by AsyncStorage/localStorage inspection).
- AC-2.2 A past day with no stored entries shows the existing empty state plus
  "+ Add goal"; adding one there persists to that page only.
- AC-2.3 Opening the app on a new day still materializes daily templates for today,
  weekly for the current week, annual for the current year (idempotent on re-open).
- AC-2.4 `logic.ts` exposes the period-currency check as a pure function; unit tests
  cover daily/weekly/annual, including a week boundary (Sunday→Monday).

---

### P0-3 · Events: visible remove, tap to edit

**Rationale:** Event deletion hides behind an unhinted 400ms long-press (nonexistent for
mouse users) and events cannot be edited at all — breaking the tap-to-edit convention
goals established.

**Intended behavior:**

- Each event row gains a quiet remove affordance: an `×` at the row's far right,
  `textSecondary` at rest (hover/press: `missed`), ≥44pt effective target, invoking the
  existing `confirmAction`. Long-press remains as a shortcut on native.
- Tapping anywhere else on the event row opens the existing add-event form inline,
  pre-filled (date chip, title, time, note), with the primary button reading **Save**.
  Saving updates the event in place; Cancel discards.
- Store gains `updateEvent(id, patch)` mirroring `addEvent`'s trimming rules
  (`src/features/events/store.ts`); form component is reused, not duplicated
  (`src/features/events/components/upcoming-events.tsx`).

**Acceptance criteria**

- AC-3.1 Every event row shows the `×` on web and native; tapping it opens the confirm
  dialog; confirming removes the event; canceling leaves it.
- AC-3.2 The `×` uses only theme tokens and has a ≥44×44pt hit area (hitSlop counts).
- AC-3.3 Tapping an event row body opens the pre-filled form; changing any field and
  saving persists the change; the row re-renders with updated values.
- AC-3.4 Cancel after edits leaves the stored event byte-identical.
- AC-3.5 `updateEvent` trims title/time/note like `addEvent` (empty title → no-op) and
  is covered by a unit test.

---

### P1-4 · Remove the Week tab

**Rationale:** It renders a strict subset of Today with zero unique capability. The pad
has one page; the app should stop pretending it has two. Elegance through subtraction.

**Intended behavior:** The Week tab disappears from web top bar and native tabs, leaving
**Today** and **Journal**. `src/app/week.tsx` becomes a redirect to `/` so bookmarks and
muscle-memory URLs don't 404 (expo-router `<Redirect href="/" />`), or the route is
deleted outright if a 404 is acceptable — prefer the redirect. Weekly goals remain
exactly where they already live: on the Today page.

Touched: `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`,
`src/app/week.tsx`.

**Acceptance criteria**

- AC-4.1 Web top bar shows exactly two tabs: Today, Journal; native tab bar likewise.
- AC-4.2 Navigating to `/week` on web lands on the Today page (no 404, no blank screen).
- AC-4.3 No dead code remains referencing the week route (lint/typecheck clean,
  `npm run check:all` passes).

---

### P1-5 · Dark mode keeps the rule lines

**Rationale:** The blue rules are pad identity; at ~1.7:1 contrast and hairline width
they effectively disappear in dark mode.

**Intended behavior:** Adjust the dark `rule` token only — keep it a desaturated
slate-blue in the same family, raised to ≥2.5:1 contrast against dark `background`.
Suggested value: `#3D5A69` (computes ≈2.5:1 vs `#171410`). Light mode untouched. No
component changes; every rule/underline picks it up via the token.

Touched: `src/constants/theme.ts` (one value).

**Acceptance criteria**

- AC-5.1 `Colors.dark.rule` vs `Colors.dark.background` contrast ratio ≥ 2.5:1 (WCAG
  relative-luminance formula; assert in a small unit test or verify with a checker).
- AC-5.2 In a dark-mode screenshot of Today at desktop and 375pt, every goal-row
  separator and the event-row separators are visibly discernible at 1× zoom.
- AC-5.3 Light palette values are byte-identical to current.

---

### P1-6 · Forms: honest buttons, visible switch, reachable steppers

**Rationale:** Dead-tapping an opaque Add button, an off-switch that renders as a
floating knob, and sub-44pt steppers make the three forms (add goal, edit goal, add
event) feel unfinished.

**Intended behavior:**

- **Disabled state:** Add (add-goal, add-event) and Save (goal editor) render at 40%
  opacity with `accessibilityState={{ disabled: true }}` while the title is
  empty/whitespace; they become fully opaque the moment the title is non-empty.
- **Switch:** `trackColor` gains a `false` value of `theme.border` (and `thumbColor`
  set so the knob contrasts with both track states on web).
- **Steppers:** −/+ in all three forms get a ≥44×44pt effective target via
  padding/hitSlop; glyph size unchanged.

Touched: `add-goal-row.tsx`, `goal-row.tsx` (editor), `upcoming-events.tsx`. Tokens only.

**Acceptance criteria**

- AC-6.1 With an empty title, Add/Save appears dimmed (40% opacity) and pressing it
  changes nothing; typing one non-space character restores full opacity; deleting back
  to empty dims it again.
- AC-6.2 Screen readers report the button as disabled when the title is empty.
- AC-6.3 The repeats Switch shows a visible track in the off state in light and dark.
- AC-6.4 Each stepper button's pressable area measures ≥44×44pt; five rapid taps
  register five increments.

---

### P2 — nice to have (only if the night is long)

- **P2-7 Journal calendar honesty.** Tapping the current reflection date scrolls
  to/briefly highlights the editor above instead of dead-highlighting the cell
  (AC-7.1); the catch-up editor for a past day uses a non-example placeholder —
  "Nothing written for this morning yet…" (AC-7.2); today's cell gets a subtle marker,
  distinct from future days (AC-7.3); unwritten days drop the dot — blank means blank
  (AC-7.4).
- **P2-8 Settle the star.** Keep float-to-top, but soften the teleport: on native,
  animate the reorder (LayoutAnimation); on web, where that's unsupported without new
  deps, a ~150ms opacity settle on the moved row is acceptable (AC-8.1: starring a
  mid-list goal produces a perceivable transition on iOS; AC-8.2: no new dependencies).
- **P2-9 De-duplicate the web masthead.** The top bar drops the "Daily Goals" wordmark
  (tabs left-aligned, or a small ★ monogram in `margin` red), ending the double
  "Daily Goals" stack on the Today page (AC-9.1: the string renders once above the fold).
- **P2-10 Events beyond next week.** Replace the 7-chip row with the same chips plus a
  "Later…" chip revealing a compact month grid (reuse `monthGrid` from `lib/dates`)
  (AC-10.1: an event 3 weeks out can be created; AC-10.2: it lists with the existing
  day-label format).

---

## 3. Out of scope (deliberately deferred)

- **iOS Simulator design pass** — this round reviewed web only; native tab bar, safe
  areas, and haptics deserve their own session.
- **Per-check label editing UI** — `checkLabels` exist in the schema and render, but
  creating/editing them (and reconciling labels when the stepper resizes checks) needs
  its own design; today they're seed-data-only.
- **A differentiated week-in-review** — if a Week surface returns, it must earn it:
  seven-day completion strip, week page-flipping, weekly totals. Not a subset of Today.
- **Paper texture, page-flip animation, hand-drawn ✓/✕ marks** — identity deepeners,
  all heavier than one night and none load-bearing.
- **Drag-to-reorder goals; archive/history for stopped templates.**
- **Streak/celebration mechanics beyond the existing pill.**
- **SQLite migration, export/print of pages.**
