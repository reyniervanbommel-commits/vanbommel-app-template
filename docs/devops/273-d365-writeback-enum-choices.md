# D365 write-back keuzelijst (enums) (DevOps)

**Work item:** [Feature #273](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/273)  
**Doel:** Als een D365-kolom write-back én een OData-enum is, toont de cel de metadata-members als keuze; ongeldige waarden worden in de app geweigerd, zonder extra board-calls.  
**Referentie in repo:** [.cursor/plans/dev_2026-08-24-d365-writeback-enum-choices.plan.md](../.cursor/plans/dev_2026-08-24-d365-writeback-enum-choices.plan.md)  
**Tags:** d365; write-back; enum; po-board

---

## User story

**Als** staff (admin of employee) op het purchase-orderboard  
**wil ik** bij een terugschrijfkolom die in D365 een vaste waardenlijst heeft alleen die waarden kunnen kiezen  
**zodat** ik geen ongeldige waarde typ en D365 de PATCH niet afwijst.

---

## Acceptatiecriteria (definitie van "klaar")

1. Write-back aan + D365-enum → cel toont een keuzelijst met de metadata-members, geen vrije tekst.
2. Kiezen van een member → dezelfde write-back als nu (`POST /correct`, PATCH naar D365).
3. Waarde die niet in de lijst staat → 400 van de app, geen D365-PATCH.
4. Board-load, scroll en tab-switch: geen extra `apiRequest` en geen `$metadata`.
5. Write-back op een niet-enum blijft een vrij veld (tekst/getal/datum).
6. Metadata onbereikbaar bij het aanzetten van write-back → toggle slaagt; cel blijft vrij tekstveld.
7. Geen Fluent Dropdown per gridcel; max één keuzepopover voor de actieve cel.
8. Geen FK-lookups, geen vervanging van sync-filter `ENUM_FIELDS`, geen write-back op geblokkeerde keys (`status`, `orderNumber`, `createdDateTime`, `lineNumber`).
9. `APP_VERSION` patch; unit tests voor parser, options en 400-validatie.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Write-back toggle + PATCH | `TableColumnsService.setWriteBackConfig`, `TableDataService.correctField`, `D365ODataService.writeBackField` |
| Write-backcel (vrije input) | `src/components/supplier/PurchaseOrderWriteBackCell.jsx` |
| Custom select-dropdown | `EditableCell.jsx` + `options_json` (string-array) |
| Hardcoded enums (alleen sync-filters) | `server/utils/d365EnumFields.js`, `src/hooks/useSyncFilters.js` |
| Datum-popover-patroon | `WeekNumberCalendarPopover.jsx` |
| Ontwerp (BRD/FRD/TD) | `docs/specs/2026-08-24-d365-writeback-enum-choices-design.md` |

---

## Backlog — child User Stories

### Story A: D365 `$metadata` parser en enum-options op de kolom
**Work item:** [#274](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/274)  
**Beschrijving:** Enum-members één keer uit gecachete `$metadata` halen en in `tb_columns.options_json` zetten bij write-back aan en Discover.  
**Acceptatiecriteria:**
1. `d365ODataMetadata.js`: fetch, XML-parse, 24u in-memory cache, `time('d365_metadata')`.
2. `options_json` vorm: `{ kind: 'd365Enum', enumType, members }`.
3. Metadata-fout: warning, toggle slaagt, vrij veld.
4. Tests met XML-fixture; cache-hit zonder tweede fetch.

### Story B: `correctField` weigert ongeldige enum-waarden
**Work item:** [#275](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/275)  
**Beschrijving:** Server valideert tegen opgeslagen members vóór de D365-PATCH.  
**Acceptatiecriteria:**
1. Waarde niet in `members` of leeg → 400, geen D365-call.
2. Geen members → huidig vrij-tekstpad.
3. PATCH-body blijft `{ [d365Field]: memberName }`.

### Story C: Write-backcel met keuzepopover
**Work item:** [#276](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/276)  
**Beschrijving:** Idle toont de waarde; focus opent één popover. WriteBackCell eerst splitsen (max 300 regels).  
**Acceptatiecriteria:**
1. Engels: "Select value". Huidige waarde buiten de lijst blijft zichtbaar als extra regel.
2. Geen Dropdown in elke gridcel. Header- en regelcellen via bestaande WriteBackCell.
3. Geen extra `apiRequest` op board-read; `version.js` PATCH +1.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-08-24-d365-writeback-enum-choices.plan.md](../.cursor/plans/dev_2026-08-24-d365-writeback-enum-choices.plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: `docs/devops/273-d365-writeback-enum-choices.md`
