# D365 write-back keuzelijst (enums)

## BRD

**Als** staff (admin of employee) op het purchase-orderboard
**wil ik** bij een terugschrijfkolom die in D365 een vaste waardenlijst heeft alleen die waarden kunnen kiezen
**zodat** ik geen ongeldige waarde typ en D365 de PATCH niet afwijst.

**Probleem nu:** write-back zet alleen `writable` + `patch`. De cel is een vrij tekstveld. D365-enums hebben een vaste memberlijst in `$metadata`. Die lijst wordt niet op de kolom gezet. Alleen sync-filters kennen twee hardcoded enums. Ongeldige input faalt pas bij D365 (502).

**Succes (toetsbaar):**
- Write-back aan + D365-enum → cel toont een keuzelijst met de metadata-members, geen vrije tekst.
- Kiezen van een member → dezelfde write-back als nu (`POST /correct`, PATCH naar D365).
- Waarde die niet in de lijst staat → 400 van de app, geen D365-PATCH.
- Board-load, scroll en tab-switch: geen extra `apiRequest` en geen `$metadata`.
- Write-back op een niet-enum blijft een vrij veld (tekst/getal/datum).
- Metadata onbereikbaar bij het aanzetten van write-back → toggle slaagt; cel blijft vrij tekstveld.

**Non-goals:**
- Geen D365-lookups / comboboxen naar een andere tabel.
- Sync-filter-dropdowns (`ENUM_FIELDS`) niet vervangen in deze feature.
- `PurchaseOrderStatus` / `orderNumber` / `createdDateTime` / `lineNumber` blijven geblokkeerd voor write-back.
- Geen live D365-call per cel, per rij of per board-read.
- Geen Fluent `Dropdown`/`Combobox` in elke zichtbare gridcel.
- Geen nieuwe gebruikersrechten; leveranciers blijven zonder write-back.

**Constraints:**
- UI Engels. Auth ongewijzigd.
- `options_json` op `tb_columns` hergebruiken; geen nieuwe SQL-kolom.
- Hot path PO-board: geen extra netwerk, geen portal per cel.
- `$metadata` alleen op admin-pad, server-side, gecached.
- `PurchaseOrderWriteBackCell.jsx` is ~261 regels: bij uitbreiding eerst splitsen (max 300).

**Grill-beslissingen:**
- Scope v1 = OData `EnumType`-velden, geen FK-lookups.
- Waardenlijst = `$metadata`, opgeslagen op de kolom bij write-back aan (en ververst bij Discover als de kolom al writable is).
- UI = waarde tonen; keuze-popover alleen voor de actieve cel.
- Validatie server-side tegen opgeslagen members; PATCH stuurt de member-naam als JSON-string.
- Metadata-fout blokkeert write-back niet.

## FRD

**Gekozen approach:** A — enum-members één keer uit gecachete `$metadata` halen, in `tb_columns.options_json` zetten, met de board-kolommeta meeleveren. Cel opent alleen bij focus een keuzelijst. `correctField` weigert onbekende waarden.

**Afgewezen:**
- B — hardcoded `ENUM_FIELDS` uitbreiden: schaalt niet.
- C — distinct waarden uit `tb_cache` / geladen rijen: onvolledig.
- D — D365 live per cel of bij board-load: breekt de snelheidseis.

**Happy path**
1. Admin zet write-back aan, of draait Discover terwijl write-back al aan staat.
2. Server haalt `$metadata` uit cache of D365; bij `EnumType` gaan members naar `options_json`.
3. Staff opent het board. Kolom-meta bevat de members. Geen extra call.
4. Enum-write-backcel toont de huidige waarde. Klik/focus opent één keuzepopover.
5. Kiezen commit het bestaande `onCorrect`-pad.
6. Bulk op geselecteerde rijen: dezelfde gekozen member.

**Rollen:** admin zet write-back aan. Staff bewerkt cellen. Leverancier ziet alleen de waarde.

**Leeg / fout:** geen enum of metadata down → vrij veld, write-back blijft werken. Ongeldige waarde via API → 400, geen PATCH.

**UI:** Engels. Idle: waarde als tekst. Actief: één popover-lijst. Geen Dropdown in alle rijen.

**Acceptatie:** zie DevOps-document [docs/devops/273-d365-writeback-enum-choices.md](../devops/273-d365-writeback-enum-choices.md).

## TD

**Hergebruik:** `setWriteBackConfig`, `discoverSourceFields`, `correctField`, `writeBackField`, `PurchaseOrderWriteBackCell`, `mapColumnRow` (`options`).

**Nieuw:**
- `server/utils/d365ODataMetadata.js` — `$metadata` fetch + parse, in-memory cache TTL 24 uur, `time('d365_metadata')`.
- `server/utils/d365WriteBackEnumOptions.js` — veld → `{ kind: 'd365Enum', enumType, members }` of null; fallback `d365EnumFields.js`.
- Na `setWriteBackConfig` writable=1: options vullen; writable=0: enum-options wissen. Discover ververst alleen writable bronkolommen.
- `correctField`: members aanwezig → exacte match, anders 400. PATCH-body ongewijzigd.
- `src/utils/writeBackChoiceMembers.js` + `PurchaseOrderWriteBackChoicePopover.jsx` (alleen gemount als cel actief).

**Schema:** geen migratie. `options_json`: `{ "kind": "d365Enum", "enumType": "PurchStatus", "members": [...] }`. Custom select blijft een string-array.

**Auth:** geen nieuw board-endpoint. `$metadata` alleen server-side.

**Perf:** geen extra `apiRequest` op board-read; geen `$metadata` op `read()` of cel-edit; max één popover.

**Versie:** `src/config/version.js` PATCH +1.
