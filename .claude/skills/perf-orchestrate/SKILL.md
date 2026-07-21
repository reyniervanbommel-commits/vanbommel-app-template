---
name: perf-orchestrate
description: >-
  Start en bestuurt de autonome perf-pipeline: leest policy, beheert state machine,
  roept perf-review / perf-scroll / perf-board-actions / perf-architect / perf-optimize /
  perf-verify / perf-adversary aan in volgorde. runMode full = volledig autonoom tot klaar.
  Slash: /perf-pipeline, /perf-optimize (zonder BL-id). Gebruik bij "zet perf pipeline aan",
  "autonome perf run", "perf optimalisatie pipeline".
---

# Perf Orchestrate

> **Rol:** Orchestrator · **Skill:** `perf-orchestrate`. Dirigeert de pipeline; implementeert zelf geen fixes.
>
> **Verwant:** `perf-review` (Scout), `perf-architect`, `perf-optimize`, `perf-verify`,
> `perf-adversary`. Policy: `test-reports/perf-optimize-policy.json`.

## Slash commands (één startpunt)

| Commando | `runMode` | Wat gebeurt autonoom |
|----------|-----------|----------------------|
| **`/perf-pipeline`** | `full` | Scout → scroll → board-actions → loop (architect → **optimize** → verify → deploy → adversary → push) |
| **`/perf-optimize`** | `full` | **Zelfde als `/perf-pipeline`** — alias voor “alles aan” |
| `/perf-pipeline resume` | `resume` | Hervat `perf-pipeline-state.json` |
| `/perf-pipeline scout` | `scout-only` | Alleen meten, geen fixes |

> **`/perf-optimize` zonder backlog-id** = start orchestrator, niet alleen de Fixer-stap.
> **`/perf-optimize BL-003`** of bestaand fix-plan = alleen Fixer (zie skill `perf-optimize`).

**Eén zin volstaat:** typ **`/perf-optimize`** of **`/perf-pipeline`** — agent leest deze skill, zet `runMode: full`, werkt zonder tussenvragen door tot `completed` / `blocked`.

---

## Wanneer gebruiken (natuurlijke taal)

| Trigger | `runMode` | Actie |
|---------|-----------|-------|
| **`/perf-pipeline`**, **`/perf-optimize`**, *"zet perf pipeline aan"* | **`full`** | Volledige autonome run |
| *"start perf pipeline"* | `full` | Zelfde |
| *"perf-orchestrate resume"*, `/perf-pipeline resume` | `resume` | Hervat state |
| *"perf scout only"*, `/perf-pipeline scout` | `scout-only` | Alleen meten |

Pipeline wordt **handmatig gestart** (policy `pipelineSchedule: manual`), maar **`runMode: full` draait daarna autonoom** door alle skills inclusief `perf-optimize` per backlog-item.

---

## Workflow

```
Orchestrate Progress:
- [ ] Stap 0: Policy + env-check
- [ ] Stap 1: State laden of initialiseren (runMode!)
- [ ] Stap 2: Scout (perf-scout J1–J3)
- [ ] Stap 2b: Scroll scout (perf-scroll J4+)
- [ ] Stap 2c: Board actions (perf-board-actions J7/J8)
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
  "runMode": "full",
  "iteration": 0,
  "maxIterations": 10,
  "l5ExperimentsUsed": 0,
  "currentPhase": "scout",
  "backlogItemId": null,
  "environmentUrl": "<azure-dev-url>",
  "autonomy": {
    "askUserBetweenPhases": false,
    "commitLocally": true,
    "pushAfterGreen": true,
    "deployPreviewBeforeAzureVerify": true
  },
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

## Stap 2 — Scout (J1–J3)

Roep **`perf-review`** / **`playwright/perf-scout.js`** aan:

- Profielen **M + L** (policy `scoutProfiles`)
- Journeys J1–J3: `/`, `/rccp`, terugkeer `/` na `/rccp`
- Output: `test-reports/perf-backlog.json` + update `perf-baseline.json`

## Stap 2b — Scroll scout (J4+)

Roep skill **`perf-scroll`** aan:

```bash
PERF_PROFILE=M TEST_BASE_URL=<url> node playwright/perf-scroll.js
PERF_PROFILE=L TEST_BASE_URL=<url> node playwright/perf-scroll.js
```

- Voegt BL-004 (J4 scroll jank) toe aan backlog
- Merge scroll-metrics in baseline + `public/perf-baseline.json` (HUD)

Sla state op: `currentPhase: "board-actions"` → daarna `"loop"` (tenzij `runMode: scout-only` → `paused`).

## Stap 2c — Board actions (J7/J8)

Roep skill **`perf-board-actions`** aan (filter Apply + text style Bold):

```bash
PERF_PROFILE=M TEST_BASE_URL=<url> node playwright/perf-board-actions.js
PERF_PROFILE=L TEST_BASE_URL=<url> node playwright/perf-board-actions.js
```

- Voegt BL-005 (J7), BL-006 (J8) toe aan backlog
- Vereist **admin** login voor J8

Sla state op: `currentPhase: "loop"` (tenzij `runMode: scout-only` → `paused`).

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
  result = perf-verify(plan)          // lokaal test/build + profielen
  IF runMode full AND policy deployPreview:
    → lees skill develop-from-devops, modus preview (commit+push+preview URL)
    → zet environmentUrl op nieuwe DEV/preview URL
  resultAzure = partial journey re-measure on Azure
  IF NOT result.pass AND NOT resultAzure.pass: revert; retry of skip
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

**`runMode: full` — autonomie:** vraag de gebruiker **niet** om akkoord tussen fases. Commit lokaal, deploy preview, push draft PR. Alleen stoppen bij echte blockers (zie reference.md).

**L5-limiet:** max `l5ExperimentsInV1` (default 1) per run. Tel bij in state `l5ExperimentsUsed`.

---

## Stap 4 — Afronden

1. Update state: `status: completed|blocked`, `finishedAt`
2. Schrijf `test-reports/perf-pipeline-summary-<datum>.md` (technisch) **en**
   `test-reports/perf-user-report-<datum>.md` (compact, tester — zie perf-review user-report-template):
   - Iteraties uitgevoerd
   - Items opgelost / skipped / blocked
   - UX-winsten (elapsedWall) per journey
   - Server-metric (informatief)
   - Open backlog-items
   - Draft PR-URLs
   - **Wat de gebruiker kan testen + PERF HUD vóór/na**

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
