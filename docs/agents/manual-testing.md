# Manual testing

CI and `npm run check` judge the code; a manual test judges the app. `/p-test` plans and runs one and records the verdicts on the PR; `/p-ready` refuses to merge a device change without them.

## Which PRs

Sort the PR by its changed files (`gh pr diff <num> --name-only`):

- **Device**: needs a real iPhone and iPad and a verdict comment before merge. `modules/`, `app.json`, `eas.json`, a native dependency added to `package.json`, `src/features/sync/`, `src/lib/haptics.ts`, or any file that imports a device API (iCloud, haptics, files, sharing).
- **Screen**: a change a person can see. The iOS Simulator is enough; the verdict comment is welcome, not gating.
- **Neither**: logic, tests, docs, CI. No manual test.

## The plan

The plan is a checklist in the PR body, where Patrick ticks his place as he runs it. Model: [PR #104](https://github.com/patrick-k-oneill/daily-goals/pull/104).

- **Know before testing** comes first: a few bullets on what would surprise the runner, such as data a step changes for good or what a build replaces.
- **A part per place it runs**, in the order each can start, its heading saying what it waits on: `## Part A: Simulator (ready now)`, `## Part B: Devices (needs TestFlight build 4)`. The commands that get that build running sit under the heading in a code fence.
- **A `###` group per feature**, its issues in the heading: `### Reorder (#86)`. Steps come first from the issue's acceptance list, then scoped regressions: one step per changed screen or feature, exercising it as it worked before. A run that leaves test data behind ends on a cleanup step.
- **A checkbox per step**, a blank line between steps:

  ```
  - [ ] **S12** · Tap "Stretch".
    → The form shows Repeats on and the weekdays.
    Turn Repeats off.
    → The switch goes pale with a grey knob and the weekday row hides.

  - [ ] **D6** · iPhone: tap a check on today's Daily with the iPad open.
    → The iPad shows it within a minute (note the seconds).
  ```

  The action is one short line, led by the device when the part has several. Each expected result is its own `→` line holding one observation, what must stay absent included. A further action in the same step takes its own line.

- **Stable ids.** `S<n>` on the Simulator, `D<n>` on devices, counted through the whole part. A step added later takes the next unused number wherever it sits. Every revision of the body keeps each id and each tick.

A step is concrete when the runner never has to guess what to tap or what counts as done: labels quoted as the screen shows them, the data to enter named. An acceptance item that spans devices or states becomes one step per observation. The reason for a change stays in the PR's summary.

## Verdicts

Per step: **PASS**, **FAIL** or **BLOCKED**, with one line of evidence: what was seen and how long it took, a screenshot name, or why the step could not run. A FAIL is re-run once before it counts; a real FAIL carries the smallest repro. A tick in the body marks Patrick's place; the verdict is the comment.

The run is one comment on the PR, a line per step under its id:

```
## Manual test 2026-09-27

Build TestFlight 1.0.0 (8) from a1b2c3d · iPhone 15 Pro, iOS 27.0 · iPad Air, iOS 27.0

- **D6** PASS 14 s.
- **D8** FAIL the iPad kept its page. Repro: …
- **D9** BLOCKED iPad not signed into iCloud.

Verdict: FAIL
```

The last line is the run's verdict: `PASS` when every step passed, `FAIL` when any failed, otherwise `BLOCKED`. A later run is a new comment and the newest counts. The commit in the build line is what was tested; the verdict is stale once a later push touches a device path.

## Getting the build on device

A JS-only change reaches an installed dev client through Metro. A change under `modules/`, to `app.json` or to a native dependency needs a fresh build from a clean prebuild (`npx expo prebuild --clean`). Before installing anything over the daily-use iPhone, export the pad (bottom of the page → Export data).

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
