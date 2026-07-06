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
8. In de formule-dialog stel je opmaakregels (operator, waarde, kleur uit palet) + doel (rij/cel) in; de uitkomst kleurt rij of cel volgens de eerste matchende regel. Max één kolom mag de rij kleuren; een tweede rij-doel wordt geweigerd.
9. Bestaande kolomtypes en boardfunctionaliteit blijven werken.

---

## Scope en keuzes (vastgelegd)

- Alleen **master/hoofdtabel**-kolommen; regelniveau (detail) buiten scope (v2).
- Formulekolom is **altijd read-only**, **server-side** berekend in `read()`.
- Refs alleen naar bestaande, **niet-formule master**-kolommen (geen cycli).
- **Resultaattype kiest de gebruiker** en wordt het gewone `data_type` — geen nieuw datatype.
- Rechten: zelfde als andere eigen kolommen.
- Syntax: `ALS(...;...;...)`, operatoren `+ - * / > < >= <= = <>`, kolomref `(key)`, `;`-scheider, **punt-decimaal**, string-literals `'...'`.
- Functieset v1: **alleen `ALS` + operatoren**.
- Reken-/foutregels: lege operand = 0; `datum ± getal = datum`, `datum − datum = getal (dagen)`; echte fout → lege cel + tooltip-reden.
- **Voorwaardelijke opmaak:** per formulekolom regels `{operator, waarde, kleur}` (eerste match wint), doel rij of cel, kleuren uit het bestaande grouping-palet. Max één kolom met rij-doel per tabel. Opslag in `formula_format_json`; `read()` levert `row.rowColor` + `row.cellColors`.

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
**Beschrijving:** Idempotente migratie voegt `formula_expr NVARCHAR(MAX)` toe aan `tb_columns`; `TableRegistryService` (`mapColumnRow`, kolom-SELECT, `getColumnById`) leest het veld mee als `formulaExpr`.
**Acceptatiecriteria:**
1. Migratie is idempotent (`IF NOT EXISTS`) en draait via `npm run migrate:db`.
2. `getColumnById` en `listColumns` geven `formulaExpr` terug.

### Story B: Formule-engine
**Beschrijving:** Nieuw `server/utils/tableFormulaEngine.js` met tokenizer + recursive-descent parser → AST en aparte `compile`/`evaluate`; geen `eval`. Coalescing (leeg=0), datum-rekenregels en cast naar resultaattype.
**Acceptatiecriteria:**
1. Ondersteunt `ALS`, operatoren, kolomref `(key)`, string-literals, punt-decimaal.
2. Runtime-fouten leveren `{ value: null, error }`; recursiediepte/lengte begrensd.

### Story C: Read-integratie + read-only + fout-tooltip
**Beschrijving:** In `read()` formulekolommen eenmaal compileren en per rij evalueren; fouten in `row.formulaErrors`. `saveCustomValue` weigert bij `formula_expr IS NOT NULL`.
**Acceptatiecriteria:**
1. Berekende waarde staat in `values[key]`; foutreden in `formulaErrors[key]`.
2. `saveCustomValue` op een formulekolom geeft 400.

### Story D: Dependency-guard bij verwijderen
**Beschrijving:** `deactivateColumn` blokkeert verwijderen wanneer een actieve formule naar de kolom-key verwijst; melding noemt de gebruikende formulekolom.
**Acceptatiecriteria:**
1. Verwijderen van een gerefereerde kolom geeft een 4xx met leesbare melding.

### Story E: Frontend formule-dialog
**Beschrijving:** Aparte formule-dialog met resultaattype-keuze, formule-tekstvak en kolom-picker die `(key)` invoegt; inline save-time validatiefouten; hergebruikt voor bewerken. Bevat ook de opmaak-sectie (Story G). Gekoppeld aan de `+ Kolom rechts toevoegen`-flow.
**Acceptatiecriteria:**
1. Dialog maakt en bewerkt een formulekolom; picker voegt refs in.
2. Nieuwe kolom landt rechts van de bronkolom.

### Story G: Voorwaardelijke opmaak (regels → kleur)
**Beschrijving:** Per formulekolom regels `{operator, waarde, kleur}` (eerste match wint), doel rij/cel, kleuren uit het grouping-palet. Opslag in `formula_format_json`; `read()` toetst de regels en levert `row.rowColor` + `row.cellColors`. Conflictregel: max één rij-doel per tabel (bij opslaan afgedwongen). Rendering van rij-/celkleur in het board met bepaalde precedentie t.o.v. grouping/nieuw-gewijzigd.
**Acceptatiecriteria:**
1. Regels instelbaar in de formule-dialog met doelkeuze en palet-kleuren.
2. Uitkomst kleurt rij of cel volgens de eerste matchende regel.
3. Tweede rij-doel wordt bij opslaan geweigerd met melding.
4. Errored/niet-matchende uitkomst geeft geen kleur en verstoort nieuw/gewijzigd-accenten niet.

### Story F: Tests + versie
**Beschrijving:** Unit tests engine (geldig, syntaxfout, onbekende kolom, deling-door-nul→leeg, lege operand=0, datum-rekenen, vier resultaattypes), opmaakregels (eerste match / geen match / errored → geen kleur; tweede rij-doel geweigerd), read-only, dependency-guard, save-time validatie. Semver patch in `src/config/version.js`; componenten < 300 regels.
**Acceptatiecriteria:**
1. Tests groen via `npm test`.
2. Versie verhoogd; geen component > 300 regels.

---

## Versie document

Aangemaakt op basis van het lokale plan `~/.cursor/plans/dev_formulekolom-rechts_942a5fca.plan.md`; wijzig dit bestand bij nieuwe afspraken.
