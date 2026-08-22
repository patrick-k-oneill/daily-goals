---
name: react-doctor
description: Use at commit points — after finishing a feature or bug fix, before `git commit` or opening a PR — to check React diagnostics did not regress. Also use when the user types `/doctor`, or asks to scan, triage, or clean up React lint / a11y / performance / architecture issues, or to explain, tune, or disable a react-doctor rule.
---

# React Doctor

Scans React code for security, performance, correctness, and architecture issues and reports a 0–100 health score.

## At every commit point (default behavior)

Before committing or opening a PR on React changes:

```bash
npx react-doctor@latest --verbose --scope changed
```

Fix any regression before committing. Report the score in your summary. Do not commit past a dropped score without telling the user.

## Full cleanup pass — `/doctor`

When the user types `/doctor`, says "run react doctor", or asks for a triage/cleanup pass (not just a regression check), fetch the canonical playbook and follow every step:

```bash
curl --fail --silent --show-error \
  --header 'Cache-Control: no-cache' \
  https://www.react.doctor/prompts/react-doctor-agent.md
```

That playbook is the source of truth: scan → filter → triage → fix → validate, editing the working tree only (never commits, never opens PRs). Per-rule recipes live at `https://www.react.doctor/prompts/rules/<plugin>/<rule>.md` — fetch on demand while fixing.

For a full-codebase scan outside the playbook: `npx react-doctor@latest --verbose` (default `--scope full`). Fix errors before warnings.

## Explaining or disabling a rule

When the user wants to understand a rule, disagrees with one, or wants to tune which rules run — don't guess. Start with `npx react-doctor@latest rules explain <rule>`, fetch the rule's recipe from `https://www.react.doctor/prompts/rules/<plugin>/<rule>.md` if more depth is needed, then apply the narrowest control.

## Flags

| Flag              | Purpose                                   |
| ----------------- | ----------------------------------------- |
| `--verbose`       | Affected files and line numbers per rule  |
| `--scope changed` | Only issues introduced vs the base branch |
| `--scope lines`   | Only issues on the changed lines          |
| `--score`         | Numeric score only                        |

## React Native note

This repo is an Expo React Native app (web + iOS/Android). react-doctor's React rules apply to the shared component code; ignore any web-DOM-specific advice that doesn't apply to react-native primitives.
