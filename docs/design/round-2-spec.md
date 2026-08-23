# Daily Goals — Design Review & Spec, Round 2

Reviewed 2026-08-23 against the round-1 working tree: live web at `http://localhost:8081`
(desktop light/dark, 375pt mobile, force-reloaded) and — the pass deferred from round 1 —
native iOS in Expo Go on the iPhone 17 Pro simulator (402×874pt, light). Round-1
engineering and QA notes were read first; every verdict below was re-verified against the
running app, not taken from the reports.

---

## 1. Round-1 verdict

**Round 1 landed.** All six items are visibly, behaviorally in place, and the app is
dramatically better for them. Per item:

| Item                                     | Verdict    | Evidence                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1 Goal rows hold shape at phone width | **Landed** | 375pt web: 7-check "Daily Prod Blocks" and labeled "Fitness" stack cleanly — title line 1, all boxes on one row below, shared left edge, zero orphans. Desktop byte-for-byte the old inline look. The D3 follow-up (6-check goals also stacking at 375pt) was the right call: the page now has _one_ rhythm per width and reads better than the spec's minimum. Native 402pt exposes a residual seam — see new item 2. |
| P0-2 Past pages don't materialize        | **Landed** | Flipped today → 8/22 → 8/19 → 8/18: store entry count pinned at 13 the whole way; 8/18 renders the honest "Nothing written on this page yet."; 8/22 preserved its star and ✓ exactly. The blank past page _feels_ right — like paper.                                                                                                                                                                                  |
| P0-3 Events: visible ×, tap to edit      | **Landed** | × on every row with a proper accessibility label ("Remove R2 test event"), confirm-gated, store-verified removal; tapping the row body opens the same form pre-filled with **Save**; Cancel discards. The convention now matches goals.                                                                                                                                                                                |
| P1-4 Week tab removed                    | **Landed** | Web top bar and native pill both show exactly Today + Journal; `/week` redirects to Today. Nothing of value was lost — nobody will miss it.                                                                                                                                                                                                                                                                            |
| P1-5 Dark rules                          | **Landed** | Dark Today at desktop: every goal-row and event-row separator discernible; the pad identity survives the theme now (2.504:1, token-only change).                                                                                                                                                                                                                                                                       |
| P1-6 Honest forms                        | **Landed** | Add renders dimmed until a real title exists (web + native); off-state switch shows a visible track on both platforms; steppers/× have real 44pt boxes on web after D2.                                                                                                                                                                                                                                                |

**The defect round deserves its own credit:** what I had filed as a P2 "dead-tap" turned
out to be masking real data loss (D1, two mounted editors fighting over one entry), and the
fix — a fully store-controlled editor — is _better design_ than what I would have specced:
both editors now update live in sync, and "Saved ✓" is literally true on every keystroke.
D2 (hitSlop inert on web) and D3 (the 402pt gap) were exactly the kind of
reality-vs-simulator findings that make the ACs mean something.

Residual, accepted: the one-frame inline→stacked settle on first paint (never captured in
any screenshot), and QA's O2 (checkbox block-centering in a wrapped inline title — rare,
cosmetic).

---

## 2. What the native pass found

The app on iOS is close — safe areas respected, Caveat renders beautifully, the stacked
rows are clean, check taps feel right, the native editor and add-goal forms sit well at
402pt. Three things fail the eye:

1. **The selected tab is iOS system blue.** (Native, both tabs, always visible.) The
   Today checklist icon and the Journal book icon render in default UIKit blue when
   selected — the single loudest palette violation left anywhere in the app, sitting on
   its most persistent surface. `app-tabs.tsx` styles the label and indicator but never
   the icon tint. On a warm-paper app whose identity is ink, rule-blue, and margin-red,
   system blue reads like a sticker someone forgot to peel off.

