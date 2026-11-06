---
description: 'From the current branch → commit (if needed) → bug review → push → open PR against main'
argument-hint: '(none — uses current branch; optional issue URL/#number to link)'
allowed-tools: Bash, Read, Grep, Glob, Agent
---

You are opening a PR for the **current branch**. Optional arg (issue URL or `#<num>`): $ARGUMENTS

## Steps

1. Current branch = `git branch --show-current` (expected `dg-<num>/<slug>` or `dg/<slug>`); extract the issue number if present (or from the arg) and read its title (`gh issue view <num> --json title`).
2. **Quality gate:** `npm run check` must pass. Fix regressions before continuing; report the react-doctor score.
3. **Uncommitted changes?** If `git status --porcelain` is non-empty, show the diff, propose clear concise commit message(s) (imperative, one logical change each), and after confirmation, commit.
4. **Review** — `git fetch origin`, then spawn the `bug-reviewer` agent (Agent tool, `subagent_type: bug-reviewer`) with the repo path and stack (Expo SDK 57 React Native + TypeScript, jest), fixed point `origin/main` and `git diff origin/main...HEAD`, the commit list (`git log --oneline origin/main..HEAD`), and the issue title as the one-line intent. Show the report, headed by the fixed point (`origin/main` at its short sha); the user picks which findings to fix — a finding with a traced failure scenario is fixed and committed before the push. Only the bug reviewer runs here: tooling enforces the standards and the spec is the issue.
5. **Push:** `git push -u origin <branch>` (first push) or `git push`.
6. **Confirm before publishing.** Show the proposed:
   - Title: `[#<num>] <title>` (or a clear title when there's no issue)
   - Body: short summary + what-changed checklist + `Closes #<num>` when an issue exists
     On approval: `gh pr create --base main --title "<title>" --body "<body>"`.
7. Print the PR URL and remind: run `/p-watch` to babysit CI, or `/p-ready` once checks are green.
