---
name: perf-pipeline
description: >-
  Overzicht van de autonome perf-pipeline: zes rollen, zes skills, één handmatige run.
  Start via perf-orchestrate. Gebruik bij "perf pipeline", "perf skills", "autonome perf",
  "welke perf skill", "perf rollen".
---

# Perf Pipeline — Rollen + Skills

> **Geen losse cloud-agents.** Eén Cursor-run volgt achtereenvolgens **skills** (recepten in git).
> **Rollen** beschrijven wie wat doet; **skills** beschrijven hoe.

## Start

```
Handmatig: "start perf pipeline"  →  lees perf-orchestrate
Alleen meten: "perf check"        →  lees perf-review
```

Policy: `test-reports/perf-optimize-policy.json`

---

## Rollen → Skills

| Rol | Skill | Doet | Artifact |
|-----|-------|------|----------|
| **Orchestrator** | `perf-orchestrate` | State machine, loop, push na groen | `perf-pipeline-state.json` |
| **Scout** | `perf-review` | Meten, toerekenen, backlog | `perf-backlog.json`, `perf-baseline.json` |
| **Architect** | `perf-architect` | Fix-plan, tier L0–L5 | `perf-fix-plan-<id>.json` |
| **Fixer** | `perf-optimize` | Code wijzigen, lokaal commit | git commit (geen push) |
| **Verifier** | `perf-verify` | test/build + regressie | `perf-verify-<id>.md` |
| **Adversary** | `perf-adversary` | Stale/duplicate scenario's | `perf-adversary-<id>.md` |

---

## Loop (v1)

```
perf-orchestrate
  → perf-review (screening, profielen M+L)
  WHILE iter < 10:
    perf-architect → perf-optimize → perf-verify → perf-adversary
    push + draft PR (mens review altijd)
```

---

## Waar staan de skills

| Omgeving | Pad |
|----------|-----|
| Cursor | `.cursor/skills/perf-*/` |
| Claude Code | `.claude/skills/perf-*/` |

Schemas: `test-reports/schemas/`. Playwright: `playwright/perf-screening.js`, `playwright/perf-adversary.js`.

Plan: `.cursor/plans/2026-07-20-autonome-perf-agent-pipeline.plan.md`

---

## Skills vs agents

| Skills | Cloud/subagents |
|--------|-----------------|
| Versioneerbaar in git | Losse sessie / VM |
| Eén run, vaste volgorde | Parallel mogelijk |
| Handmatig starten (policy) | Eigen lifecycle |
| Gedeelde JSON-artifacts | Eigen context |

Gebruik **subagents** alleen voor parallel codebase-onderzoek — niet voor de perf-loop zelf.
