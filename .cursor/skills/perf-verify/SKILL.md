---
name: perf-verify
description: >-
  Verifieert een perf-fix: npm test/build, perf-review regression op profielen
  S+M+L, browser-feature-test op blast radius, functionalInvariants check.
  UX-metric (elapsedWall) is enige merge-gate. Gebruik na perf-optimize.
  Triggers: "perf verify", "verifieer perf fix", "perf regression check".
---

# Perf Verify

> **Rol:** Verifier · **Skill:** `perf-verify`. Beoordeelt of een fix veilig en sneller is.
>
> **Input:** `test-reports/perf-fix-plan-<id>.json` + lokale commit  
> **Output:** `test-reports/perf-verify-<id>.md` + pass/fail  
> **Policy:** `test-reports/perf-optimize-policy.json`

---

## Workflow

```
Verify Progress:
- [ ] Stap 0: Fix-plan + baseline laden
- [ ] Stap 1: Unit tests + build
- [ ] Stap 2: Perf regression (S → M → L)
- [ ] Stap 3: Browser feature test (blast radius)
- [ ] Stap 4: Functional invariants
- [ ] Stap 5: Rapport + oordeel
```

Template: [report-template.md](report-template.md)

---

## Stap 0 — Voorbereiding

1. Lees fix-plan: `successCriteria`, `blastRadius`, `verifyProfiles`.
2. Lees baseline: `test-reports/perf-baseline.json` (per profiel indien aanwezig).
3. Seed juiste profiel vóór meting:
   ```bash
   node scripts/seed-perf-po-cache.js --orders=80    # S
   node scripts/seed-perf-po-cache.js --orders=500   # M
   node scripts/seed-perf-po-cache.js --orders=2000  # L
   ```
4. Meet op **Azure DEV** URL (`policy.environment.truth`).

---

## Stap 1 — Tests + build

```bash
npm test
npm run build
```

| Uitkomst | Verifier |
|----------|----------|
| Falen | **FAIL** — revert, status `blocked` |
| Slagen | Door naar stap 2 |

---

## Stap 2 — Perf regression

Roep **`perf-review`** aan (modus `regression`):

- Meet alleen `blastRadius` journeys uit fix-plan
- Profielen volgens `verifyProfiles` (default S, M, L)
- 3× meten, mediaan noteren

### Oordeel per actie

Vergelijk `elapsedWall` mediaan vs baseline:

| Verschil | Oordeel |
|----------|---------|
| ≤ −minGainMs (50 ms) of ≤ −25% | **WIN** |
| −25% … +25% en < +200 ms | **STABLE** (geen winst — fail voor merge) |
| > +25% of > +200 ms | **REGRESSION** — FAIL |

**Server `app`:** noteer informatief — **blokkeert niet** (policy Q3=C).

Playwright fallback: `TEST_BASE_URL=<azure-dev> node playwright/perf-screening.js`

---

## Stap 3 — Browser feature test

Roep **`browser-feature-test`** aan op geraakte routes:

- Console errors = 0
- Board/RCCP laadt visueel correct
- Geen auth/scope errors

---

## Stap 4 — Functional invariants

Check elke string uit fix-plan `functionalInvariants`:

| Invariant | Hoe verifiëren |
|-----------|----------------|
| Change indicators visible | Visueel / DOM check na sync |
| Supplier scope | Login als supplier-testaccount indien beschikbaar |
| Revision freshness | Vergelijk indicator na bekende wijziging |

Mislukt invariant → **FAIL** (zelfde als regressie).

---

## Stap 5 — Rapport + oordeel

Schrijf `test-reports/perf-verify-<id>.md` volgens template.

### Pass criteria (alle moeten gelden)

- [ ] npm test + build groen
- [ ] elapsedWall WIN op minstens één blast-radius actie (profiel M)
- [ ] Geen elapsedWall REGRESSION op enige gemeten actie
- [ ] functionalInvariants groen
- [ ] browser-feature-test groen

**PASS** → orchestrator roept `perf-adversary` aan.  
**FAIL** → orchestrator revert + retry/block.

---

## Uitkomst-matrix

| Uitkomst | Orchestrator actie |
|----------|-------------------|
| PASS + UX win | → Adversary |
| STABLE (geen winst) | revert → Architect volgende tier |
| REGRESSION | revert → retry (max 2×) |
| Tests rood | revert → blocked |
