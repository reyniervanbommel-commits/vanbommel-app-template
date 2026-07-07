# Volledig Plan D365 Detectie (DevOps)

**Doel:** D365-refresh detectie volledig maken met consistente order/line/cel highlights, audittrail voor user- en D365-wijzigingen, en stabiele viewed-reset zonder regressies.  
**Referentie planbron:** `C:\Users\reynier\.cursor\plans\dev_d365-diff-volledig_07d41443.plan.md`  
**Tags:** d365; diff-detectie; purchase-orders; audittrail; usability

---

## User story

**Als** inkoper of planner op het purchase orders board  
**wil ik** exact zien wat nieuw, gewijzigd of verwijderd is (zowel vanuit D365 als door gebruikersacties)  
**zodat** ik sneller en met vertrouwen kan beoordelen wat aandacht nodig heeft en wat al gezien is.

---

## Acceptatiecriteria (definitie van "klaar")

1. Diff-detectie werkt op order-, line- en celniveau op basis van actieve D365 bronkolommen.
2. `tb_change_ledger` legt zowel user-mutaties als D365-wijzigingen vast met bron, actie en old/new waarde.
3. `markViewed` reset alle relevante highlights correct per gebruiker en scope.
4. Bestaand gedrag (`newCount`, `changedCount`, `removedInD365`, refresh-progress) blijft backward compatible.
5. UI blijft bruikbaar en voorspelbaar: duidelijke statusbetekenis, geen onnodige visuele ruis, geen refresh-jumps.
6. Backend/frontend/migratie/contract/race-condition tests dekken kritieke scenario's.
