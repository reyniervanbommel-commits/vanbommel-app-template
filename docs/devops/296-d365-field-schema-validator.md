# Data model: D365-veldvalidatie (Validate fields) (DevOps)

**Doel:** Een niet-destructieve "Validate fields"-knop op de Data model-beheerpagina die actieve D365-bronvelden per kolom checkt tegen een live sample, zodat een admin een hernoemd/verwijderd veld ziet vóórdat het — zoals in commit `adf9201` — de nachtelijke PO-refresh breekt.
**Referentie in repo:** [docs/specs/2026-08-30-d365-field-schema-validator-design.md](../specs/2026-08-30-d365-field-schema-validator-design.md) (BRD/FRD/TD, incl. Fase 4 team-review — groen, geen resterende blockers)
**Work item:** #AB:296 (child van Feature #142 — Architectuur- & tech-debt-verbeteringen / D365-resilience)
**Tags:** d365; resilience; data-model; admin; tech-debt

---

## User story

**Als** admin (rol `admin`) die de Data model-beheerpagina gebruikt
**wil ik** op elk moment kunnen checken of de D365-bronvelden achter de actieve kolommen van een tabel nog echt bestaan in D365
**zodat** ik een hernoemd, verwijderd of nooit-bestaand veld zie vóórdat ik het weer aanzet, en niet pas nadat het de nachtelijke sync heeft geraakt.

---

## Acceptatiecriteria (definitie van "klaar")

1. Een knop "Validate fields" staat op elke tab van de Data model-pagina (Purchase orders, Vendors, Items, Product receipt lines), naast de bestaande "Discover D365 fields".
2. Een klik haalt een live D365-sample op (60 rijen, geen `$select`) en vergelijkt elk actief bronveld tegen de teruggegeven veldnamen.
3. Elke getroffen kolom krijgt een rode Fluent `Badge` ("Not found in D365") inline in de bestaande D365-veldkolom, met een `Tooltip`.
4. Een `MessageBar` toont hoeveel kolommen zijn geraakt (of een "alles klopt"-melding, of een "kon niet checken"-melding bij een lege sample).
5. Validate fields wijzigt niets in `tb_columns` — puur diagnose, geen INSERT/UPDATE/DELETE.
6. Werkt op alle vier de tabs; reproduceerbaar op het `adf9201`-scenario (`RemainingPurchasePhysicalQuantity`) zonder dat `tb_columns` verandert.

---

## Wat is al gedaan (geen tasks meer nodig tenzij verificatie)

Nog niets geïmplementeerd — het ontwerp is klaar en heeft de verplichte team-review doorlopen. Aanpak is tijdens research bewust bijgesteld: geen nieuwe D365 `$metadata`-fetch (het oorspronkelijke idee), maar hergebruik van de al bestaande, vertrouwde sample-based discovery-machinery (`discoverSourceFields`, het `adf9201`-zelfherstelpad) in een nieuwe, read-only variant.

_(Leeg tot implementatie start)_

---

## Backlog — tasks

- [ ] `fetchFieldDiscoverySample(table)` extraheren uit `discoverSourceFields` (gedrag ongewijzigd, bestaande tests blijven groen).
- [ ] `protectedSourceFieldsForTable(table, scope)` extraheren uit `syncSourceColumnsFromRecords` + equivalence-test vóór de refactor. `dropIllegalSelectSourceColumns` (het hard-delete-zelfherstelpad) blijft bewust ongewijzigd/buiten scope.
- [ ] `validateSourceFields(tableKey)` + co-located tests.
- [ ] Route `POST /:tableKey/validate-fields` + test (403 zonder admin-rol, 200 met verwachte vorm).
- [ ] `dataModelInfoCopy.js`: `validateFields`-entry.
- [ ] Nieuwe hook `src/hooks/useD365FieldValidation.js` + tests.
- [ ] `AdminDataModel.jsx`: vier `useD365FieldValidation(tableKey)`-aanroepen, rechtstreeks — `useDataModelAdmin.js` blijft ongemoeid (0 regels gewijzigd).
- [ ] `DataPreviewTables.jsx`: "Validate fields"-knop + `fieldValidation`-prop.
- [ ] `AdminDataModel.jsx`: `formatValidationMessage` + tweede `MessageBar` (warning) + foutregel.
- [ ] `EntityConfigTable.jsx`: `staleSourceFields`-prop, per-rij `isStaleSourceField`, gebundelde `columnFlags`-prop naar `DataPreviewColumnConfigRow`.
- [ ] `DataPreviewColumnConfigRow.jsx`: `columnFlags`-prop i.p.v. losse `isRelationField` (houdt het component op 10 props); rode Badge + Tooltip.
- [ ] Handmatige verificatie op localhost (adf9201-scenario simuleren, bevestigen dat `tb_columns` ongewijzigd blijft).
- [ ] PATCH in `src/config/version.js`.

## Aantoonbaar

- Actieve bronkolom met niet-bestaand veld (het adf9201-scenario) → na klik: rode Badge zichtbaar, `MessageBar` toont aantal, `tb_columns` blijft ongewijzigd.
- Alle actieve velden bestaan → geen Badges, korte succesmelding.
- Lege D365-sample → geen valse Badges, aparte "kon niet checken"-melding.
- "Discover D365 fields" blijft ongewijzigd werken (voegt nog steeds toe/verwijdert).

---

## Versie document

Aangemaakt op basis van [docs/specs/2026-08-30-d365-field-schema-validator-design.md](../specs/2026-08-30-d365-field-schema-validator-design.md); wijzig dat bestand bij nieuwe afspraken, dit document en het work item volgen.
