---
description: 'Supervised: GitHub issue (or description) → worktree + branch → plan (large lift) or leave diff for IDE review'
argument-hint: <github-issue-url | #number | short description>
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent
---

You are running the **supervised issue→dev workflow**. Input: **$ARGUMENTS**
The goal is to get to a reviewable state and then **pause** — you do NOT open a PR here.

One issue per session: if this conversation already built an issue, stop and tell the user to `/clear` and re-run (they can reply "continue here" to override).

## Setup & conventions

- Personal repo `patrick-k-oneill/daily-goals`; base branch `main`.
- Branch: `dg-<num>/<kebab-slug-of-title>` for an issue, `dg/<kebab-slug>` for a plain description.
- The build happens in the worktree `dg-ops` returns, under this session's scratchpad directory — never in `~/Code/daily-goals`, Patrick's IDE checkout. `cd` there once; when the change touches `package.json` or the lockfile, delete the `node_modules` symlink and `npm ci` there.

## Steps

1. **Setup via `dg-ops`** — one Agent call (`subagent_type: dg-ops`, foreground) with this prompt:

   > Set up from: <input>, worktrees under <scratchpad>. If it's an issue URL or `#<num>`, fetch the issue with labels and comments; `git fetch origin`; `git worktree add <scratchpad>/<branch> -b <branch> origin/main`, symlink `node_modules` and exclude it. Return `{number, title, body, labels, comments, plan, branch, worktree}`.

   On `blocked`, relay the reason and stop.

2. **Gather context in batches.** Read every file you can already name in one Bash call (several `cat`s), then only what that batch reveals — one file per turn is the slowest thing a build does.
3. **Judge the size of the lift** from the request and the affected code:
   - **Large / complex:** produce a clear implementation **plan** (files to touch, approach, edge cases, risks, test strategy). Do **not** write code yet. Present the plan and stop for the go-ahead.
   - **Small / medium:** implement in the worktree, run `npm run check` (report the react-doctor score), then **stop without committing** — leave the working-tree diff for review.
4. Summarize: branch, worktree path, and either the plan or a diff summary. Remind: _review the diff in the worktree (open it in your IDE), iterate as needed, then run `/p-pr` — here, or from a session started in the worktree — when the changes are ready to become a PR; it runs the bug reviewer before pushing._

Do not commit, push, or open a PR in this command — the point is to pause for human review.
