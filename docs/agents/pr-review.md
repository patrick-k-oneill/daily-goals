# PR review

Two reviewers look at a PR: one before the push, one after.

## Before the push: `bug-reviewer`

`/p-pr` and `/p-ship` run the `bug-reviewer` agent on `origin/main...HEAD` and fix every finding with a traced failure scenario before pushing.

## After the push: Greptile

The Greptile Apps GitHub app reviews each PR when it opens; its comments come from `greptile-apps[bot]`. Draft PRs are skipped. `@greptileai` in a PR comment asks for a review by hand.

`/p-watch` and `/p-ready` verify every bot finding against the code: a valid one gets 👍 and a fix, a wrong one gets its review thread resolved, never a reply.

Config is `.greptile/config.json`: no summary, no diagrams, a status check in place of the "files reviewed" comment, and one rule for `src/features/**/logic.ts`.

## Credits

The Starter plan is free: one active developer and 50 credits a month. Only a completed review spends credits.

| Review | Credits |
| ------ | ------- |
| Base   | 1       |
| Plus   | 3       |
| Apex   | 10      |

`effort` is pinned to `base` in the config, so the month covers about 50 reviews. Pro is $1 a credit with no seat fee.
