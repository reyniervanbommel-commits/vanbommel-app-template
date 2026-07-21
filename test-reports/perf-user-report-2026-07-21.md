# Perf user report — 2026-07-21

## Wat is gedaan

Volledige `/perf-pipeline` run (scout → board-actions → fix → preview → verify → adversary).

## Preview (testen)

**URL:** https://preview-perf-pipeline-skills-v1.graysand-65442c41.northeurope.azurecontainerapps.io  
**Branch:** `feature/perf-pipeline-skills-v1.3`  
**Versie:** v1.30.30

### Test dit

1. Open PO board → kolommenu → **Text style** → toggle **Bold** — moet vrijwel direct voelen (niet wachten op save).
2. Herlaad pagina — bold blijft staan.
3. Optioneel: `/` → RCCP → terug naar PO — check PERF HUD of volle PO-read wordt overgeslagen bij ongewijzigde data.

## Resultaat BL-006 (text style)

| | Voor | Na |
|--|-----:|---:|
| textStyleApplyMs | ~10149 | ~2000 |

## Nog open

- **BL-003** — terugkeer board nog traag (wall ~256 ms); duplicate fetch 0, wel zware API-labels
- **BL-005** — filter Apply nog niet gefixt deze iteratie
- **J4 scroll** — niet gemeten (geen scroll-overflow op huidige dataset)

## Draft PR

Zie GitHub PR van branch `feature/perf-pipeline-skills-v1.3` (menselijke review verplicht).
