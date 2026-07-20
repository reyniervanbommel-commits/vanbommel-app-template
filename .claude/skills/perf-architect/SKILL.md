---
name: perf-architect
description: >-
  Maakt een perf-fix-plan uit één backlog-item: beslisboom v2 (gap-routing),
  kiest fix-tier L0–L5, definieert successCriteria en functionalInvariants.
  Gebruik na perf-review/scout of wanneer orchestrator een fix-plan nodig heeft.
  Triggers: "perf architect", "fix plan voor perf", "perf-fix-plan".
---

# Perf Architect

> **Rol:** Architect · **Skill:** `perf-architect`. Plant de fix; wijzigt geen code.
>
> **Input:** één item uit `test-reports/perf-backlog.json`  
> **Output:** `test-reports/perf-fix-plan-<id>.json`  
> **Policy:** `test-reports/perf-optimize-policy.json`

---

## Workflow

```
Architect Progress:
- [ ] Stap 0: Backlog-item + policy laden
- [ ] Stap 1: Dominante post + gap-routing
- [ ] Stap 2: Tier kiezen (L0→L5)
- [ ] Stap 3: Fix-plan schrijven
```

Zie [reference.md](reference.md) voor beslisboom, tiers en schema.

---

## Stap 0 — Input

1. Lees backlog-item: `id`, `journey`, `action`, metrics (`elapsedWall`, `app`, `apiSum`), `dominantPost`, `labels`, `priorityScore`, `attemptedTiers[]`.
2. Lees policy: `gapRouting`, `autonomyMaxTier`, `cache`, `successCriteria`.
3. Sla vorige mislukte tiers over — kies **volgende** tier in L0→L5.

---

## Stap 1 — Gap-routing (beslisboom v2)

Bereken:

```
gapRender = elapsedWall − max(apiSum per actie)
gapNetwork = apiSum − app
```

| Conditie (policy) | Tak | Voorrang |
|-------------------|-----|----------|
| `gapRender ≥ gapRouting.renderIfElapsedMinusApiMsGte` (400) | **R** Render | **Boven SQL** — ook als `app` hoog op Azure |
| `gapNetwork ≥ gapRouting.networkIfApiMinusAppMsGte` (200) | **N** Netwerk | Na R |
| `app ≥ gapRouting.serverIfAppMsGte` (300) | **S** Server/SQL | Na R, N |
| Anders | **C** Client-berekening | Laatste |

**Regel v1.1:** R-tak heeft altijd voorrang als gapRender ≥ 400 ms.

Koppel tak aan concrete code-locaties via `perf-review` diagnose (labels, bestanden).

---

## Stap 2 — Tier kiezen

Probeer **laagste tier** die de tak adresseert. Escalatie na mislukte verify.

| Tier | Tak | Voorbeeld-fix |
|------|-----|---------------|
| **L0** | Meetgat | `time()` / `measure()` toevoegen |
| **L1** | C, R (micro) | `useMemo`, `useCallback`, kleine render-fix |
| **L2** | S | Index, query rewrite, kolomselectie |
| **L3** | N, S | Cache + revision invalidation (policy: unlimited cross-page) |
| **L4** | N | Dedupe reads, `Promise.all`, payload trim |
| **L5** | R | Virtualisatie, lazy load, component split |

**Limieten:**

- Niet boven `policy.autonomyMaxTier` (L5).
- L5: max `policy.l5ExperimentsInV1` per pipeline-run — check orchestrator state.
- Tier ≥ L4: plan **moet** adversary-scenario's A1 + A5 bevatten.

---

## Stap 3 — Fix-plan schrijven

Schrijf `test-reports/perf-fix-plan-<id>.json`:

```json
{
  "id": "BL-001",
  "backlogItemId": "BL-001",
  "journey": "J1",
  "action": "PO board-load /",
  "branch": "R",
  "tier": "L3",
  "hypothesis": "Duplicate PO fetch on return from BI; cache with revision invalidation",
  "targetFiles": ["src/services/TableDataService.js"],
  "steps": [
    "Add session-scoped PO read cache keyed by revision",
    "Invalidate on revision change from tb_revision label",
    "Do not invalidate on cross-page navigation (policy unlimited-until-revision)"
  ],
  "successCriteria": {
    "primary": {
      "metric": "elapsedWall",
      "baselineMs": 1779,
      "targetReductionPercent": 30,
      "minGainMs": 50
    },
    "secondary": {
      "metric": "app",
      "role": "informational"
    }
  },
  "functionalInvariants": [
    "Change indicators remain visible after D365 update",
    "Supplier users see only their PO scope"
  ],
  "adversaryScenarios": ["A1", "A5"],
  "blastRadius": ["J1", "J3"],
  "verifyProfiles": ["S", "M", "L"]
}
```

### Verplichte velden

- `successCriteria.primary` — UX (`elapsedWall`); enige merge-gate
- `successCriteria.secondary.role` — `"informational"` (policy Q3=C)
- `functionalInvariants` — minstens 1 bij cache/dedupe/L3+
- `adversaryScenarios` — A1 + A5 bij L3+; A2/A3/A4 optioneel (warning-only)
- `blastRadius` — journeys voor partial re-measure

---

## Escalatie na mislukking

| Verify resultaat | Architect actie |
|------------------|-----------------|
| Geen UX-winst | Zelfde tak, **volgende tier** |
| Regressie | Zelfde tier, **andere aanpak** (max 2×) → blocked |
| Tests rood | blocked — geen tier-escalatie |

Documenteer `attemptedTiers` in backlog-item.

---

## Niet doen

- Geen code wijzigen
- Geen push
- Geen server-metric als merge-gate (alleen informatief rapporteren)
- Geen L5 zonder L4 geprobeerd op dezelfde tak (tenzij L4 blocked)
