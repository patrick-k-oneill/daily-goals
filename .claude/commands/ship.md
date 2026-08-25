---
description: 'Fully automated: GitHub issue (or short description) → implemented branch → published PR (small/easy changes)'
argument-hint: <github-issue-url | #number | short description>
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent, Skill
---

You are running the **fully-automated issue→PR workflow** for a small, well-scoped change.
Input: **$ARGUMENTS**

If at any point the change looks larger than "small/easy," stop and recommend `/ticket-start` (supervised) instead.

## Setup & conventions

- This is Patrick's personal repo (`patrick-k-oneill/daily-goals`). No Linear, no Slack, no QA previews.
- Branch: `dg-<num>/<kebab-slug-of-title>` for an issue, `dg/<kebab-slug>` for a plain description.

## Steps

1. **Setup via `dg-ops`** — one Agent call (`subagent_type: dg-ops`, foreground) with this prompt:

   > Set up from: <input>. If it's an issue URL or `#<num>`, fetch the issue; `git fetch origin`; if the working tree is dirty return `{blocked, reason}`; `git checkout main && git pull --ff-only origin main`; `git checkout -b <branch>`. Return `{number, title, body, branch}`.

   On `blocked`, relay the reason and stop.

2. **Implement.** Keep it clean, simple, and complete. Follow `CLAUDE.md` and the repo's conventions (read neighboring files first). Architecture rules: routes stay thin in `src/app/`, domain logic is pure functions in `src/features/*/logic.ts` with tests, UI primitives live in `src/components/ui/`.
3. **Quality gates** (all must pass before any commit):
   - `npm run check:all` (typecheck + lint + tests + format check)
   - `npx react-doctor@latest --verbose --scope changed` — fix any regression; report the score.
4. **Commit** in clear, concise, imperative messages (one logical change per commit). After the first commit run `git push -u origin <branch>`; push subsequent commits normally.
5. **Confirm before publishing** (opening a PR is an outward action). Show the diff summary and the proposed:
   - Title: `[#<num>] <issue title>` (or just a clear title when there's no issue)
   - Body: short summary + what-changed checklist + `Closes #<num>` when an issue exists
     On approval: `gh pr create --base main --title "<title>" --body "<body>"`.
6. Print the PR URL.
7. **Start the post-push watcher:** run `/pr-watch` on the new PR. It polls CI and hands off to `/ticket-ready` when green.

Do **not** merge the PR in this command — merging is `/ticket-ready`'s human-gated call.