2. **The weekly section mixes reading orders at 402pt.** "Recurring Dailies" (7 checks)
   and "Fitness" (7, labeled) stack — title first. "Weekly Prod" (6 checks) legitimately
   fits inline at 402pt (QA's O1) and renders checks-first, sandwiched directly beneath
   two title-first rows. The per-row fit rule is locally correct and globally wrong: a
   section should read in one rhythm, not flip orientation row by row. (Web 375pt doesn't
   exhibit this — everything multi-check stacks there — which is exactly why it reads so
   well.)

3. **Content barely clears the floating tab pill.** At max scroll on Today, the gratitude
   card's bottom edge passes within ~2pt of the pill — functionally clear, visually
   pinched. `BottomTabInset` (iOS 50) predates the taller iOS 26 floating pill.

Carried from round 1 and still true (verified on both platforms this round):

4. **The Journal calendar fibs.** Tapping the current reflection date (the day you'd most
   plausibly tap) highlights the cell and shows nothing — its editor is above the fold
   with no scroll or signal connecting them. The catch-up editor for a past day shows the
   example placeholder ("Amy, Leto, sharing a great night…") that reads, at a glance, as a
   written entry. Every unwritten day carries a dot (31 of them on native's empty month —
   pure noise), and today is indistinguishable from future days.

Smaller notes, not specced: the gratitude card's fixed 140pt minimum leaves a large void
under two-line entries; the web masthead still says "Daily Goals" 60px above the "Daily
Goals" page heading; keyboard-avoidance couldn't be exercised (simulator has a hardware
keyboard attached — worth one manual check on a device).

---

## 3. Spec

**No P0s remain.** Three P1s, one overnight pass, and after them I expect only P2 polish
— round 3 should be a verification pass, and this loop is near its end. Same constraints:
theme tokens only, pure logic in `logic.ts` + tests, no new dependencies, Expo Go safe.

---

### P1-1 · The native tab bar writes in the app's ink

**Rationale:** System-blue selected icons violate the sacred palette on every native
screen; the pill also crowds the last line of the page at max scroll.

**Intended behavior:** The native tab bar uses only theme tokens: selected icon + label in
`text` (matching the web tab treatment — ink on a `backgroundSelected` indicator), no
UIKit blue anywhere, in light and dark. Bottom clearance grows so the page's last element
breathes above the floating pill. Expected touch points: `src/components/app-tabs.tsx`
(NativeTabs icon/tint styling — consult the SDK 57 native-tabs docs for the exact prop;
`labelStyle`/`indicatorColor` siblings exist already) and `src/constants/theme.ts`
(`BottomTabInset` iOS value only).

**Acceptance criteria**

- AC-1.1 On iOS (light and dark), the selected tab's icon and label render in the theme's
  `text` color; no element of the tab bar renders in system blue on either tab.
- AC-1.2 Unselected tabs keep a quieter treatment (`textSecondary` or the current ink),
  visually distinct from the selected tab.
- AC-1.3 `app-tabs.tsx` contains no hardcoded hex values — tokens only.
- AC-1.4 At max scroll on Today and on Journal (iPhone 17 Pro), the last element's bottom
  edge clears the tab pill's top edge by ≥ `Spacing.three` (16pt), via the
  `BottomTabInset` token only.
- AC-1.5 App still runs in Expo Go (no native modules, no config plugins).

---

### P1-2 · One rhythm per section

**Rationale:** At 402pt the weekly list renders stacked, stacked, inline — adjacent rows
flip between title-first and checks-first reading order. The fit rule should be decided
per list, not per row, so a section reads as one block the way it does on paper.

**Intended behavior:** Within one `GoalList`, if any multi-check row (≥ 2 checks) resolves
stacked at the current width, every multi-check row in that list renders stacked.
Single-check rows always render inline. Desktop remains all-inline. The decision is a pure
function of the measured list width and the list's check counts — e.g.
`goalListLayouts(rowWidth, checkCounts[]) => mode[]` in `src/features/goals/logic.ts`,
consumed by `GoalList`/`GoalRow` (one width measurement per list is acceptable and
preferable to per-row divergence).

**Acceptance criteria**

- AC-2.1 Pure exported function in `logic.ts`: given a row width and the list's check
  counts, returns per-row modes where one stacked multi-check row forces all ≥2-check rows
  in the list to stacked; 1-check rows are always inline. Unit tests cover ~344pt (native
  402pt content), ~317pt (web 375pt), and ~650–678pt (desktop) widths, including the
  mixed-counts case [7, 7, 6] → all stacked at 344pt.
- AC-2.2 On iPhone 17 Pro (402pt), the seeded Weekly section renders "Recurring Dailies"
  (7), "Fitness" (7 labeled), and "Weekly Prod" (6) all stacked — no checks-first row
  adjacent to title-first rows.
