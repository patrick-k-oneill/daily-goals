# Manual testing

CI and `npm run check` judge the code; a manual test judges the app. `/p-test` plans and runs one and records the verdicts on the PR; `/p-ready` refuses to merge a device change without them.

## Which PRs

Sort the PR by its changed files (`gh pr diff <num> --name-only`):

- **Device**: needs a real iPhone and iPad and a verdict comment before merge. `modules/`, `app.json`, `eas.json`, a native dependency added to `package.json`, `src/features/sync/`, `src/lib/haptics.ts`, or any file that imports a device API (iCloud, haptics, files, sharing).
- **Screen**: a change a person can see. The iOS Simulator is enough; the verdict comment is welcome, not gating.
- **Neither**: logic, tests, docs, CI. No manual test.

## The plan

Numbered steps, first from the issue's acceptance list, then scoped regressions: one step per changed screen or feature, exercising it as it worked before. One line per step: the action, naming the device, an arrow, the expected result.

```
1. iPhone: tap a check on today's page → the iPad shows it checked within a minute.
2. Both in airplane mode; iPhone adds a goal, iPad checks another; both back online → both devices show both changes.
```

A step is concrete when the runner never has to guess what to tap or what counts as done. An acceptance item that spans devices or states becomes one step per observation.

## Verdicts

Per step: **PASS**, **FAIL** or **BLOCKED**, with one line of evidence: what was seen and how long it took, a screenshot name, or why the step could not run. A FAIL is re-run once before it counts; a real FAIL carries the smallest repro.

The run is one comment on the PR:

```
## Manual test 2026-09-27

Build TestFlight 1.0.0 (8) from a1b2c3d · iPhone 15 Pro, iOS 27.0 · iPad Air, iOS 27.0

1. iPhone: tap a check on today's page → the iPad shows it within a minute. **PASS** 14 s.
2. Both in airplane mode … → both show both changes. **FAIL** the iPad kept its page. Repro: …
3. iPad: delete the app, reinstall, open → the whole pad is back. **BLOCKED** iPad not signed into iCloud.

Verdict: FAIL
```

The last line is the run's verdict: `PASS` when every step passed, `FAIL` when any failed, otherwise `BLOCKED`. A later run is a new comment and the newest counts. The commit in the build line is what was tested; the verdict is stale once a later push touches a device path.

## Getting the build on device

A JS-only change reaches an installed dev client through Metro. A change under `modules/`, to `app.json` or to a native dependency needs a fresh build from a clean prebuild (`npx expo prebuild --clean`). Before installing anything over the daily-use iPhone, export the pad (Journal tab → Pad footer → Export pad…).

Build from a checkout of the PR's branch; if the main checkout is on another branch, use a worktree.

### Iterating: a dev client on the iPad or the Simulator

`npx expo run:ios --device` builds, signs and installs on a plugged-in device, chosen from its list; `npm run ios` targets the Simulator. Reloads and logs come from Metro (`npx expo start --dev-client`). Once per device: iOS Developer Mode (Settings → Privacy & Security → Developer Mode) and an Apple ID on the team signed in to Xcode (Xcode → Settings → Accounts). The iPad is the iterating device; the iPhone carries the daily pad.

### Acceptance on both devices: TestFlight

One build, installed on both from the TestFlight app, replacing the app in place with its data kept:

```
npx eas-cli build -p ios --profile production --auto-submit
```

Around 15 minutes to build plus 10–15 of App Store Connect processing, then TestFlight offers the new build number on both devices. The verdict's build line names that number and the commit it was built from (`npx eas-cli build:list -p ios --limit 3` shows both).

EAS `preview` (internal distribution) is the alternative when a PR build should stay out of TestFlight: each device registered once with `eas device:create`, then a build after registering. No device is registered today.
