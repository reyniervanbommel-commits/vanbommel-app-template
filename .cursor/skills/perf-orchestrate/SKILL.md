---
name: perf-orchestrate
description: >-
  Start en bestuurt de autonome perf-pipeline: leest policy, beheert state machine,
  roept perf-review / perf-architect / perf-optimize / perf-verify / perf-adversary
  aan in volgorde. Handmatig gestart; max 10 iteraties; push alleen na verify + adversary.
  Gebruik bij "start perf pipeline", "perf-orchestrate", "autonome perf run",
  "perf optimalisatie pipeline".
---

# Perf Orchestrate

> **Rol:** Orchestrator · **Skill:** `perf-orchestrate`. Dirigeert de pipeline; implementeert zelf geen fixes.
>
> **Verwant:** `perf-review` (Scout), `perf-architect`, `perf-optimize`, `perf-verify`,
> `perf-adversary`. Policy: `test-reports/perf-optimize-policy.json`.

## Wanneer gebruiken

| Trigger | Actie |
|---------|-------|
| *"start perf pipeline"* | Volledige run (scout → loop) |
| *"perf-orchestrate resume"* | Hervat `perf-pipeline-state.json` |
| *"perf scout only"* | Alleen Scout-fase (backlog vullen) |

Pipeline draait **handmatig** (policy `pipelineSchedule: manual`). Start nooit zelf op schema.

---

## Workflow

```
Orchestrate Progress:
- [ ] Stap 0: Policy + env-check
- [ ] Stap 1: State laden of initialiseren
- [ ] Stap 2: Scout (perf-review screening)
- [ ] Stap 3: Pipeline-loop (max iteraties)
- [ ] Stap 4: Afronden + samenvatting
```

Zie [reference.md](reference.md) voor state machine, artifact-paden en stop-regels.

---

## Stap 0 — Policy + env-check

1. Lees `test-reports/perf-optimize-policy.json`. Ontbreekt het bestand → stop en meld.
2. **Waarheid-omgeving:** policy `environment.truth` = `azure-dev-container-app`.
   - Meet op Azure DEV URL, niet alleen localhost.
   - Haal URL op uit team-docs of vraag gebruiker **alleen** als URL nergens te vinden is.
3. **Seed profielen** vóór Scout/Verifier:
   ```bash
   node scripts/seed-perf-po-cache.js --orders=500   # profiel M
   node scripts/seed-perf-po-cache.js --orders=2000  # profiel L
   ```
4. Zet `TEST_BASE_URL` op de Azure DEV frontend-URL voor Playwright-fallback.

---

## Stap 1 — State

Bestand: `test-reports/perf-pipeline-state.json`

**Nieuwe run** — schrijf:

```json
{
  "runId": "perf-2026-07-20T190000Z",
  "status": "running",
  "iteration": 0,
  "maxIterations": 10,
  "l5ExperimentsUsed": 0,
  "currentPhase": "scout",
  "backlogItemId": null,
  "environmentUrl": "<azure-dev-url>",
  "startedAt": "<iso>"
}
```

**Resume** — laad bestaande state; ga verder bij `currentPhase`.

| Status | Betekenis |
|--------|-----------|
| `running` | Actief |
| `completed` | Backlog leeg of max iteraties |
| `blocked` | Onoplosbare fout (tests rood, geen winst na retries) |
| `paused` | Wacht op mens (PR-review buiten pipeline) |

---

## Stap 2 — Scout

Roep **`perf-review`** aan (modus `screening`):

- Profielen **M + L** (policy `scoutProfiles`)
- Scope v1: journeys `/`, `/rccp`, terugkeer `/` na `/rccp`
- Output: `test-reports/perf-backlog.json` + update `perf-baseline.json`

Scout berekent `priorityScore` per item:

```
priorityScore = (elapsedWall_median − targetWall) × routeFrequencyWeight
```

Frequency uit `/admin/analytics/page-usage`; fallback weights in policy indien leeg.

Sorteer backlog aflopend op `priorityScore`. Sla state op: `currentPhase: "loop"`.

---

## Stap 3 — Pipeline-loop

```
WHILE backlog not empty AND iteration < maxIterations:
  item = hoogste priorityScore (status: open)
  plan = perf-architect(item)
  commit = perf-optimize(plan)          // lokaal, GEEN push
  result = perf-verify(plan)
  IF NOT result.pass: revert; retry of skip (zie reference.md)
  adv = perf-adversary(plan)
  IF NOT adv.pass (blocking scenarios): revert; retry of skip
  push branch; update baseline; mark item done
  partial re-measure blast radius only
  iteration++
END
```

### Per-fase regels

| Fase | Skill | Push? |
|------|-------|-------|
| Architect | `perf-architect` | Nee |
| Fixer | `perf-optimize` | Nee — lokaal commit |
| Verifier | `perf-verify` | Nee |
| Adversary | `perf-adversary` | Nee |
| Na groen | git push | **Ja** — draft PR voor menselijke review |

**PR-review:** policy `prReview: always-human`. Maak draft PR; merge nooit automatisch.

**L5-limiet:** max `l5ExperimentsInV1` (default 1) per run. Tel bij in state `l5ExperimentsUsed`.

---

## Stap 4 — Afronden

1. Update state: `status: completed|blocked`, `finishedAt`
2. Schrijf `test-reports/perf-pipeline-summary-<datum>.md`:
   - Iteraties uitgevoerd
   - Items opgelost / skipped / blocked
   - UX-winsten (elapsedWall) per journey
   - Server-metric (informatief)
   - Open backlog-items
   - Draft PR-URLs

---

## Stop-regels (uit policy)

| Regel | Waarde |
|-------|--------|
| Max iteraties | `stop.maxIterationsPerRun` (10) |
| Min UX-winst | `stop.minUxGainMs` (50 ms) om item als "done" te tellen |
| Retry per item | `retry.maxAttemptsPerItem` (2) |
| Regressie gate | Alleen `elapsedWall` blokkeert (server informatief) |

---

## Foutafhandeling

| Situatie | Actie |
|----------|-------|
| Policy ontbreekt | Stop — MC-beslissingen nodig |
| Azure DEV niet bereikbaar | Stop — meld URL + health check |
| Scout lege backlog | `completed` — niets te optimaliseren |
| Alle items blocked | `blocked` — samenvatting + menselijke hulp |
| Git conflict bij push | Stop — geen force push |

## Best practices

- **Eén item per iteratie** — geen batch-fixes in één loop.
- **Revert vóór volgende tier** — nooit stapelen van half-werkende fixes.
- **Partial re-measure** — na fix alleen blast radius, geen volledige screening.
- **Deel draft PR-URL** in pipeline-summary voor menselijke review.
