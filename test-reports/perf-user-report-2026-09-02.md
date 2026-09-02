# Perf — review

**Omgeving:** preview https://preview-header-push-line-wri.graysand-65442c41.northeurope.azurecontainerapps.io  
**Datum:** 2026-09-02  
**Verdict:** NIET GEMETEN (login faalde)

## Wat is gedaan
- Statische check van de PO-board-wijziging: geen extra load-calls; write-back alleen bij opslaan.
- Geen HUD-meting omdat inloggen op preview niet lukte.

## Wat jij kunt testen
1. Inloggen als staff, PO-board openen, ⚡ HUD linksonder.
2. Eén gepushte header-cel wijzigen: in Network één `correct-all-details`, in HUD `tb_correct_all_details`.
3. Meerdere rijen selecteren en bulk kiezen: meerdere van die calls, board-scroll mag niet trager voelen.

## PERF HUD (⚡ linksonder)
- Baseline blijft de bestaande (`public/perf-baseline.json`); deze run heeft niets overschreven.

## Nog open
- Hermeting board-load vs baseline na een werkende staff-sessie.
