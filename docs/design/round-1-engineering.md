# Daily Goals — Round 1 Engineering Notes

Implements every item of `round-1-spec.md` (P0-1 … P1-6). Verified live at
`http://localhost:8081` (desktop + 375pt, light + dark) on 2026-08-22.
Gates: `npm run check:all` green (6 suites / 50 tests, was 3 / 31),
`npx react-doctor@latest --scope changed` score 100, no new suppressions beyond
the one documented under P0-3.

---

## P0-1 · Goal rows hold their shape at phone width

**Changed:** `src/features/goals/logic.ts`, `src/features/goals/components/goal-row.tsx`,
`src/features/goals/logic.test.ts`.

- `logic.ts` gains the pure fit rule: `goalRowLayout(rowWidth, checkCount)` returns
  `'inline' | 'stacked'`, inline iff `checksGroupWidth(n) + 120 ≤ rowWidth`
  (`checksGroupWidth(n) = n × 28 + (n − 1) × 4`, exported alongside the
  `CHECK_BOX_SIZE` / `CHECK_BOX_GAP` constants, which must match the
  `check-box.tsx` / `goal-row.tsx` styles). An unmeasured row (`width ≤ 0`)
  reports inline — the desktop default — until `onLayout` fires.
- `GoalRow` measures itself with `onLayout` and branches. The row's pieces were
  extracted into `StarButton` / `ChecksGroup` / `TitleButton` so both layouts share
  one implementation. Inline JSX and styles are unchanged apart from removing
  `maxWidth: '60%'` from `styles.checks` (pixel-neutral at 720pt: the widest seeded
  group, 8 checks = 252pt, was already under 60% of the content column).
- Stacked = outer row `[star][flex column: title / checks]`, so the title (line 1)
  and the checks group (line 2) automatically share the left edge that checks have
  in inline rows. The star gets `marginTop: -2` in stacked to center its 28pt line
  box on the title's 24pt first line.

**ACs:** verified in browser at 375pt — 7-check "Daily Prod Blocks" stacks with all
boxes on one row, zero orphans (AC-1.1); "Fitness" keeps all 7 labeled boxes on one
row, labels attached above their boxes since `CheckBox` owns its label (AC-1.2);
desktop renders every seeded goal inline, checks before title (AC-1.3, screenshot
compared); 1-check rows inline at 320pt-equivalent widths (AC-1.4, unit test at
262pt row width); star renders on line 1, centered against it (AC-1.5); fit rule is
pure and exported (AC-1.6).

**Tests:** `logic.test.ts` "goal row fit rule" — 375/720-equivalent row widths
(317/678pt after page margins), the exact 340/339 boundary for 7 checks, the
narrow-viewport 1-check case, and the unmeasured-row default.

**Deviations:**

- The rule compares against the _full measured row width_ (star column included),
  exactly as the spec's formula reads. The 120pt min-title term over-covers the
  ~38pt of star + gaps, so the decision stays deterministic and errs toward
  stacking slightly early near the boundary — the safe direction.
- First paint at phone width renders inline for one frame until `onLayout`
  reports; chosen over blank-until-measured so desktop is never disturbed.

## P0-2 · Past pages don't materialize recurring goals

**Changed:** `src/features/goals/logic.ts`, `src/features/goals/store.ts`,
`src/features/goals/logic.test.ts`, `src/features/goals/store.test.ts` (new).

- `logic.ts`: pure `isCurrentPeriod(cadence, periodKey, today)` —
  `periodKeyFor(cadence, today) === periodKey` (AC-2.4).
- `store.ts` `ensurePeriod`: templates still seed on first run unconditionally;
  the `missingEntries` materialization now only runs when the viewed period is
  current. The store decides — callers (`GoalList`) are untouched and may call
  it for any page. Idempotence preserved (same `additions.length === 0` bailout).

