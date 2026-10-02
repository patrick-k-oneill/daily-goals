---
description: 'Supervised: GitHub issue (or description) → worktree + branch → diagnose (bug), plan (large lift, posted on the issue) or build; diff left uncommitted for IDE review'
argument-hint: <github-issue-url | #number | short description>
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent, Skill
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
3. **Route by issue shape:**
   - **`bug` label:** call the Skill tool with "mattpocock-skills:diagnosing-bugs" — a red feedback loop first, then the fix with a regression test at the right seam; it replaces the build. Stop uncommitted; the confirmed hypothesis goes in the commit message at `/p-pr`.
   - **No local red/green loop** (a native module, `app.json` / `eas.json`, a native dependency, workflows — whatever the label): shape and plan as for a large issue, and the plan names the device check. The build is not done at a diff: `/p-test` verifies it on device per `docs/agents/manual-testing.md`, from its own session once the PR exists.
   - **Large / complex, or ambiguous acceptance** — two sessions, so the build starts with a small context instead of inheriting the shaping:
     - **Setup returned a `plan`** (the newest `## Plan` comment on the issue): this is the **build session**. Restate the plan in three lines, then build from it as in **Small / medium**; the plan is not reopened.
     - **No `plan`**: this is the **shaping session**. Grill the approach (`mattpocock-skills:grilling`) until the frontier is empty; `mattpocock-skills:domain-modeling` when a term or decision is new. Present the **plan** — files to touch, approach, seams to test at, risks, the device check if any — and stop for the go-ahead; write no code. On go-ahead, do not build: post the plan as an issue comment that starts with `## Plan` (`gh issue comment <num> --body-file <file>`) and end with exactly: _Plan posted to Issue #<num>. /clear, then run /p-start #<num> again — it builds from the plan._
   - **Small / medium, clear:** implement in the worktree, run `npm run check` (report the react-doctor score), then **stop without committing** — leave the working-tree diff for review.
4. Summarize: branch, worktree path, and the plan, diagnosis or diff summary. Remind: _review the diff in the worktree (open it in your IDE), iterate as needed, then run `/p-pr` — here, or from a session started in the worktree — when the changes are ready to become a PR; it runs the bug reviewer before pushing._

Do not commit, push, or open a PR in this command — the point is to pause for human review.
