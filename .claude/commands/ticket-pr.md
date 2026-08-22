---
description: 'From the current branch → commit (if needed) → push → open PR against main'
argument-hint: '(none — uses current branch; optional issue URL/#number to link)'
allowed-tools: Bash, Read, Grep, Glob
---

You are opening a PR for the **current branch**. Optional arg (issue URL or `#<num>`): $ARGUMENTS

## Steps

1. Current branch = `git branch --show-current` (expected `dg-<num>/<slug>` or `dg/<slug>`); extract the issue number if present (or from the arg).
2. **Quality gates:** `npm run check:all` and `npx react-doctor@latest --verbose --scope changed` must pass. Fix regressions before continuing; report the doctor score.
3. **Uncommitted changes?** If `git status --porcelain` is non-empty, show the diff, propose clear concise commit message(s) (imperative, one logical change each), and after confirmation, commit.
4. **Push:** `git push -u origin <branch>` (first push) or `git push`.
5. **Confirm before publishing.** Show the proposed:
   - Title: `[#<num>] <title>` (or a clear title when there's no issue)
   - Body: short summary + what-changed checklist + `Closes #<num>` when an issue exists
     On approval: `gh pr create --base main --title "<title>" --body "<body>"`.
6. Print the PR URL and remind: run `/pr-watch` to babysit CI, or `/ticket-ready` once checks are green.
