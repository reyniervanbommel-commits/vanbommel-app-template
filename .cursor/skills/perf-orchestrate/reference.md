# perf-orchestrate — reference

## Run modes (`runMode` in state)

**Slash entry:** `/perf-pipeline` of `/perf-optimize` (zonder args) → `runMode: full`.

| Mode | Trigger | Gedrag |
|------|---------|--------|
| **`full`** | *"start perf pipeline full"*, *"perf pipeline auto"*, *"zet perf pipeline aan"* | Scout → scroll → loop tot backlog leeg of max iteraties — **geen tussenstops vragen** |
| **`scout-only`** | *"perf scout only"* | Alleen meten (scout + scroll + board-actions); state `paused`, geen optimize |
| **`resume`** | *"perf-orchestrate resume"* | Hervat `perf-pipeline-state.json` bij `currentPhase` |

Initialiseer state altijd met expliciete `runMode`:

```json
{
  "runId": "perf-2026-07-21T120000Z",
  "status": "running",
  "runMode": "full",
  "iteration": 0,
  "maxIterations": 10,
  "currentPhase": "scout",
  "autonomy": {
    "askUserBetweenPhases": false,
    "commitLocally": true,
    "pushAfterGreen": true,
    "deployPreviewBeforeAzureVerify": true
  }
}
```

---

## State machine — fases

```
scout → scroll → board-actions → loop → (per item) architect → optimize → verify → [deploy] → verify-azure → adversary → push → loop
```

| `currentPhase` | Volgende actie |
|----------------|----------------|
| `scout` | `perf-scout.js` M+L, dan `scroll` |
| `scroll` | `perf-scroll.js` M+L |
| `board-actions` | `perf-board-actions.js` M+L (admin voor J8) |
| `loop` | Pak hoogste open backlog-item |
| `architect` | `perf-architect` → fix-plan JSON |
| `optimize` | `perf-optimize` → lokaal commit |
| `verify-local` | `npm test`, `npm run build`, perf-verify profielen S+M+L |
| `deploy-preview` | **Bestaande skill** `develop-from-devops` modus **`preview`** — push branch, wacht op deploy, update `environmentUrl` |
| `verify-azure` | Her-scout journey van item op Azure DEV |
| `adversary` | `perf-adversary` A1+A5 blocking |
| `push` | `git push` + draft PR |
| `done-item` | baseline updaten, item `done`, terug naar `loop` |

### Stop / pause

| `status` | Wanneer |
|----------|---------|
| `running` | Actief |
| `completed` | Backlog leeg of max iteraties |
| `blocked` | Onherstelbare fout na retries |
| `paused` | Alleen `scout-only` of expliciet menselijk gate (PR merge) |

**MVP-gat dat `full` dicht:** vroeger stopte de run na partial verify op `deploy-wait`. In `runMode: full` ga door naar `deploy-preview` i.p.v. pauseren.

---

## Journeys

| ID | Skill / script | Metric |
|----|----------------|--------|
| J1 | perf-scout | elapsedWall — PO board hard load |
| J2 | perf-scout | elapsedWall — /rccp |
| J3 | perf-scout | elapsedWall + duplicate PO fetch |
| J4 | perf-scroll | maxLongFrameMs — vertical scroll |
| J5 | perf-scroll (optional) | expandStableMs — row expand |
| J6+ | perf-review screening | route/tab — fase v2/v3 |

---

## Backlog IDs (BL-xxx)

Automatisch gegenereerd in `perf-backlog.json`:

| ID | Typisch journey | Betekenis |
|----|-----------------|-----------|
| BL-001 | J1 | Traagste PO board load |
| BL-002 | J2 | RCCP route load |
| BL-003 | J3 | Terugkeer board — duplicate fetch / cache |
| BL-004 | J4 | Scroll jank PO board |
| BL-005 | J7 | Column filter Apply |
| BL-006 | J8 | Text style Bold toggle |
| BL-007+ | J5/J6+ | Expand, horizontale scroll, extra routes |

`priorityScore` bepaalt volgorde; status: `open` → `in-progress` → `verifying` → `done` | `skipped`.

---

## Autonomie-regels (`runMode: full`)

1. **Geen vragen** tussen scout, architect, optimize, verify — tenzij policy/blocker.
2. **Lokaal committen** na elke groene optimize (geen push tot verify+adversary groen).
3. **Deploy:** na local verify → preview push naar Azure DEV → azure verify.
4. **Git push + draft PR** na adversary groen; merge nooit automatisch (`prReview: always-human`).
5. **Revert** bij verify/adversary fail; max `retry.maxAttemptsPerItem` (2).
6. **Versienummer** bump in `src/config/version.js` bij optimize (perf-optimize skill).

### Blockers (echt stoppen)

- Policy ontbreekt
- Azure DEV down na deploy-poging
- `npm test` / build rood en niet fixbaar binnen tier
- Git push conflict — geen force push
- Geen credentials voor preview deploy — schrijf `status: blocked`, instructie in summary

---

## Retry / skip (verify fail)

```
IF verify fail:
  IF attempt < maxAttemptsPerItem:
    revert commit; architect met tier+1; retry
  ELSE:
    mark item skipped; volgende backlog-item
```

Regressie: alleen `elapsedWall` / scroll `maxLongFrameMs` blokkeert (policy `regression`).

---

## Artifact-paden

| Bestand | Rol |
|---------|-----|
| `test-reports/perf-optimize-policy.json` | MC-beslissingen |
| `test-reports/perf-pipeline-state.json` | State machine |
| `test-reports/perf-backlog.json` | Prioritized work |
| `test-reports/perf-baseline.json` | Pre/post metrics |
| `test-reports/perf-fix-plan-<BL>.json` | Architect output |
| `test-reports/perf-verify-<BL>.md` | Verifier |
| `test-reports/perf-adversary-<BL>.md` | Adversary |
| `test-reports/perf-pipeline-summary-<datum>.md` | Technisch eindrapport |
| `test-reports/perf-user-report-<datum>.md` | Compact voor tester |

---

## Commando's (agent voert zelf uit)

```bash
# Seed
node scripts/seed-perf-po-cache.js --orders=500
node scripts/seed-perf-po-cache.js --orders=2000

# Scout + scroll
PERF_PROFILE=M TEST_BASE_URL=<url> node playwright/perf-scout.js
PERF_PROFILE=L TEST_BASE_URL=<url> node playwright/perf-scout.js
PERF_PROFILE=M TEST_BASE_URL=<url> node playwright/perf-scroll.js
PERF_PROFILE=L TEST_BASE_URL=<url> node playwright/perf-scroll.js
```
