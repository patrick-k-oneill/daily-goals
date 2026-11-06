---
description: 'Fully automated: GitHub issue (or short description) → implemented branch → bug-reviewed → published PR (small/easy changes)'
argument-hint: <github-issue-url | #number | short description>
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent, Skill
---

You are running the **fully-automated issue→PR workflow** for a small, well-scoped change.
Input: **$ARGUMENTS**

If at any point the change looks larger than "small/easy," stop and recommend `/p-start` (supervised) instead.

## Setup & conventions

- This is Patrick's personal repo (`patrick-k-oneill/daily-goals`). No Linear, no Slack, no QA previews.
- Branch: `dg-<num>/<kebab-slug-of-title>` for an issue, `dg/<kebab-slug>` for a plain description.

## Steps

1. **Setup via `dg-ops`** — one Agent call (`subagent_type: dg-ops`, foreground) with this prompt:

   > Set up from: <input>. If it's an issue URL or `#<num>`, fetch the issue; `git fetch origin`; if the working tree is dirty return `{blocked, reason}`; `git checkout main && git pull --ff-only origin main`; `git checkout -b <branch>`. Return `{number, title, body, branch}`.

   On `blocked`, relay the reason and stop.

2. **Implement.** Keep it clean, simple, and complete. Follow `CLAUDE.md` and the repo's conventions (read neighboring files first). Architecture rules: routes stay thin in `src/app/`, domain logic is pure functions in `src/features/*/logic.ts` with tests, UI primitives live in `src/components/ui/`.
3. **Quality gate** (must pass before any commit): `npm run check` — typecheck, eslint + prettier on changed files, jest, `react-doctor --scope changed`. Fix any regression; report the react-doctor score.
4. **Commit** in clear, concise, imperative messages (one logical change per commit).
5. **Review** — `git fetch origin`, then spawn the `bug-reviewer` agent (Agent tool, `subagent_type: bug-reviewer`) with the repo path and stack (Expo SDK 57 React Native + TypeScript, jest), fixed point `origin/main` and `git diff origin/main...HEAD`, the commit list (`git log --oneline origin/main..HEAD`), and the issue title as the one-line intent. Unattended: fix every finding with a traced failure scenario, re-run the quality gate, commit, and name the fixed point and the findings in the final report. Only the bug reviewer runs here: tooling enforces the standards and the spec is the issue.
6. **Push:** `git push -u origin <branch>`.
7. **Confirm before publishing** (opening a PR is an outward action). Show the diff summary and the proposed:
   - Title: `[#<num>] <issue title>` (or just a clear title when there's no issue)
   - Body: short summary + what-changed checklist + `Closes #<num>` when an issue exists
     On approval: `gh pr create --base main --title "<title>" --body "<body>"`.
8. Print the PR URL.
9. **Start the post-push watcher:** run `/p-watch` on the new PR. It polls CI and hands off to `/p-ready` when green.

Do **not** merge the PR in this command — merging is `/p-ready`'s human-gated call.