- AC-2.3 At desktop width, every seeded goal renders inline, unchanged.
- AC-2.4 A 1-check row (daily "Recurring Dailies") renders inline at 375pt, 402pt, and
  desktop, even when its list also contains stacked rows.
- AC-2.5 `npm run check:all` passes; no component measures more than once per layout pass
  beyond what exists today.

---

### P1-3 · The Journal calendar stops fibbing

**Rationale:** The calendar's only rewarding tap is a dead one, its catch-up editor
masquerades example text as content, and 25+ dots mark nothing. Honesty is the pad's whole
premise.

**Intended behavior:**

- Tapping the current reflection date scrolls the Journal page so the main editor is fully
  in view (no second editor, no dead highlight). `Screen` may expose an optional scroll
  ref for this; keep routes thin.
- The catch-up editor (selected day ≠ current reflection date) uses a neutral placeholder:
  "Nothing written for this morning yet…". The current-morning editor keeps the example
  prompt.
- Unwritten past days render no dot — blank means blank. Written days keep the accent ✓.
  Cell geometry (44pt minimum target, grid alignment) is unchanged.
- Today's cell gets a quiet marker distinguishing it from future days (e.g. its number in
  `accent` or a `backgroundSelected` ring) — still non-selectable.

Touched: `src/features/gratitude/components/journal-calendar.tsx`,
`gratitude-editor.tsx` (placeholder fork by date), `src/app/journal.tsx`,
`src/components/ui/screen.tsx` (optional ref pass-through).

**Acceptance criteria**

- AC-3.1 On Journal, tapping the current reflection date's cell scrolls the page to bring
  the main editor fully into view; no duplicate editor renders; no cell is left in a
  selected state afterward.
- AC-3.2 Selecting a past day whose entry is empty shows the catch-up editor with the
  neutral placeholder; the current-morning editor still shows the example prompt; a past
  day _with_ an entry shows its real text.
- AC-3.3 Unwritten past days show only their day number (no dot); days with entries show
  the accent ✓; the month grid's row heights and tap targets are unchanged.
- AC-3.4 Today's cell is visually distinct from future days in light and dark, using theme
  tokens only, and remains non-pressable.
- AC-3.5 All copy changes appear on web and native identically.

---

### P2 — polish, only if time remains

- **P2-4 Settle the star** (carried): native LayoutAnimation on the reorder; web may keep
  the instant move (AC-4.1: starring a mid-list goal on iOS visibly transitions; AC-4.2:
  no new dependencies).
- **P2-5 Web masthead dedup** (carried): drop the "Daily Goals" wordmark from the web top
  bar or reduce it to a ★ monogram in `margin` red (AC-5.1: the string "Daily Goals"
  renders once above the fold on Today).
- **P2-6 Events beyond next week** (carried, demoted in urgency): the 7-day chip row plus
  a "Later…" affordance reusing `monthGrid` (AC-6.1: an event 3 weeks out can be created
  and lists correctly). The paper pad rarely jots further than a week ahead — data may
  never demand this.

Dropped from round 1's P2 list: nothing else; the remaining round-1 P2s are all
represented above.

---

## 4. Out of scope (deliberately deferred)

- **Cross-device sync** — web and native keep separate stores (native still shows the
  seed "Daily Prod" ×8 while web has the renamed ×7). A real problem eventually; a storage
  project, not a design pass.
- **Per-check label editing UI** (unchanged from round 1).
- **Keyboard-avoidance audit on a physical device** — the simulator's hardware keyboard
  hid the software keyboard this round; one manual pass when convenient.
- **Gratitude card void** (fixed 140pt minimum) — worth revisiting only if the journal
  gets attention for other reasons.
- **Paper texture, page-flip animation, hand-drawn marks; drag-to-reorder; streak
  mechanics; SQLite/export** (unchanged).

---

## 5. How close is done?

Close. Round 1 removed everything I'd call broken or dishonest; what's left is one
identity violation (system blue), one rhythm seam (402pt mixed rows), and one
honesty pass on the calendar — all small, all token/logic-level. If round 3 verifies
these three and finds nothing new on a physical-device keyboard pass, I'd call this
app beautiful and done for now, and I'd say so in one paragraph rather than invent a
round 4.
