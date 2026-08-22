---
description: 'Fully automated: GitHub issue (or short description) → implemented branch → published PR (small/easy changes)'
argument-hint: <github-issue-url | #number | short description>
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

You are running the **fully-automated issue→PR workflow** for a small, well-scoped change.
Input: **$ARGUMENTS**

If at any point the change looks larger than "small/easy," stop and recommend `/ticket-start` (supervised) instead.

## Setup & conventions

- This is Patrick's personal repo (`patrick-k-oneill/daily-goals`). No Linear, no Slack, no QA previews.
- Parse the input:
  - GitHub issue URL or `#<num>` → fetch it: `gh issue view <num> --json number,title,body`. Identifier = `#<num>`; branch = `dg-<num>/<kebab-slug-of-title>`.
  - Plain description → no issue; branch = `dg/<kebab-slug>`.

## Steps

1. **Clean base:** `git fetch origin`; base = `main`. If the working tree is dirty, stop and ask. `git checkout main && git pull --ff-only origin main`.
2. **Branch:** `git checkout -b <branch>`.
3. **Implement.** Keep it clean, simple, and complete. Follow `CLAUDE.md` and the repo's conventions (read neighboring files first). Architecture rules: routes stay thin in `src/app/`, domain logic is pure functions in `src/features/*/logic.ts` with tests, UI primitives live in `src/components/ui/`.
4. **Quality gates** (all must pass before any commit):
   - `npm run check:all` (typecheck + lint + tests + format check)
   - `npx react-doctor@latest --verbose --scope changed` — fix any regression; report the score.
5. **Commit** in clear, concise, imperative messages (one logical change per commit). After the first commit run `git push -u origin <branch>`; push subsequent commits normally.
6. **Confirm before publishing** (opening a PR is an outward action). Show the diff summary and the proposed:
   - Title: `[#<num>] <issue title>` (or just a clear title when there's no issue)
   - Body: short summary + what-changed checklist + `Closes #<num>` when an issue exists
     On approval: `gh pr create --base main --title "<title>" --body "<body>"`.
7. Print the PR URL.
8. **Start the post-push watcher:** run `/pr-watch` on the new PR. It polls CI and hands off to `/ticket-ready` when green.

Do **not** merge the PR in this command — merging is `/ticket-ready`'s human-gated call.
