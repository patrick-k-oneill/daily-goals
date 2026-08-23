# Daily Goals — Round 2 Engineering Notes

Implements `round-2-spec.md`: all three P1s plus two of the three P2s (P2-4 star
settle, P2-5 masthead dedup; P2-6 skipped per direction). Verified live on web
(`localhost:8081`, desktop + 375pt) and on the iPhone 17 Pro simulator in Expo
Go (402pt, light and dark). Gates: `npm run check:all` exit 0
(7 suites / 59 tests, was 54), react-doctor `--scope changed` 100/100.

---

## P1-1 · Native tab bar in the app's ink

**Changed:** `src/components/app-tabs.tsx`, `src/constants/theme.ts`
(`BottomTabInset` iOS value only).

The SDK 57 native-tabs API was read from
`node_modules/expo-router/build/native-tabs/types.d.ts`: `NativeTabs` accepts
`tintColor` (→ `tabBarTintColor`, the source of the system blue),
`iconColor={{ default, selected }}` (→ per-tab `iconColor`/`selectedIconColor`),
and split `labelStyle={{ default, selected }}`. All four now use theme tokens:
selected icon + label in `text`, unselected in `textSecondary`, on the existing
`backgroundElement` indicator. No hardcoded hex (AC-1.3); tokens flip with the
scheme (AC-1.1 light + dark, verified by simulator screenshots — no system blue
anywhere). Unselected stays visibly quieter (AC-1.2).

`BottomTabInset` iOS: 50 → 68 — the iOS 26 floating pill is taller than the
classic bar the old value assumed. At max scroll on Today the gratitude card's
bottom edge now clears the pill by ≈34pt ≥ 16pt (AC-1.4, screenshot-measured).
Expo Go only, no native modules (AC-1.5).

## P1-2 · One rhythm per section

**Changed:** `src/features/goals/logic.ts`, `src/features/goals/logic.test.ts`,
`src/features/goals/components/goal-list.tsx`,
`src/features/goals/components/goal-row.tsx`.

New pure `goalListLayouts(rowWidth, checkCounts[]) → GoalRowLayout[]`: if any
multi-check (≥2) row resolves stacked at the width, every multi-check row in
the list stacks; 1-check rows are always inline (AC-2.1). TDD — the tests
(344pt native, 317pt web, 650/678pt desktop, the mixed `[7, 7, 6]` case, the
380/379 harmonization boundary, empty list, unmeasured width) were written
first and failed on the missing export.

`GoalList` now measures itself once (`onLayout`) and passes each row its
layout; `GoalRow` lost its own width measurement and takes a `layout` prop —
one measurement per list instead of one per row (AC-2.5). The title-height
measurement for the round-1 star fix is untouched.

Verified: at 402pt (simulator) the Weekly section renders "Recurring Dailies"
(7), "Fitness" (7 labeled), and "Weekly Prod" (6) all stacked — no mixed
reading order (AC-2.2); the daily 1-check row stays inline beside a stacked
8-check row at 375/402pt (AC-2.4); desktop is all-inline, unchanged (AC-2.3).

## P1-3 · The Journal calendar stops fibbing

**Changed:** `src/features/gratitude/components/journal-calendar.tsx`,
`src/features/gratitude/components/gratitude-editor.tsx`,
`src/app/journal.tsx`, `src/components/ui/screen.tsx`.

- `Screen` gains an optional `scrollRef` pass-through to its ScrollView; the
  route stays thin. Tapping the current reflection date clears any selection
  and scrolls the page to the top, where the main editor sits — no second
  editor, no dead highlight (AC-3.1). The scroll is deliberately
  `animated: false`: a smooth scroll gets canceled when the catch-up editor
  unmounts and the browser clamps the shortened page (found live; y=0 is valid
  at any height, so the instant jump is race-free on both platforms).
- The editor forks its placeholder: only the current morning shows the example
  prompt; any other reflection date gets "Nothing written for this morning
  yet…" — this also covers flipped-back Today pages (AC-3.2). Stored text
  always wins over placeholders.
- Unwritten days render only their number (dot removed — blank means blank);
  written days keep the accent ✓; cell `minHeight: 44` and grid geometry
  untouched (AC-3.3).
- Today's number renders in `accent`, distinct from the muted future days, and
  stays non-pressable; its accessibility label gains ", today" (AC-3.4).
- Verified identical on web and native (AC-3.5, screenshots both platforms;
  AC-3.1/3.2 exercised live on web: scroll lands at 0 with and without a
  catch-up editor open, selection count 0, one editor mounted).

## P2-4 · Settle the star (native)

**Changed:** `src/features/goals/components/goal-row.tsx` (StarButton).

`LayoutAnimation.configureNext(easeInEaseOut)` before `toggleStar`, native
only (web keeps the instant move per spec, and LayoutAnimation is a web no-op
anyway). Exercised twice on the simulator (star bottom row → floats to top;
unstar → returns): both reorders landed in the correct final layout with zero
visual corruption on Fabric/RN 0.86 in Expo Go — no misbehavior, so the
animation stays. Honest caveat: the 300ms transition itself could not be
frame-captured through the screenshot pipeline (~1s round trip); QA should
eyeball the settle on the live simulator (AC-4.1). No new dependencies
(AC-4.2).

react-doctor's `rn-prefer-reanimated` flags any LayoutAnimation import; the
suppression is documented inline: this is a Core-Animation-driven (not
JS-thread) one-shot settle on a discrete tap, and Reanimated layout
transitions would wrap every row in `Animated.View` and also animate the
width-driven stack/inline re-harmonization, which must stay instant.

## P2-5 · Web masthead dedup

**Changed:** `src/components/app-tabs.web.tsx`.

The top-bar wordmark is now a ★ monogram in the `margin` red (the spec's
alternative), keeping the bar's left-anchor/right-tabs balance. "Daily Goals"
renders exactly once above the fold on Today (AC-5.1, screenshot-verified at
375pt and desktop).

## P2-6 · Events beyond next week

**Skipped** per direction (demoted in the spec; data may never demand it).

---

## Test & gate summary

- Tests: **54 → 59** (7 suites; `goals/logic.test.ts` gained the
  `goalListLayouts` block, TDD red-first).
- `npm run check:all`: exit 0 (typecheck, lint 0/0, jest, prettier).
- `npx react-doctor@latest --verbose --scope changed`: **100/100** (one new
  documented suppression, see P2-4).
- Nothing committed; dev server untouched.

## For QA (round 2)

- P1-1 on device/simulator in both schemes: any remaining blue anywhere in the
  tab bar (badges were not styled — the app uses none).
- P2-4: eyeball the star settle on iOS (the one thing this pass could not
  frame-capture); confirm no double-animation when starring during a page flip.
- P1-2: resize the web window across ~500–560px — the whole section should flip
  rhythm together, never row-by-row.
- P1-3: reflection-date tap from deep scroll on native (instant jump — feels
  okay?); catch-up placeholder on a flipped-back Today page.
- BottomTabInset on a non-Pro device size (SE-class) — 68 was tuned on the
  17 Pro's pill.
