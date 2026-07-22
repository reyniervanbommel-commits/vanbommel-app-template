# Formulekolom in rechterkolom (v1) (DevOps)

**Doel:** Een read-only formulekolom die via "kolom rechts toevoegen" wordt aangemaakt en per orderrij server-side wordt berekend met NL Excel-achtige syntax (ALS + operatoren).
**Work item:** [Feature #187](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/187) (child stories #188–#194)
**Plan (lokaal, buiten repo):** `~/.cursor/plans/dev_formulekolom-rechts_942a5fca.plan.md`
**Tags:** table-builder; formule; kolommen; backend; frontend

---

## User story

**Als** gebruiker van het PO-board
**wil ik** een kolom kunnen toevoegen die een waarde berekent uit andere kolommen (bijv. `ALS((a)>(b);'Fout';(a)+(b))`)
**zodat** ik afgeleide informatie zie zonder handmatig in te voeren of te exporteren naar Excel.

---

## Acceptatiecriteria (definitie van "klaar")

1. Vanuit `+ Kolom rechts toevoegen` opent een formule-dialog met keuze resultaattype, formule-tekstvak en een kolom-picker die `(key)` invoegt.
2. De formulekolom verschijnt direct rechts van de bronkolom en toont per orderrij de berekende waarde zonder handmatige invoer.
3. `=ALS((kolom1)>(kolom2);'Fout';(kolom1)+(kolom2))` wordt correct verwerkt; lege operand telt als 0; deling door nul geeft een lege cel met tooltip-reden.
4. Elk van de vier resultaattypes werkt: getal, tekst, datum (incl. `datum ± getal` en `datum − datum`), ja/nee (via vergelijking).
5. Handmatig bewerken van een formulekolomwaarde is geblokkeerd (`saveCustomValue` weigert).
6. Een ongeldige formule (syntaxfout of onbekende/formule/detail-referentie) kan niet worden opgeslagen; de dialog toont de reden.
7. Een gewone kolom kan niet worden verwijderd zolang een formule ernaar verwijst; de melding noemt de gebruikende formulekolom.
8. In de opmaak-sectie stel je per formulekolom regels (operator, vergelijkwaarde als vaste waarde óf kolomref, kleur uit palet) + doel (rij/cel) in; instellingen worden **per gebruiker** bewaard en de uitkomst kleurt rij of cel volgens de eerste matchende regel. Max één kolom mag de rij kleuren; een tweede rij-doel wordt geweigerd.
9. Precedentie: 'verwijderd in D365' > voorwaardelijke opmaak > nieuw/gewijzigd (die als zij-accent zichtbaar blijven); tekst-opmaak blijft leesbaar.
10. Bestaande kolomtypes, tekst-opmaak en boardfunctionaliteit blijven werken.

---

## Scope en keuzes (vastgelegd)

- Alleen **master/hoofdtabel**-kolommen; regelniveau (detail) buiten scope (v2).
- Formulekolom is **altijd read-only**, **server-side** berekend in `read()`.
- Refs alleen naar bestaande, **niet-formule master**-kolommen (geen cycli).
- **Resultaattype kiest de gebruiker** en wordt het gewone `data_type` — geen nieuw datatype.
- Rechten: zelfde als andere eigen kolommen.
- Syntax: `ALS(...;...;...)`, operatoren `+ - * / > < >= <= = <>`, kolomref `(key)`, `;`-scheider, **punt-decimaal**, string-literals `'...'`.
- Functieset v1: `ALS`/`IF` + operatoren.
- **Functieset v2 (2026-07-22, #AB:187):** `TODAY()` (huidige datum, UTC-middernacht — één keer per read berekend en gedeeld door alle rijen/formules in die response, zodat de kost gelijk blijft aan v1 en de waarde binnen één board-load consistent is), `AFRONDEN(getal;decimalen)` / `ROUND` (alias), `ABS(getal)`, `MAX(...)`, `MIN(...)`. Dagen→weken: `AFRONDEN(((TODAY())-(leverdatum))/7;0)`. `IF` toegevoegd als Engelse alias van `ALS` (app-UI is Engels). Bewust **niet** toegevoegd: `NOW()` (kolommen zijn datum-only, tijdstip zou verwarring geven), feestdagenkalender-functie (vereist een DB-lookup — buiten scope, apart te plannen als er behoefte aan is).
- **Werkdagen (2026-07-22, #AB:187):** `NETWERKDAGEN(start;eind)` / `NETWORKDAYS` (Engelse alias) telt het aantal weekdagen (ma-vr) tussen twee datums, weekend uitgesloten. Zelfde teken/nul-gedrag als het `-`-operator-datumverschil: gelijke datum → `0`, `eind` na `start` → positief, omgekeerde volgorde → negatief. Puur dag-van-de-week-rekenwerk (geen feestdagenkalender/DB-lookup), dus even goedkoop als de andere functies. Werkweken: `AFRONDEN(NETWERKDAGEN((leverdatum);(TODAY()))/5;0)`.
- Reken-/foutregels: lege operand = 0; `datum ± getal = datum`, `datum − datum = getal (dagen)`; echte fout → lege cel + tooltip-reden.
- **Live update na cel-edit (2026-07-22, #AB:187):** `saveCustomValue`/`correctField` herberekenen — best-effort, na de eigenlijke waarde-opslag — de formulekolommen van **die ene rij** (master-scope) en sturen `formulaValues`/`formulaErrors` mee in de save-response (`TableDataService.recalculateMasterRowFormulas`). Geen extra database-call wanneer de tabel geen formulekolommen heeft (guard getest in `TableDataService.test.js`) en geen volledige board-refresh nodig: de frontend (`usePurchaseOrdersPage.saveValue`/`correctField`) patcht de order-rij direct met de nieuwe waarden. Detail/regel-edits triggeren geen herberekening (formules mogen sowieso geen detail-kolom refereren); een formule die een via board-settings gekoppelde regel-totaal/-waarde-kolom refereert, wordt pas na de volgende board-refresh bijgewerkt (bewuste scope-keuze, geen bekende use-case).
- **Voorwaardelijke opmaak (per gebruiker, client-side):** per formulekolom gestructureerde regels `{op, value|valueRef, color}` (eerste match wint), doel rij of cel, kleuren uit het bestaande grouping-palet. Vergelijkwaarde mag een vaste waarde óf kolomreferentie zijn (`valueRef` client-side per rij geresolved; niet-bestaande kolom → geen match). **Opslag in board-settings per gebruiker** (zoals de bestaande tekst-opmaak via `persistBoardSettings`), NIET in `tb_columns`. Evaluatie **client-side** in de board-render (uitkomst staat al in `row.values`); de server levert geen kleuren. Max één kolom met rij-doel per tabel (client-side afgedwongen).
- **Aansluiting op bestaande code (DEV 2026-07-06):** kolommenu opgesplitst (`PurchaseOrderColumnFilterMenu` + `...Panels` + `...Constants`); board-render opgesplitst; er bestaat al kolomtekst-opmaak (`columnTextStyleUtils`, `saveHeaderColumnTextStyle`) — de formule is gedeelde kolomdefinitie, de opmaak volgt het per-gebruiker tekst-opmaak-patroon.
- **Precedentie rij-accenten:** grouping-kleur staat op de groeps-kopregel (geen conflict); tekst-opmaak is voorgrond (geen conflict). Op een datarij-achtergrond: 'verwijderd in D365' > voorwaardelijke opmaak > nieuw/gewijzigd (die van rij-achtergrond naar een zij-accent/rand-badge verhuizen).

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Add-flow "kolom rechts toevoegen" + positionering (pendingInsertAfter) | src/hooks/usePurchaseOrdersPage.js |
| Kolomcreatie/rename/soft-delete backend | server/services/TableColumnsService.js |
| Read-flow uit tb_cache + custom-values | server/services/TableDataService.js |

---

## Backlog — child User Stories

### Story A: DB-migratie + kolom-metadata
**Beschrijving:** Idempotente migratie voegt **alleen** `formula_expr NVARCHAR(MAX)` toe aan `tb_columns` (opmaak komt niet in de DB — die staat per gebruiker in board-settings); `TableRegistryService` (`mapColumnRow`, kolom-SELECT, `getColumnById`) leest het veld mee als `formulaExpr`.
**Acceptatiecriteria:**
1. Migratie is idempotent (`IF NOT EXISTS`) en draait via `npm run migrate:db`.
2. `getColumnById` en `listColumns` geven `formulaExpr` terug.

### Story B: Formule-engine
**Beschrijving:** Nieuw `server/utils/tableFormulaEngine.js` met tokenizer + recursive-descent parser → AST en aparte `compile`/`evaluate`; geen `eval`. Coalescing (leeg=0), datum-rekenregels en cast naar resultaattype.
**Acceptatiecriteria:**
1. Ondersteunt `ALS`, operatoren, kolomref `(key)`, string-literals, punt-decimaal.
2. Runtime-fouten leveren `{ value: null, error }`; recursiediepte/lengte begrensd.

### Story C: Read-integratie + read-only + fout-tooltip
**Beschrijving:** In `read()` formulekolommen eenmaal compileren en per rij evalueren (na `masterValues`/`applyLookups`); fouten in `row.formulaErrors`. Geen opmaak-berekening server-side. `saveCustomValue` weigert bij `formula_expr IS NOT NULL` (bestaande guard blokkeert alleen `source !== 'custom'`).
**Acceptatiecriteria:**
1. Berekende waarde staat in `values[key]`; foutreden in `formulaErrors[key]`.
2. `saveCustomValue` op een formulekolom geeft 400.

### Story D: Dependency-guard bij verwijderen
**Beschrijving:** `deactivateColumn` blokkeert verwijderen wanneer een actieve formule via zijn **formule-expressie** naar de kolom-key verwijst; melding noemt de gebruikende formulekolom. Opmaak-`valueRef` valt hierbuiten (per gebruiker, client-side; degradeert netjes bij verwijderde kolom).
**Acceptatiecriteria:**
1. Verwijderen van een via de formule-expressie gerefereerde kolom geeft een 4xx met leesbare melding.

### Story E: Frontend formule-dialog
**Beschrijving:** Aparte formule-dialog met resultaattype-keuze, formule-tekstvak en kolom-picker die `(key)` invoegt; inline save-time validatiefouten; hergebruikt voor bewerken. Bevat ook de opmaak-sectie (Story G). Koppelt aan de bestaande `onAddColumnRightOf`-flow; `NEW_COLUMN_TYPES` staat nu in `purchaseOrderColumnFilterMenuConstants.js` (menu opgesplitst).
**Acceptatiecriteria:**
1. Dialog maakt en bewerkt een formulekolom; picker voegt refs in.
2. Nieuwe kolom landt rechts van de bronkolom.

### Story G: Voorwaardelijke opmaak (regels → kleur) — per gebruiker, client-side
**Beschrijving:** Per formulekolom gestructureerde regels `{op, value|valueRef, color}` (eerste match wint), doel rij/cel, kleuren uit het grouping-palet. **Opslag in board-settings per gebruiker** via `persistBoardSettings` (nieuwe `columnFormatRules`-map + `saveColumnFormatRules`), NIET in de DB. Evaluatie **client-side** via nieuwe `columnFormatRuleUtils.evalFormatRules(uitkomst, ruleSet, rowValues)` in de board-render; `valueRef` per rij geresolved (niet-bestaande kolom → geen match). Conflictregel client-side: max één rij-doel. Rendering met vastgelegde precedentie: verwijderd > opmaak > nieuw/gewijzigd (laatste wordt zij-accent); refactor `getOrderRowClassName` in PurchaseOrdersBoardRows.jsx; cel-achtergrond compose met `getColumnCellStyle` (nu 3-arg).
**Acceptatiecriteria:**
1. Regels instelbaar met doelkeuze, palet-kleuren en vergelijkwaarde als vaste waarde óf kolomref; per gebruiker bewaard.
2. Uitkomst kleurt rij of cel volgens de eerste matchende regel; `valueRef` client-side per rij geresolved.
3. Tweede rij-doel wordt bij opslaan geweigerd met melding.
4. Precedentie klopt: verwijderd houdt voorrang, opmaak wint van nieuw/gewijzigd, nieuw/gewijzigd blijft als zij-accent zichtbaar.
5. Errored/niet-matchende uitkomst of `valueRef` naar verwijderde kolom geeft geen kleur (geen crash).

### Story F: Tests + versie
**Beschrijving:** Unit tests engine (geldig, syntaxfout, onbekende kolom, deling-door-nul→leeg, lege operand=0, datum-rekenen, vier resultaattypes), `evalFormatRules` (eerste match / geen match / errored → geen kleur; valueRef geresolved; ontbrekende valueRef-kolom → geen match; tweede rij-doel geweigerd), read-only, dependency-guard, save-time validatie. Semver patch in `src/config/version.js`; componenten < 300 regels.
**Acceptatiecriteria:**
1. Tests groen via `npm test`.
2. Versie verhoogd; geen component > 300 regels.

---

## Versie document

Aangemaakt op basis van het lokale plan `~/.cursor/plans/dev_formulekolom-rechts_942a5fca.plan.md`; wijzig dit bestand bij nieuwe afspraken.
