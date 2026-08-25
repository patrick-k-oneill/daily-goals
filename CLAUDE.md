@AGENTS.md

# daily-goals

Expo (SDK 57) React Native + TypeScript app — one codebase for web, iOS, and Android. A digital version of Patrick's legal-pad ritual: Daily/Weekly/Annual goals with multi-check goals, a morning Gratitude Journal written about the previous day, and jotted upcoming events.

## Commands

- `npm run web` / `ios` / `android` — dev server (Node ≥ 20.19.4; `.nvmrc` pins v22)
- `npm run check:all` — typecheck + lint + tests + format check (the pre-commit gate)
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`

## Architecture

- `src/app/` — expo-router routes only; keep them thin (compose feature components, no logic).
- `src/features/<feature>/` — `types.ts`, `logic.ts` (pure functions, unit-tested), `store.ts` (zustand + persist), `components/`.
- `src/components/ui/` — design-system primitives (Screen, SectionHeader, CheckBox).
- `src/constants/theme.ts` — all design tokens (paper palette, spacing, fonts). Never hardcode colors in components; every color exists in light and dark.
- `src/lib/` — storage adapter, date/period-key helpers, cross-platform shims (confirm, haptics).
- Persistence is zustand `persist` over AsyncStorage, configured once in `src/lib/persisted-store.ts`; the root layout gates first render on every store having rehydrated.

## Domain glossary

- **Period key**: `2026-08-21` (day) / `2026-W34` (ISO week) / `2026` (year) — indexes goal pages.
- **Check state**: each goal has N checkboxes; taps cycle `empty → done → missed → empty`, like pen marks on the pad.
- **Template vs entry**: recurring goals are templates, materialized into per-period entries by `ensurePeriod` (idempotent).
- **Reflection date**: a gratitude entry is written each morning _about yesterday_ — keyed by the day reflected on, not the writing day.

## Code style

- Write self-explanatory code: clear names and small focused functions over explanatory comments.
- Comment only what the code can't say — intent, non-obvious constraints, deliberate deviations. Keep comments to one or two short lines; no restating what the code does.
- Platform-specific behavior goes in `.web.tsx`/`.web.ts` sibling files (see `app-tabs`), or `Platform.select` for small forks.
- React Compiler is enabled — don't add `useMemo`/`useCallback`/`React.memo` for performance.

## Commit points

Before `git commit` or opening a PR on React changes, run:

```bash
npx react-doctor@latest --verbose --scope changed
```

Fix regressions before committing, and report the score. Full triage pass, rule explanations, and rule config: see the `react-doctor` skill (`.claude/skills/react-doctor/SKILL.md`). Also run `npm run check:all` before every commit.

## Workflow commands

`/ship` (auto: issue → PR), `/ticket-start` (supervised), `/ticket-pr`, `/pr-watch`, `/ticket-ready` (human-gated merge) — see `.claude/commands/`. GitHub Issues is the tracker; merging is always human-gated.

## Agent skills

### Issue tracker

GitHub Issues on `patrick-k-oneill/daily-goals`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root, created lazily by `/domain-modeling`. See `docs/agents/domain.md`.
