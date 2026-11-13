---
description: 'Fully automated: GitHub issue (or short description) → implemented branch → bug-reviewed → published PR (small/easy changes)'
argument-hint: <github-issue-url | #number | short description>
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent, Skill
---

You are running the **fully-automated issue→PR workflow** for a small, well-scoped change.
Input: **$ARGUMENTS**

If at any point the change looks larger than "small/easy," stop and recommend `/p-start` (supervised) instead.

One issue per session: if this conversation already built an issue, stop and tell the user to `/clear` and re-run (they can reply "continue here" to override).

## Setup & conventions

- This is Patrick's personal repo (`patrick-k-oneill/daily-goals`). No Linear, no Slack, no QA previews.
- Branch: `dg-<num>/<kebab-slug-of-title>` for an issue, `dg/<kebab-slug>` for a plain description.
- The build happens in the worktree `dg-ops` returns, under this session's scratchpad directory — never in `~/Code/daily-goals`, Patrick's IDE checkout. `cd` there once; when the change touches `package.json` or the lockfile, delete the `node_modules` symlink and `npm ci` there.

## Steps

1. **Setup via `dg-ops`** — one Agent call (`subagent_type: dg-ops`, foreground) with this prompt:

   > Set up from: <input>, worktrees under <scratchpad>. If it's an issue URL or `#<num>`, fetch the issue with labels and comments; `git fetch origin`; `git worktree add <scratchpad>/<branch> -b <branch> origin/main`, symlink `node_modules` and exclude it. Return `{number, title, body, labels, comments, plan, branch, worktree}`.

   On `blocked`, relay the reason and stop.

2. **Implement.** Gather context in batches — every file you can already name in one Bash call, then only what that batch reveals. Keep it clean, simple, and complete. Follow `CLAUDE.md` and the repo's conventions (read neighboring files first). Architecture rules: routes stay thin in `src/app/`, domain logic is pure functions in `src/features/*/logic.ts` with tests, UI primitives live in `src/components/ui/`.
3. **Quality gate** (must pass before any commit): `npm run check` — typecheck, eslint + prettier on changed files, jest, `react-doctor --scope changed`. Fix any regression; report the react-doctor score.
4. **Commit** in clear, concise, imperative messages (one logical change per commit).
5. **Review** — `git fetch origin`, then spawn the `bug-reviewer` agent (Agent tool, `subagent_type: bug-reviewer`) with the repo path and stack (Expo SDK 57 React Native + TypeScript, jest), fixed point `origin/main` and `git diff origin/main...HEAD`, the commit list (`git log --oneline origin/main..HEAD`), and the issue title as the one-line intent. Unattended: fix every finding with a traced failure scenario, re-run the quality gate, commit, and name the fixed point and the findings in the final report. Only the bug reviewer runs here: tooling enforces the standards and the spec is the issue.
6. **Push:** `git push -u origin <branch>`.
7. **Confirm before publishing** (opening a PR is an outward action). Show the diff summary and the proposed:
   - Title: `[#<num>] <issue title>` (or just a clear title when there's no issue)
   - Body: short summary + what-changed checklist + `Closes #<num>` when an issue exists
     On approval: `gh pr create --base main --title "<title>" --body "<body>"`.
8. Print the PR URL.
9. **Worktree teardown.** The worktree has done its job once the PR exists: delete its `node_modules` symlink, `cd` to the main checkout and `git worktree remove <worktree>`; then `git checkout <branch>` there only when it is clean and on `main`, so the PR is reviewable in the IDE. Say where the branch now lives.
10. **Start the post-push watcher:** run `/p-watch <pr-url>`. It polls CI and hands off to `/p-ready` when green.

Do **not** merge the PR in this command — merging is `/p-ready`'s human-gated call.
