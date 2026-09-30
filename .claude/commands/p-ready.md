---
description: 'After CI is green and review comments are addressed → final verify, then human-gated merge'
argument-hint: "(none — uses the current branch's PR)"
allowed-tools: Bash, Read, Grep, Glob
---

You are finalizing the **current PR** for merge.

## Setup

- PR = `gh pr view --json number,url,title,headRefName,headRefOid,mergeable,statusCheckRollup,comments`.

## Steps

1. **Verify CI:** every check in `statusCheckRollup` succeeded, completed after the most recent pushed commit. If anything is red or pending, report and stop (or hand back to `/p-watch`).
2. **Manual test verdict.** Sort the PR's changed files per `docs/agents/manual-testing.md`. A **device** change needs a `## Manual test` comment (the newest counts) whose last line is `Verdict: PASS` and whose build commit is not behind a later push touching a device path. Missing, not PASS, or stale → report and stop; `/p-test` is the way through.
3. **Address review bots if present.** If Cursor BugBot (`cursor[bot]`) or any other reviewer has commented, follow the global BugBot rules in `~/.claude/CLAUDE.md`: fully verify each claim against the code; valid → 👍 + fix + commit + push (then CI must re-green); hallucinated → reply explaining what it missed. Never change code to satisfy a wrong claim.
4. **Final local gate:** `npm run check` on the branch. Report the react-doctor score.
5. **Human-gated merge.** Show a one-paragraph summary of what the PR does and ask whether to merge. On an explicit yes: `gh pr merge <num> --squash --delete-branch`. Never merge without the explicit confirmation in this session.
6. Report: merge result, and `git checkout main && git pull --ff-only` to leave the working copy clean.

Note: there is no Slack post and no status label here — this is a personal repo. Merging is the single outward action, and it stays human-gated.