**ACs:** store-level test proves flipping back 1–3 days and a past week adds zero
entries (AC-2.1; also verified live via localStorage — 11 entries before and after
paging); past pages render only stored entries and keep "+ Add goal", whose
`addGoal` path is period-scoped and unchanged (AC-2.2); current day/week/year still
materialize, idempotently (AC-2.3, tested); week-boundary (Sun 8/23 → Mon 8/24) and
New-Year rollovers unit-tested (AC-2.4).

**Tests:** `logic.test.ts` "isCurrentPeriod" (all cadences + boundaries);
`store.test.ts` "ensurePeriod" (materializes today, idempotent, zero entries for
past pages, seeds templates even when the first page viewed is a past one).
The store test mocks AsyncStorage with the package's own jest mock.

**Deviations:** none. Phantom entries already persisted (e.g. 8/19–8/20) remain,
as the spec directs.

## P0-3 · Events: visible remove, tap to edit

**Changed:** `src/features/events/logic.ts` (new), `src/features/events/store.ts`,
`src/features/events/components/upcoming-events.tsx`,
`src/features/events/logic.test.ts` (new).

- New pure `applyEventUpdate(events, id, patch)` in `logic.ts` with addEvent's
  trimming (`trimOptional` shared by both actions now); a patch that blanks the
  title is rejected wholesale and returns the input array untouched.
  `store.ts` gains `updateEvent(id, patch)` delegating to it (AC-3.5).
- `upcoming-events.tsx`: the add form was extracted into `EventForm({ initial,
submitLabel, onSubmit, onCancel })`, reused by both `AddEventRow` ("Add") and
  the new edit mode ("Save") — one form, not two (per spec). `EventRow` is now
  a row of [body pressable][× pressable]: the body opens the pre-filled form on
  tap and keeps the 400ms long-press remove as a native shortcut; the × is
  `textSecondary` at rest, `missed` on hover/press (react-native-web's `hovered`
  pressable state), 28pt box + 8pt hitSlop = 44×44pt effective, and invokes the
  existing `confirmAction` (AC-3.1, AC-3.2). Cancel discards the draft without
  ever touching the store (AC-3.4).

**Tests:** `events/logic.test.ts` — field updates with trimming, blank-title
no-op (same array reference back), blanked time/note collapsing to `undefined`,
untouched fields preserved, unknown ids ignored.

**Deviations / notes:**

- `EventForm` snapshots `initial` into `useState` — same intentional
  draft-snapshot pattern as `GoalRowEditor`, with the same react-doctor
  suppression and justification comment (the form mounts fresh per session).
- The date chips remain "next 7 days". Every existing event's date always falls
  inside them (events can only be created ≤6 days out), so an edited event's chip
  is always present; dates beyond that are P2-10's scope.

## P1-4 · Week tab removed

**Changed:** `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`,
`src/app/week.tsx`.

Both tab bars now declare exactly Today and Journal (AC-4.1, verified on web).
`week.tsx` is a `<Redirect href="/" />` so `/week` lands on Today — verified live,
no 404/blank (AC-4.2). No source references to the week route remain; lint,
typecheck, and `check:all` pass (AC-4.3). Weekly goals stay on Today, untouched.

## P1-5 · Dark mode keeps the rule lines

**Changed:** `src/constants/theme.ts` (one value), `src/constants/theme.test.ts`
(new), plus jest plumbing: `package.json` (`moduleNameMapper` for `.css`) and
`__mocks__/style-mock.js`, because `theme.ts` imports `global.css` and jest-expo
doesn't transform CSS.

`Colors.dark.rule`: `#2E4049` → `#3D5A69`. The suggested value was verified before
adoption: contrast vs `#171410` computes to ≈2.504:1, clearing the 2.5:1 floor.
The WCAG relative-luminance helper lives in the test file itself (test-only math,
per plan). Dark screenshots at desktop and 375pt show every goal-row and event-row
separator clearly (AC-5.2). `git diff` on `theme.ts` is exactly one line; the light
palette is byte-identical (AC-5.3).

