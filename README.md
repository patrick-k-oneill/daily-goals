# Daily Goals

A digital legal pad. Every morning, on paper, I write the day's goals under an underlined **Daily Goals** header, keep **Weekly Goals** with rows of checkboxes, jot upcoming events at the bottom of the page — and write a **Gratitude Journal** entry about the previous day. This app is that ritual, as software.

Built with Expo (React Native + TypeScript), one codebase for **web, iOS, and Android**.

## Features

- **The pad page** — Today mirrors the paper layout top to bottom: date at the top-left, centered underlined headings, Daily → Weekly → Annual goal categories, upcoming events, and the gratitude journal at the bottom. Recurring goals materialize onto each new page automatically; one-offs are written per page.
- **Edit in place** — tap any goal title to rename it, resize its checks, or remove it. Edits to a recurring goal carry into future pages.
- **Pad-style checks** — a goal can have multiple checkboxes (e.g. `Daily Prod` ×8). Taps cycle blank → ✓ done → ✕ missed, like pen marks. Star the day's key goal and it floats to the top.
- **Gratitude Journal** — written each morning _about yesterday_, exactly like writing on the previous day's page. Autosaves, tracks the streak, keeps history.
- **Upcoming events** — quick jottings ("Sun 8/23: IRC @ 4pm–5:30pm") on the Today page.
- **Legal-pad look** — warm paper, blue rule lines, red margin, handwriting headers. Light and dark.

## Getting started

```bash
nvm use          # Node 22 (≥ 20.19.4 required)
npm install
npm run web      # or: npm run ios / npm run android
```

## Quality

```bash
npm run check       # commit-point gate: typecheck, lint + prettier on changed files, tests, react-doctor --scope changed
npm run check:all   # typecheck + lint + tests + format check, whole tree
npm run doctor      # react-doctor full scan
```

CI runs the same gates plus a web export build on every push and PR.

## Architecture

```
src/
  app/                 # expo-router routes (thin)
  components/ui/       # design-system primitives (Screen, SectionHeader, inline form kit)
  constants/theme.ts   # design tokens — paper palette, spacing
  features/
    goals/             # templates, per-period entries, check transitions, row geometry
    gratitude/         # journal entries, streaks
    events/            # upcoming-event jottings
  hooks/               # color scheme / theme
  lib/                 # dates & period keys, live clock (useToday), persistence config, platform shims
```

Each feature owns its `types.ts`, a pure `logic.ts` core (every transition and query, unit-tested at that interface), a thin zustand `store.ts` (one action per transition, persisted via AsyncStorage), and `components/`. Persistence is configured in one file (`src/lib/persisted-store.ts`), and the root layout waits for every store to rehydrate before the first paint. The domain language lives in `CONTEXT.md`; decisions in `docs/adr/`.
