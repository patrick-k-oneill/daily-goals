---
description: "Test the current branch's PR by hand: plan from the issue's acceptance list, run it on device or the Simulator, verdicts on the PR"
argument-hint: "[pr-number | pr-url] (default: the current branch's PR)"
allowed-tools: Bash, Read, Grep, Glob, Write, Agent, ToolSearch
---

You are running the **manual test** for a PR. Input: **$ARGUMENTS** (default: the current branch's PR). The plan format, the verdicts and the build paths are in `docs/agents/manual-testing.md`; read it first. You plan, judge and record; you change no code here.

## 1. Frame

- PR = `gh pr view $ARGUMENTS --json number,url,title,body,headRefName,headRefOid`. Issue number from the title's `[#<num>]` or the body's `Closes #<num>`; `gh issue view <num> --json title,body` for the acceptance list.
- Changed files: `gh pr diff <num> --name-only`; the diff itself: `gh pr diff <num>`. Sort the change per the doc: **device**, **screen** or **neither**. Neither → say so and stop.

## 2. Plan

Write the plan in the doc's format: every acceptance item as one or more concrete steps, then one regression step per screen or feature the diff touched. Save it to `<scratchpad>/p-test-<num>.md` and show it.

## 3. Build

Confirm the build under test is the PR head. Device run: the TestFlight build number and its commit (`npx eas-cli build:list -p ios --limit 3`). Simulator run: `npm run ios` from a checkout of the branch, after `npx expo prebuild --clean` when the change is native. No build yet → give the doc's commands for it and wait.

## 4. Run

- **Screen** change: load the Simulator tools (`ToolSearch` for `Claude_Code_iOS_Simulator`). Present → one `qa-driver` call per group of steps (Agent tool, `subagent_type: qa-driver`, foreground, sequential): each call gets its numbered steps with expected results and the exact data to enter, and returns PASS / FAIL / BLOCKED with evidence. Absent → the guided checklist, on the Simulator.
- **Device** change: the guided checklist. Show the numbered steps; Patrick runs them on the devices and replies with a verdict and a line of evidence per step, all at once or one step per turn as he prefers. Ask for whatever is missing; a verdict is never guessed.
- A FAIL is re-run once. Reproduced → capture the smallest repro; the fix is not made here.

## 5. Record

Compose the comment in the doc's format: the build line with build number and commit, one line per step, `Verdict:` last. Show it; on approval `gh pr comment <num> --body-file <path>`.

Verdict PASS → suggest `/p-ready`. FAIL → list the failures; the fix goes through the normal flow and the new build gets a new `/p-test`. BLOCKED → say what unblocks it.
