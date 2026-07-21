---
name: perf-pipeline
description: >-
  Overzicht van de autonome perf-pipeline: acht skills, één start via perf-orchestrate.
  runMode full = autonoom tot klaar. Gebruik bij "perf pipeline", "perf skills", "autonome perf",
  "welke perf skill", "perf rollen", "zet perf pipeline aan".
---

# Perf Pipeline — Rollen + Skills

> **Geen losse cloud-agents.** Eén Cursor-run volgt achtereenvolgens **skills** (recepten in git).
> **Rollen** beschrijven wie wat doet; **skills** beschrijven hoe.

## Start (slash)

| Commando | Skill | Effect |
|----------|-------|--------|
| **`/perf-pipeline`** | `perf-orchestrate` | Alles autonoom aan |
| **`/perf-optimize`** | → `perf-orchestrate` | Zelfde alias |
| `/perf-pipeline resume` | `perf-orchestrate` | Hervat BL-003 e.d. |
| `/perf-check` | `perf-review` | Alleen meten |
| `/perf-optimize BL-003` | `perf-optimize` | Alleen één fix |

Natuurlijke taal equivalent: *"zet perf pipeline aan"* = `/perf-pipeline`.

Policy: `test-reports/perf-optimize-policy.json`

---

## Rollen → Skills

| Rol | Skill | Doet | Artifact |
|-----|-------|------|----------|
| **Orchestrator** | `perf-orchestrate` | State machine, runMode full/scout/resume | `perf-pipeline-state.json` |
| **Scout (load)** | `perf-review` / perf-scout.js | J1–J3 meten, backlog | `perf-backlog.json`, `perf-baseline.json` |
| **Scout (scroll)** | `perf-scroll` | J4+ scroll jank | `perf-scroll-*.md`, backlog BL-004+ |
| **Scout (board UX)** | `perf-board-actions` | J7 filter, J8 text style | `perf-board-actions-*.md`, BL-005/006 |
| **Architect** | `perf-architect` | Fix-plan, tier L0–L5 | `perf-fix-plan-<id>.json` |
| **Fixer** | `perf-optimize` | Code wijzigen, lokaal commit | git commit (geen push) |
| **Verifier** | `perf-verify` | test/build + regressie | `perf-verify-<id>.md` |
| **Adversary** | `perf-adversary` | Stale/duplicate scenario's | `perf-adversary-<id>.md` |

---

## Loop (v1.2)

```
perf-orchestrate (runMode: full)
  → perf-scout (J1–J3, profielen M+L)
  → perf-scroll (J4)
  → perf-board-actions (J7/J8)
  WHILE iter < 10:
    perf-architect → perf-optimize → perf-verify
    → develop-from-devops (modus preview) → azure re-measure → perf-adversary
    push + draft PR (mens review altijd)
```

Scope groeit via policy `scopePhases` (v1 load → v1.1 scroll → v2 hele app routes).

---

## Waar staan de skills

| Omgeving | Pad |
|----------|-----|
| Cursor | `.cursor/skills/perf-*/` |
| Claude Code | `.claude/skills/perf-*/` |

Schemas: `test-reports/schemas/`. Playwright: `playwright/perf-scout.js`, `playwright/perf-scroll.js`, `playwright/perf-board-actions.js`, `playwright/perf-adversary.js`.

Plan: `.cursor/plans/2026-07-20-autonome-perf-agent-pipeline.plan.md`

### Worktree

Perf-pilot draait in **`.worktrees/perf-pipeline-v1/`** (branch `feature/perf-pipeline-skills-v1.3`).
Hoofd-repo blijft op `develop`. Open die map als apart Cursor-project voor veilig testen.

---

## Skills vs agents

| Skills | Cloud/subagents |
|--------|-----------------|
| Versioneerbaar in git | Losse sessie / VM |
| Eén run, vaste volgorde | Parallel mogelijk |
| Handmatig starten (policy) | Eigen lifecycle |
| Gedeelde JSON-artifacts | Eigen context |

Gebruik **subagents** alleen voor parallel codebase-onderzoek — niet voor de perf-loop zelf.