**Tests:** `theme.test.ts` asserts `Colors.dark.rule` vs `Colors.dark.background`
≥ 2.5:1 (AC-5.1).

## P1-6 · Honest buttons, visible switch, reachable steppers

**Changed:** `src/features/goals/components/add-goal-row.tsx`,
`src/features/goals/components/goal-row.tsx` (editor),
`src/features/events/components/upcoming-events.tsx` (form).

- Add (add-goal, event form) and Save (goal editor, event form's Save mode)
  render at `opacity: 0.4` with `disabled` + `accessibilityState={{ disabled }}`
  while the trimmed title is empty; state is derived from the live draft so
  opacity restores/dims per keystroke (AC-6.1, AC-6.2).
- The repeats Switch gets `trackColor.false = theme.border`; `thumbColor` is set
  to `theme.text` on web only (an "ink" knob that contrasts both the border and
  accent tracks in both schemes), leaving native's platform knob alone (AC-6.3).
- All stepper −/+ buttons (add-goal + goal editor) get a 28pt min box, centered
  glyph at unchanged size, + existing 8pt hitSlop = 44×44pt effective (AC-6.4).

**Deviations:** the spec says "steppers in all three forms", but the add-event
form has no stepper (its only counter-like control is the date chip row); the
treatment was applied to the two forms that have steppers.

---

## Test & gate summary

- Tests: 31 → 50 (suites 3 → 6). New: `events/logic.test.ts`,
  `goals/store.test.ts`, `constants/theme.test.ts`; extended: `goals/logic.test.ts`.
- `npm run check:all`: exit 0 — typecheck, lint (0 errors / 0 warnings), jest,
  prettier all clean.
- `npx react-doctor@latest --verbose --scope changed`: 100/100, no issues.

## For QA to scrutinize

- P0-1 on a real iPhone in Expo Go: the one-frame inline→stacked settle on first
  paint, and stacked rows with the goal editor open/closed.
- P0-3 interaction flow end-to-end (tap-to-edit prefill, Save persistence, Cancel
  byte-identity, × → confirm on both platforms); browser-pane input events could
  not be driven in this pass, so only rendering was verified live.
- The × hover state relies on react-native-web's `hovered` pressable state —
  worth a quick mouse pass.
- P1-6 switch appearance on native iOS (web-only thumbColor fork).

---

# Defect fixes (round-1 QA report, D1–D4)

All four defects from `round-1-qa.md` fixed on top of the round-1 work.
Gates re-run after the fixes: `check:all` exit 0, react-doctor 100/100.
Tests: 50 → 54 (suites 6 → 7).

## D1 · Journal autosave tug-of-war (S2)

**Changed:** `src/features/gratitude/components/gratitude-editor.tsx` (rewritten),
`src/features/gratitude/store.test.ts` (new).

The editor is now fully controlled by the store: `EditorCard`, the local draft
state, the keyed remount, and the 600ms debounce are gone. `value` reads
`entries[reflectionDate]?.text ?? ''`; `onChangeText` calls
`saveEntry(reflectionDate, next)` directly. Two mounts of the same reflection
date (Today page + Journal) share one source of truth and stay in live sync —
there is no per-mount draft left to fight over. "Saved ✓" renders whenever the
text is non-empty, which is now literally true (zustand persist writes on every
set). `saveEntry`'s existing delete-on-empty behavior is kept.

**Verified live (web):** with both editors mounted (Today + Journal via
client-side tab nav), one simulated input in the Journal editor updated both
textareas instantly; the persisted entry was then sampled 3× over 8s —
identical text and `writtenAt` every time (the old loop cycled ~1.2s when
visible). Journal data was byte-restored after the probe.

**Tests:** `gratitude/store.test.ts` pins the store contract — sequential
`saveEntry` calls keep only the latest text, emptied/whitespace text removes
the entry, other dates untouched. (These pass against the store as-is: the
defect lived in the component's debounced effect, which component-level tests
are out of scope to cover; the live two-mount sync was verified in-browser.)

## D2 · hitSlop is a no-op on react-native-web (S3)

**Changed:** `src/features/goals/components/add-goal-row.tsx`,
`src/features/goals/components/goal-row.tsx`,
`src/features/events/components/upcoming-events.tsx`.

The stepper −/+ buttons and the event-row × now have **real 44×44pt boxes**
(`minWidth`/`minHeight: 44`), with negative margins (−7/−8 vertical, −8
horizontal) so their layout footprint — and therefore the visual density of
the forms and event rows — is identical to before. Glyph sizes unchanged. The
now-redundant `hitSlop={8}` was removed from these controls. Where the ×
overhangs the row body it wins hit-testing as the later sibling.

**Verified live (web):** both stepper buttons' DOM boxes measure exactly
44×44 via `getBoundingClientRect`. (An `elementFromPoint` edge-probe needs a
visible browser pane, which this session's pane wasn't — QA should re-probe;
the DOM box itself is what web hit-testing uses.)

## D3 · 402pt real-device width gap (S3)

**Changed:** `src/features/goals/logic.ts` (one constant),
`src/features/goals/logic.test.ts`.

`MIN_INLINE_TITLE_WIDTH` 120 → 160. At a 402pt viewport (row ≈ 344pt) a
7-check goal now stacks (220 + 160 > 344); at desktop rows (~650–678pt) every
seeded goal (1–8 checks, and even the 10-check max) stays inline; the 1-check
inline guarantee holds down to 320pt viewports (188 ≤ 262). TDD: the 344pt
case was written first and watched fail against the old constant.

**Intentional consequence:** 6-check goals ("Weekly Prod") now also stack at
375–402pt (188 + 160 > 317/344) — previously inline at 375 with a ~120pt
title squeeze. Verified at 375pt: the page reads consistently, every
multi-check goal stacked, single-check inline. No AC pinned 6-check inline at
phone widths; desktop is unchanged (screenshot-verified).

**Tests:** new 344pt case; boundary test moved to 380/379; desktop assertions
extended to cover both 650 and 678pt row widths.

## D4 · Star centering on wrapped inline titles (S4)

**Changed:** `src/features/goals/components/goal-row.tsx`.

The inline row measures its title height (`onLayout` on the title pressable).
When the title wraps (> 1.5 × the 24pt line height) — the only case where the
title is the row's tallest child and the old `alignItems: 'center'` centered
the star against the whole block — the star switches to the shared
`starFirstLine` style (`alignSelf: 'flex-start'`, `marginTop: -2`), centering
its 28pt line box on the title's first 24pt line exactly. Single-line inline
rows keep today's correct centered layout (this matters for labeled-check
rows, where a static flex-start star would sit ~9pt high). Stacked rows
already used `starFirstLine` and are unchanged.

## Defect-fix gate summary

- Tests: **50 → 54** (suites 6 → 7; new `gratitude/store.test.ts`, extended
  `goals/logic.test.ts`).
- `npm run check:all`: exit 0.
- `npx react-doctor@latest --verbose --scope changed`: **100/100, no issues**
  (the D1 rewrite also removed the editor's keyed-remount/derived-state
  pattern entirely).

## For QA (defect-fix round)

- D2 edge probe (`elementFromPoint` 4px above a stepper glyph) with a visible
  browser pane, plus a mobile-web fat-finger pass.
- D1 on native: two editors don't co-mount there (tabs unmount), but confirm
  typing feels fine with per-keystroke persistence (no debounce anymore), incl.
  a long entry on an older device.
- D3 on the iPhone 17 Pro simulator: weekly 7-check rows should now stack at
  402pt.
- D4: add a long-titled 1-check goal at 375pt — star should ride line 1; check
  a labeled inline row (Fitness at desktop) still centers as before.
