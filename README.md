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
npm run web      # dev server in the browser
npm run ios      # build the native dev client and launch it in the iOS Simulator (needs Xcode + CocoaPods)
```

On an iPhone (needs Xcode, CocoaPods, and an Apple Developer team — see #1):

```bash
npx expo run:ios --device                   # build and install on a plugged-in iPhone
npx eas-cli build -p ios --profile preview  # installable internal build via EAS (npx eas-cli login first)
```

## On the Mac (desktop web app)

Every push to `main` deploys the web build to <https://patrick-k-oneill.github.io/daily-goals/>. Open it in Safari and choose **File → Add to Dock**: the pad launches as a standalone window with the app icon and the paper theme color, and the pad survives reload and relaunch.

Data is per browser until iCloud sync (#6). To move a pad between the phone and the Mac, use **Export** / **Import** in the Pad footer at the bottom of the Journal tab.

## Quality

```bash
npm run check       # commit-point gate: typecheck, lint + prettier on changed files, tests, react-doctor --scope changed
npm run check:all   # typecheck + lint + tests + format check, whole tree
npm run doctor      # react-doctor full scan
```

CI runs the same gates plus a web export build on every push and PR.

## Architecture

```
public/                # copied as-is into the web export: manifest.json, PWA icons
src/
  app/                 # expo-router routes (thin) and the static HTML shell (+html.tsx)
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
