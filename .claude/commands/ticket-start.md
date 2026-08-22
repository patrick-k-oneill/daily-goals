---
description: 'Supervised: GitHub issue (or description) → branch → plan (large lift) or leave diff for IDE review'
argument-hint: <github-issue-url | #number | short description>
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

You are running the **supervised issue→dev workflow**. Input: **$ARGUMENTS**
The goal is to get to a reviewable state and then **pause** — you do NOT open a PR here.

## Setup & conventions

- Personal repo `patrick-k-oneill/daily-goals`; base branch `main`.
- Parse the input the same way `/ship` does: issue URL/`#<num>` → `gh issue view`; otherwise treat as a description. Branch: `dg-<num>/<kebab-slug>` or `dg/<kebab-slug>`.

## Steps

1. **Clean base:** `git fetch origin`; if the working tree is dirty, stop and ask; `git checkout main && git pull --ff-only origin main`.
2. **Branch:** `git checkout -b <branch>`.
3. **Judge the size of the lift** from the request and the affected code:
   - **Large / complex:** produce a clear implementation **plan** (files to touch, approach, edge cases, risks, test strategy). Do **not** write code yet. Present the plan and stop for the go-ahead.
   - **Small / medium:** implement on the branch, run `npm run check:all` and `npx react-doctor@latest --verbose --scope changed`, then **stop without committing** — leave the working-tree diff for review in the IDE.
4. Summarize: branch name, and either the plan or a diff summary. Remind: _review in your IDE, iterate as needed, then run `/ticket-pr` when the changes are ready to become a PR._

Do not commit, push, or open a PR in this command — the point is to pause for human review.
