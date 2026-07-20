---
name: perf-optimize
description: >-
  Voert één perf-fix-plan uit (tier L0–L5): code wijzigen, lokaal committen,
  geen push. Respecteert policy (cache, autonomie, component-grootte).
  Gebruik na perf-architect of wanneer orchestrator de Fixer-fase start.
  Triggers: "perf optimize", "voer fix plan uit", "perf-fix implementeren".
---

# Perf Optimize

> **Rol:** Fixer (Agent 3). Implementeert precies één fix-plan.
>
> **Input:** `test-reports/perf-fix-plan-<id>.json`  
> **Output:** lokale git commit (geen push)  
> **Policy:** `test-reports/perf-optimize-policy.json`

---

## Workflow

```
Optimize Progress:
- [ ] Stap 0: Fix-plan + policy valideren
- [ ] Stap 1: Pre-change checklist
- [ ] Stap 2: Implementatie (tier-specifiek)
- [ ] Stap 3: Lokale commit
```

Zie [reference.md](reference.md) voor tier-checklists en cache-regels.

---

## Stap 0 — Validatie

1. Lees fix-plan: `tier`, `targetFiles`, `steps`, `functionalInvariants`.
2. Controleer `tier ≤ policy.autonomyMaxTier`.
3. L5: controleer orchestrator state `l5ExperimentsUsed < l5ExperimentsInV1`.
4. Bestand > 250 regels → **splits eerst** (code-kwaliteit regel) vóór L5.

---

## Stap 1 — Pre-change checklist

1. Bestandsgrootte < 300 regels per component
2. Geen API keys in code
3. UI-strings Engels (`app-taal.mdc`)
4. Nieuwe backend-route → Server-Timing via middleware (automatisch)
5. Zware suboperatie → `time()` uit `server/utils/timing.js`
6. Nieuwe frontend API-call → `apiRequest` (nooit raw `fetch`)
7. Zware client-berekening → `measure()` uit `src/utils/perf.js`

---

## Stap 2 — Implementatie per tier

Volg **exact** de `steps` uit het fix-plan. Wijk niet af zonder Architect-update.

| Tier | Focus |
|------|-------|
| L0 | Alleen instrumentatie — geen gedragswijziging |
| L1 | Memoization, handler-stabilisatie, kleine render-fix |
| L2 | SQL migratie idempotent in `scripts/db/migrations/`; dev + prod note in commit |
| L3 | Cache met revision invalidation; cross-page unlimited per policy |
| L4 | Dedupe/coalesce API reads; check blast radius J3 |
| L5 | Virtualisatie of structurele split; max 1 experiment per run |

### Cache (L3) — verplicht

- `crossPageTtlPolicy: unlimited-until-revision`
- Invalidate op `tb_revision` change
- **Geen** TTL-based invalidation bij page-switch
- Cache keys scoped per user + supplier scope

### SQL (L2) — migratie

```bash
# Na migratie-script toevoegen
npm run migrate:db   # dev
# prod: via deploy-prod.yml bij merge main
```

---

## Stap 3 — Lokale commit

```bash
git add <bestanden>
git commit -m "perf: <korte beschrijving> [BL-001 tier L3]"
```

**Niet pushen.** Orchestrator roept `perf-verify` aan; push pas na verify + adversary.

Commit body bevat:

- Backlog-item ID
- Tier + tak (R/N/S/C)
- Hypothesis uit fix-plan
- Aangenomen trade-offs (cache, stale)

---

## Stop / revert signalen

| Signaal | Actie |
|---------|-------|
| Tier > policy max | Stop — terug naar Architect |
| Component > 300 regels na wijziging | Revert — splits eerst |
| Tests falen lokaal | Fix of revert vóór commit |
| functionalInvariants onmogelijk | Stop — blocked, meld orchestrator |

---

## Niet doen

- Geen push / geen PR
- Geen batch van meerdere backlog-items
- Geen perf-fix buiten fix-plan scope
- Geen Nederlandse UI-strings
- Geen versienummer in footer tenzij user-visible wijziging (bij UI-touch: bump `src/config/version.js`)
