---
name: perf-adversary
description: >-
  Test perf-fixes op scenario's die Verifier mist: duplicate reads, stale indicators,
  supplier scope, race conditions. Alleen A1+A5 blokkeren push (policy). Playwright-based.
  Gebruik na perf-verify PASS. Triggers: "perf adversary", "adversary check perf".
---

# Perf Adversary

> **Rol:** Adversary (Agent 5). Probeert perf-fixes kapot te maken.
>
> **Input:** `test-reports/perf-fix-plan-<id>.json` (na verify PASS)  
> **Output:** `test-reports/perf-adversary-<id>.md`  
> **Policy:** `test-reports/perf-optimize-policy.json`

---

## Workflow

```
Adversary Progress:
- [ ] Stap 0: Fix-plan + policy laden
- [ ] Stap 1: Omgeving (Azure DEV, profiel M+L)
- [ ] Stap 2: Scenario's A1–A5 uitvoeren
- [ ] Stap 3: Rapport + pass/fail
```

Zie [reference.md](reference.md) voor scenario-details.

---

## Stap 0 — Setup

1. Lees fix-plan: `adversaryScenarios`, `functionalInvariants`, `tier`.
2. Blocking scenarios uit policy: **`A1`, `A5`** — rest is warning-only.
3. Seed profiel M (500 PO) minimum; L (2000) als fix-plan tier ≥ L4.
4. Base URL: Azure DEV (`TEST_BASE_URL`).

---

## Stap 1 — Scenario's

Voer uit via Playwright (headless) of browser MCP indien beschikbaar.

| ID | Scenario | Blocking? |
|----|----------|-----------|
| **A1** | 2 tabs: `/` + `/rccp` parallel | **Ja** |
| A2 | Supplier-login na admin-fix | Nee (warning) |
| A3 | Hard refresh board tijdens load | Nee (warning) |
| A4 | Terugkeer `/` binnen 30 s na board-load | Nee (warning) |
| **A5** | Revision change → indicator zichtbaar | **Ja** |

### A1 — Parallel tabs (blocking)

1. Open tab 1: PO board `/`
2. Open tab 2: `/rccp` (zelfde sessie/context)
3. Wissel tussen tabs
4. **Pass:** geen duplicate-fetch storm; geen scope leak; beide views consistent
5. **Fail:** 2× identieke PO-read waar 1× volstaat; crash; stale cross-tab

### A5 — Stale indicators (blocking)

1. Load PO board met change indicators
2. Simuleer D365/revision update (seed script of admin sync indien beschikbaar)
3. **Pass:** indicators updaten na revision change
4. **Fail:** cache toont oude staat terwijl revision gewijzigd is

### A2–A4 — Warning only

Voer uit; noteer PASS/WARN/FAIL. **FAIL blokkeert push niet** (policy Q9=B).

---

## Stap 2 — Playwright script

Gebruik of extend `playwright/perf-adversary.js` (indien aanwezig):

```bash
TEST_BASE_URL=https://<azure-dev> node playwright/perf-adversary.js --plan=BL-001
```

Zonder script: handmatige stappen in browser MCP; log elke stap in rapport.

---

## Stap 3 — Rapport

Schrijf `test-reports/perf-adversary-<id>.md`:

```markdown
# Adversary — BL-001

## Blocking scenarios
| ID | Result | Notes |
|----|--------|-------|
| A1 | PASS | |
| A5 | PASS | |

## Warning scenarios
| ID | Result | Notes |
|----|--------|-------|
| A2 | WARN | … |

## Overall: PASS / FAIL
```

### Pass criteria

- A1 **PASS**
- A5 **PASS**
- A2/A3/A4 mogen WARN/FAIL zijn (documenteer)

**PASS** → orchestrator mag pushen + draft PR.  
**FAIL** → orchestrator revert + retry/block.

---

## Niet doen

- Geen push zelf
- Geen A2/A3/A4 als block gebruiken (tenzij policy wijzigt)
- Geen test op localhost alleen — Azure DEV is waarheid
