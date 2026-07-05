# Excel-koppeling naar hoofdtabel (via de tb_*-laag) (DevOps)

**Doel:** Admin uploadt een Excel als generieke bron (`tb_sources` provider_type `'excel'`), geregistreerd als platte tb_*-tabel en via een fk_join-relatie als read-only verrijkingskolommen aan een hoofdtabel gekoppeld.
**Referentie in repo:** [.cursor/plans/dev_excel-koppeling-hoofdtabel_184778a6.plan.md](../../.cursor/plans/dev_excel-koppeling-hoofdtabel_184778a6.plan.md)
**Work item:** Feature #162 (child stories #163–#168)
**Tags:** data-model; excel; tb-generiek; fk-join; upload; admin

---

## User story

**Als** admin van de Vendor-App
**wil ik** een Excel-bestand koppelen aan een hoofdtabel via een gedeelde sleutel en kiezen welke kolommen zichtbaar worden
**zodat** ik externe data (bv. leveranciers-/artikel-attributen) als verrijking naast de brondata toon zonder maatwerk per tabel.

---

## Acceptatiecriteria (definitie van "klaar")

1. Een Excel-upload wordt geregistreerd via het bestaande metamodel (`tb_sources` provider_type `'excel'`, `tb_tables`, `tb_columns` source=`'source'`, `tb_cache`) — er komen **geen** `tb_external_*`-tabellen.
2. De koppeling is een `tb_relations`-rij met `relation_kind='fk_join'` + `join_keys_json`; `read()` hergebruikt de bestaande fk_join-resolutie (master én detail scope).
3. Uniekheid wordt alleen aan datasetzijde afgedwongen (many-to-one); duplicaten blokkeren publicatie met rapport (aantal + voorbeelden).
4. Gekozen excel-kolommen verschijnen als read-only, globaal-zichtbare kolommen die alle bestaande kolom-machinerie erven.
5. Her-upload vervangt de snapshot maar behoudt link + kolomkeuze; `refresh()` vaagt de excel-snapshot nooit weg.
6. Alleen admin mag uploaden/koppelen/publiceren; xlsx-hardening + rij-cap + partition-gedrag expliciet.
7. Nederlandse UI-labels en statusbadges.

---

## Harde afhankelijkheid

Hergebruikt de **fk_join-leesresolutie** uit Fase 3 van het Vendors/Items-plan ([dev_2026-07-03-datamodel-vendors-items-tb.plan.md](../../.cursor/plans/dev_2026-07-03-datamodel-vendors-items-tb.plan.md)). Is die nog niet gemerged, dan is dat een blocker — we bouwen geen tweede join-engine.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Generiek tb_*-metamodel (sources/tables/columns/cache/relations) | [scripts/db/migrations/011_tb_metamodel.sql](../../scripts/db/migrations/011_tb_metamodel.sql) |
| `join_keys_json` al gemapt in de lees-helper | [server/services/TableRegistryService.js](../../server/services/TableRegistryService.js#L61) |
| `xlsx@0.18.5` in dependencies | `package.json` |

---

## Backlog — child User Stories

### Story #163: Excel als bron in het metamodel (migratie + provider)
Idempotente migratie: `provider_type='excel'` toevoegen aan `CK_tb_sources_provider`. Hergebruik `tb_tables`/`tb_columns`/`tb_cache`/`tb_relations`. Optioneel `tb_upload_batches`. `refresh()` = no-op voor excel-tabellen (snapshot-guard).

### Story #164: Upload, parse en snapshot naar tb_cache
`ExcelUploadService` + multipart-endpoint. xlsx-parse, kolomdetectie + type-inschatting, dataset-sleutel uniekheidscheck. Snapshot → `tb_tables` + `tb_columns(source='source')` + `tb_cache` (scope master). Her-upload behoudt link + kolomkeuze.

### Story #165: Koppeling als fk_join + admin-kolomkeuze
Admin-only endpoints: `tb_relations` fk_join-rij (hoofdtabel → excel-tabel, `join_keys_json`, scope master|detail) + keuze read-only verrijkingskolommen. Activeren/deactiveren. `read()` resolvet al.

### Story #166: Koppel-wizard in AdminDataModel
4-staps wizard (Upload → Sleutels koppelen → Kolommen kiezen → Valideren & publiceren), subcomponents <300 regels. Diagram-preview (n:1 fk_join-lijn). NL badges (Klaar / Dubbele sleutels / Lage match / Gepubliceerd).

### Story #167: Validatie, beveiliging en robuustheid
Admin-only autorisatie; bestandstype/grootte + rij-cap; xlsx-hardening (zip-bomb, formule-injectie, prototype-pollution SheetJS 0.18.5); partition-gedrag expliciet; left-join (geen rij-drop).

### Story #168: Tests en versioning
Backend-tests (parse/typedetectie, duplicate, snapshot→cache, fk_join-hit/miss/cross-company, her-upload). Route-tests (autorisatie + foutpaden). Frontend-test wizard-state. Versie in [src/config/version.js](../../src/config/version.js). Regressiecheck PO-flow + `/api/data/:tableKey`.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_excel-koppeling-hoofdtabel_184778a6.plan.md](../../.cursor/plans/dev_excel-koppeling-hoofdtabel_184778a6.plan.md); wijzig dit bestand bij nieuwe afspraken.
