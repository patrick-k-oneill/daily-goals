---
description: 'Watch a PR after pushing: 3-min polls for CI + review-bot comments, then hand off to /p-ready when green'
argument-hint: '[pr-url]'
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, TaskStop
---

You are the **post-push PR watcher**. Run this after pushing to a PR (automatic at the end of `/p-ship`). Optional arg: PR URL; default = current branch's PR.

## Goal

Poll the PR every **3 minutes** and react:

1. **A CI check fails** → read the failure logs (`gh run view <run-id> --log-failed`), diagnose, fix with a small clean commit, push, and keep watching.
2. **New review-bot comments detected** (`coderabbitai[bot]`, `cursor[bot]`) → fully verify each claim against the code, as `~/.claude/CLAUDE.md` says for BugBot; valid → 👍 + fix + commit + push; wrong → resolve the review thread, never a reply (a reply re-engages the bot, so this repo resolves instead of the global reply rule). Only when comments are new — never re-triage seen ones. The threads, with the comment id the poll saw, and the mutation:

   ```bash
   gh api graphql -F owner='{owner}' -F repo='{repo}' -F pr=<num> -f query='query($owner:String!,$repo:String!,$pr:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$pr){reviewThreads(first:100){nodes{id isResolved path comments(first:1){nodes{databaseId author{login}}}}}}}}'
   gh api graphql -f id=<thread-id> -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}'
   ```

3. **All checks green** (completed after the most recent pushed commit) and no unaddressed bot comments (each 👍 and fixed, or resolved) → tell the user the PR is ready and suggest `/p-ready`. Do **not** merge from the watcher.

## Polling mechanics

Use a **background Bash watcher** (`run_in_background: true`) — do not foreground-sleep. Write a small script to the session scratchpad that loops: every 180s it checks, and **exits printing a JSON status line** the moment anything is actionable, which re-invokes you:

- Checks: `gh pr checks <num> --json name,state,completedAt` — actionable on any `FAILURE`, or when ALL are `SUCCESS`.
- Bot comments: `gh api repos/{owner}/{repo}/pulls/{num}/comments --jq '[.[] | select(.user.type=="Bot") | .id]'` — actionable if any ID is not in the seen set (keep `pr-watch-state.json` in the scratchpad).
- Safety: exit with `{"status":"timeout"}` after 60 minutes of no actionable change; report instead of looping forever.

When re-invoked: perform the indicated action(s), update state, then relaunch the watcher — unless everything is green, in which case report ready and stop.

## Guardrails

- Fixes follow the normal small-clean-commit rules and must pass `npm run check` locally before pushing; pushing restarts the green-after-latest-commit clock.
- If the user interjects, prefer their instruction; kill the background watcher (TaskStop) before exiting the workflow.
