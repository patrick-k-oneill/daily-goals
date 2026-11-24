# Daily Goals

A digital legal pad. Every morning, on paper, I write the day's goals under an underlined **Daily Goals** header, keep **Weekly Goals** with rows of checkboxes — and write a **Gratitude Journal** entry about the previous day. This app is that ritual, as software. On the App Store it is listed as **Actualize: Daily Goals** with the tagline _become your ideal_; in hand it stays Daily Goals.

Built with Expo (React Native + TypeScript), one codebase for **web, iOS, and Android**.

## Features

- **The pad page** — Today mirrors the paper layout top to bottom: date at the top-left, centered underlined headings, Daily → Weekly → Annual goal categories, and the gratitude journal at the bottom. Recurring goals materialize onto each new page automatically; one-offs are written per page.
- **Edit in place** — tap any goal title to rename it, resize its checks, or remove it. Edits to a recurring goal carry into future pages.
- **Pad-style checks** — a goal can have multiple checkboxes (e.g. `Daily Prod` ×8). Taps cycle blank → ✓ done → ✕ missed, like pen marks. Long-press a goal's title and drag it to reorder its section.
- **Gratitude Journal** — written each morning _about yesterday_, exactly like writing on the previous day's page. Autosaves, tracks the streak, keeps history.
- **One pad on every device** — the iPhone and iPad apps keep the pad in iCloud Drive and merge changes line by line, so edits made offline on each device are all kept.
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
npx eas-cli build -p ios --profile production --auto-submit  # TestFlight build; installs from the TestFlight app and updates in place
```

## On the Mac

Two ways to run the pad on a Mac.

### The iPad app (Apple silicon)

The iPad build runs on an Apple silicon Mac as a Designed for iPad app, installed from TestFlight like the iPhone and iPad builds. It keeps the same iCloud pad.

Supported:

- **Window.** Resizes from the narrowest window to full screen; the page stays a pad-width column, centred.
- **Appearance.** Follows the macOS Light and Dark setting as it changes, with no relaunch.
- **Pointer.** Goal lines, checks, switches, buttons and text controls respond under the pointer.
- **Keyboard.** Return saves a form, or moves to the next check label. In the gratitude entry, Tab indents a bullet and Shift+Tab steps it back. **View → Zoom In** (⌘+) and **Zoom Out** (⌘−) set the text size from 100% to 200%, kept across launches.
- **Data.** iCloud sync, Reminders suggestions, export and import.

Not supported:

- **⌘1 / ⌘2.** The app is one page, so there are no tabs to switch.
- **⌘0.** Zoom has no reset; step back with ⌘−.
- **Esc.** It cancels a form only in the web app; here, click Cancel.
- **A hand cursor.** The pointer stays an arrow over controls, as in other Mac apps.
- **Haptics.** Silent on a Mac.

### The web app

Every push to `main` deploys the web build to <https://patrick-k-oneill.github.io/daily-goals/>. Open it in Safari and choose **File → Add to Dock**: the pad launches as a standalone window with the app icon and the paper theme color, and the pad survives reload and relaunch.

The web build has no iCloud. To move a pad between the phone and the Mac, use **Export data** / **Import data** in Settings.

## Release

Native releases run as [EAS Workflows](https://docs.expo.dev/eas/workflows/get-started/) in `.eas/workflows/`, iOS only. Each run fingerprints the project and looks for a build with that fingerprint: found, it publishes an EAS Update to it; not found (a native dependency, a config plugin, a change to `app.json` or `eas.json`), it builds.

- **preview**: every push to `main` publishes an update on the `preview` channel, or builds a new preview. A preview is a simulator build: no device listens on this channel, since every build shares one bundle id and one iCloud pad.
- **production**: every `v*` tag publishes an update on the `production` channel, or builds for production and submits to TestFlight. The run fails first if the tag is not `v` + `version` from `app.json`.

To cut a release, merge the `version` bump to `main` and tag that commit:

```bash
git tag v1.0.1 && git push origin v1.0.1
```

`version` is left out of the fingerprint (`fingerprint.config.js`), so a tag whose only native change is the version ships as an update to the build already installed.

## Quality

```bash
npm run check       # commit-point gate: typecheck, lint + prettier on changed files, tests, react-doctor --scope changed
npm run check:all   # typecheck + lint + tests + format check, whole tree
npm run doctor      # react-doctor full scan
```

CI runs the same gates plus a web export build on every push and PR.

## Architecture

```
modules/icloud-pad/    # local Expo module: the pad directory in the iCloud container (Swift)
modules/zoom-menu/     # local Expo module: Zoom In / Zoom Out in the Mac's View menu (Swift)
public/                # copied as-is into the web export: manifest.json, PWA icons
src/
  app/                 # expo-router routes (thin) and the static HTML shell (+html.tsx)
  components/ui/       # design-system primitives (Screen, page header, popover, settings list, inline form kit)
  constants/theme.ts   # design tokens — paper palette, spacing
  features/
    goals/             # templates, per-period entries, check transitions, row geometry
    gratitude/         # journal entries, streaks
    backup/            # the pad file (export / import) and the storage footprint
    sync/              # the cloud pad layout and the pull / push engine over iCloud Drive
    feedback/          # a note from Settings, filed as a GitHub issue
    text-size/         # the text size: the system's font scale times the Mac's zoom
  hooks/               # color scheme / theme
  lib/                 # dates & period keys, live clock (useToday), persistence config, merge, platform shims
```

Each feature owns its `types.ts`, a pure `logic.ts` core (every transition and query, unit-tested at that interface), a thin zustand `store.ts` (one action per transition, persisted via AsyncStorage), and `components/`. Persistence is configured in one file (`src/lib/persisted-store.ts`), and the root layout waits for every store to rehydrate before the first paint. The domain language lives in `CONTEXT.md`; decisions in `docs/adr/`.
