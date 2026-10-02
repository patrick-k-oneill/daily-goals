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
3. **Address review bots if present.** Every `coderabbitai[bot]` or `cursor[bot]` review comment is fully verified against the code, as `~/.claude/CLAUDE.md` says for BugBot: valid → 👍 + fix + commit + push (then CI must re-green); wrong → resolve the review thread, never a reply (a reply re-engages the bot, so this repo resolves instead of the global reply rule). Never change code to satisfy a wrong claim. The unresolved threads and the mutation:

   ```bash
   gh api graphql -F owner='{owner}' -F repo='{repo}' -F pr=<num> -f query='query($owner:String!,$repo:String!,$pr:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$pr){reviewThreads(first:100){nodes{id isResolved path comments(first:1){nodes{databaseId author{login}}}}}}}}'
   gh api graphql -f id=<thread-id> -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}'
   ```

4. **Final local gate:** `npm run check` on the branch. Report the react-doctor score.
5. **Human-gated merge.** Show a one-paragraph summary of what the PR does and ask whether to merge. On an explicit yes: `gh pr merge <num> --squash --delete-branch`. Never merge without the explicit confirmation in this session.
6. Report: merge result, and `git checkout main && git pull --ff-only` to leave the working copy clean.

Note: there is no Slack post and no status label here — this is a personal repo. Merging is the single outward action, and it stays human-gated.
