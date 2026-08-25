# Excel-kolomzichtbaarheid op External links

## BRD

**Als** admin
**wil ik** op External links per gepubliceerde Excel-kolom zien dat die gekoppeld is, en die globaal aan/uit kunnen zetten
**zodat** ik de zichtbaarheid van Excel-verrijking niet meer op Data model van de gekoppelde tabel hoef te beheren

**Probleem nu:** Na publiceren is onduidelijk welke kolommen live zijn. Uitzetten kan alleen door de hele koppeling te verwijderen, of via een omweg op Data model (`Visible in table` van native/custom kolommen). Lookup-kolommen horen daar niet thuis en staan er ook niet.

**Succes (toetsbaar):**

- External links toont per bestaande koppeling de kolomnamen, niet alleen een telling
- Elke zo’n kolom heeft een admin-toggle; uit = voor alle board-gebruikers verborgen; de kolom blijft in de lijst; later weer aan zonder opnieuw te publiceren
- Direct na publish staan de gekozen kolommen aan op het bord, zonder Data model
- Data model-gedrag voor D365- en custom kolommen is ongewijzigd

**Non-goals:**

- D365/custom `Visible in table` blijft op Data model
- Geen tweede Excel-toggle op Data model
- Geen per-gebruiker-admin-toggle (persoonlijk kolommen verbergen op het bord mag blijven bestaan naast de globale admin-stand)

**Constraints:**

- Alleen admin (`requireRole('admin')` op `/api/data-links`)
- UI-teksten Engels
- Bestaande publish, delete-link en fk_join-lookup niet breken
- Uitgezette kolommen niet materialiseren in de board-read (zelfde perf-regel als inactive lookups)

**Grill-beslissingen:**

- Toggle-eigenaar: admin, globaal
- Uit: verborgen, reversibel, zonder her-publiceren
- Na publish: gekozen kolommen starten aan
- Scope: alleen Excel-zichtbaarheid naar External links

## FRD

**Gekozen approach:** A — per Excel-koppeling een `hiddenDerivedKeys`-lijst naast de bestaande field-map. `lookup_fields_json` blijft `{ derivedKey: targetKey }` (D365-lookups vendors/items onaangetast). Hidden-keys in `join_keys_json` (bij Excel-links nu ongebruikt). Board-read materialiseert geen hidden derived keys en geen Excel-kolommen die niet in de field-map staan.

**Afgewezen:**
- B — `is_active` op Excel-`tb_columns`: hergebruikt de board-filter, maar is dataset-breed i.p.v. per koppeling.
- C — kolom uit de field-map halen bij uitzetten: “weer aanzetten zonder publiceren” vereist alsnog een tweede lijst (= A).

**Happy path**
1. Admin opent Settings → External links.
2. **Existing links** toont per gepubliceerde koppeling de gekozen enrichment-kolommen (label + key), elk met een Switch.
3. Switch **on**: kolom staat niet in `hiddenDerivedKeys`; alle board-gebruikers zien de lookup-kolom (tenzij ze die persoonlijk verbergen).
4. Switch **off**: derived key gaat in `hiddenDerivedKeys`; de kolom blijft in de field-map en in de lijst; het bord krijgt de kolom niet in de read-payload.
5. Later weer **on**: key uit de hidden-lijst; geen wizard, geen her-publish.
6. Na publish (eerste keer en her-publish): alle gekozen kolommen starten **on** (`hiddenDerivedKeys` leeg voor die keys). Het bord toont ze zonder Data model.

**Rollen:** alleen admin. Pagina en API blijven achter `requireSession` + `requireRole('admin')`. Board-gebruikers hebben geen toggle; zij zien het gevolg op het PO-bord.

**Leeg:** geen koppelingen → bestaande empty copy (“No external links have been published yet.”). Koppeling met alle switches uit → rijen blijven zichtbaar, alle Switches off, bord toont geen Excel-enrichment. Wizard-stap 3 ongewijzigd (minstens één kolom kiezen om te publiceren).

**Fout:** PATCH faalt (validatie, 403, netwerk) → `listError` boven Existing links (elke wizard-stap), Switch terug naar alleen die kolom. Geen stille mismatch. Delete-link ongewijzigd.

**Overlap:** twee admins op dezelfde link: last write wins op de hidden-lijst. Persoonlijk kolommen verbergen op het bord blijft; **admin-uit wint** (kolom zit niet in de payload). Admin weer aan → kolom komt terug als nieuwe default-zichtbare kolom (bestaand board-gedrag voor nieuwe keys).

**UI:** geen drawer/flyout. In Existing links, onder elke koppeling extra rijen: kolomnaam + Switch. Delete blijft op de koppelingsrij (hele link). Engels: o.a. “Key field” en “Columns” i.p.v. huidige typefouten. Geen `<Tooltip>` in de herhaalde rijen. Fluent Switch, geen hardcoded kleuren.

**Zichtbaarheid:** alleen de in de wizard gekozen enrichment-kolommen op het bord en in de toggle-lijst. De join-sleutel is geen extra bordkolom. Data model (`Visible in table` voor D365/custom) ongewijzigd.

**Hergebruik:** `ExistingLinksList.jsx` + nieuwe `useExcelLinksAdmin` (list-CRUD, niet `useExcelLinkWizard` uitbreiden), `ExcelLinkService.listLinks` / `publishLink`, board-lookup in `TableDataService.loadSingleLookup`. Nieuw: PATCH op `/api/data-links/links/:id`. Geen wijziging aan Data model-admin.

**Acceptatie**
- Existing links toont kolomnamen, niet alleen een telling.
- Switch uit → kolom weg op het bord voor iedereen; blijft in de lijst; weer aan zonder publish.
- Publish/her-publish → gekozen kolommen aan; geen extra sleutelkolom van de dataset.
- Alles uit mag; Delete verwijdert de koppeling.
- D365/custom-toggles op Data model ongewijzigd.

## TD

**Hergebruik (paden):**
- API-mount: [`server/server.js`](server/server.js) — `app.use('/api/data-links', requireSession, requireRole(ROLES.ADMIN), dataLinksRouter)` blijft; geen tweede router.
- Routes: [`server/routes/dataLinks.js`](server/routes/dataLinks.js) — bestaande `GET/DELETE /links`; nieuw `PATCH /links/:id`.
- Service: [`server/services/ExcelLinkService.js`](server/services/ExcelLinkService.js) — `listLinks`, `publishLink`, `deleteLink`; nieuw `updateLinkColumnVisibility`.
- Lookup-read: [`server/services/TableDataService.js`](server/services/TableDataService.js) — `loadSingleLookup` (excel: alleen field-map, minus hidden); `getRevisionByTable`.
- Lookup-metadata: [`server/services/TableRegistryService.js`](server/services/TableRegistryService.js) — `getLookups` gebruikt de gedeelde parser; zet `joinKeys` (altijd array) en `hiddenDerivedKeys` op het lookup-object.
- JSON-contract: [`server/utils/excelLookupVisibility.js`](server/utils/excelLookupVisibility.js) — enige choke point voor parse/serialize/validate van Excel-`join_keys_json` én field-selectie. `getLookups`, `listLinks`, `publishLink` en `updateLinkColumnVisibility` mogen geen eigen `JSON.parse` van die kolom hebben.
- UI-lijst: nieuwe hook [`src/components/admin/datamodel/excel-link/useExcelLinksAdmin.js`](src/components/admin/datamodel/excel-link/useExcelLinksAdmin.js) — niet uitbreiden van [`src/hooks/useExcelLinkWizard.js`](src/hooks/useExcelLinkWizard.js) (die heeft al 19 `useState` / ~40 returns). Wizard houdt alleen stappen 1–4; na publish roept hij `loadLinks()` van de list-hook.
- Lijst-UI: [`ExistingLinksList.jsx`](src/components/admin/datamodel/excel-link/ExistingLinksList.jsx), [`ExistingLinkRow.jsx`](src/components/admin/datamodel/excel-link/ExistingLinkRow.jsx), [`ExistingLinkColumnRow.jsx`](src/components/admin/datamodel/excel-link/ExistingLinkColumnRow.jsx). Pagina [`ExcelLinkWizard.jsx`](src/components/admin/datamodel/ExcelLinkWizard.jsx) toont `listError` boven Existing links (niet alleen in `StepPublish`).
- Versie: [`src/config/version.js`](src/config/version.js) PATCH +1 bij implementatie.

**Schema / JSON:**
- Geen nieuwe tabel. `lookup_fields_json` blijft plat `{ derivedKey: targetKey }`.
- Hidden-lijst in `join_keys_json` (FRD). Die kolom is nu een **array** van `{ sourceKey, targetKey }` voor composite joins. Readers doen `Array.isArray(joinKeys) ? joinKeys : []` — een object wordt nu stil genegeerd als join.
- Excel-links schrijven daarom het object `{ "hiddenDerivedKeys": ["waarde"] }` (optioneel `joinKeys: []`). D365-lookups blijven een array of NULL.
- Adapter in `parseJoinKeysJson` (zelfde module als de field-helper): array → `{ joinKeys, hiddenDerivedKeys: [] }`; object → `joinKeys` alleen als array anders `[]`, `hiddenDerivedKeys` genormaliseerd; `NULL`/junk → beide leeg. `serializeExcelJoinKeys({ hiddenDerivedKeys, joinKeys })` schrijft het Excel-object **zonder** optionele lege `joinKeys` (YAGNI). Tests: D365-array, Excel-object, NULL, `{}`, malformed, joinKeys-array behouden als die er wél is.
- Idempotente migratie [`scripts/db/migrations/043_tb_relations_updated_at.sql`](scripts/db/migrations/043_tb_relations_updated_at.sql): `updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` op `dbo.tb_relations` als de kolom ontbreekt. PATCH/publish zetten `updated_at = SYSUTCDATETIME()`. Migratie en revision-SQL in dezelfde release.
- Bestaande Excel-links met `join_keys_json` NULL: alle kolommen zichtbaar tot de eerste PATCH.

**Auth / validatie:**
- `PATCH /api/data-links/links/:id` achter dezelfde admin-middleware. Body: `{ hiddenDerivedKeys: string[] }` (volledige lijst, last write wins). Extra body-velden (`joinKeys`, `lookup_fields_json`, `table_id`) negeren — geen mass assignment.
- `id` integer > 0; anders 400. Relatie: `relation_role = 'lookup'` **én** `tb_tables` (target) → `tb_sources.[key] = 'excel'` (zelfde join als `listLinks`). Onbekend id, non-lookup of non-excel → 404 en geen write (`rowsAffected = 0`). Master-detail-`join_keys_json` van `getTableByKey` niet aanraken.
- `hiddenDerivedKeys` moet een array zijn (anders 400). Elementen: non-empty strings, trim + dedupe. Lengte cap = aantal keys in de field-map. Elke key moet exact in `Object.keys(lookup_fields_json)` zitten; onbekende/niet-string → 400 (Engels). Lege lijst toegestaan (alles aan).
- SQL via parameters. `invalidateTableCache()` na succevolle PATCH (zelfde als delete/publish).

**Board-read (excel-only):**
- In `loadSingleLookup`: als `targetTable.source.providerType === 'excel'` is `configuredTargetKeys` **alleen** `Object.values(lk.fields)` — niet alle `targetColumnsAll` (dat is waarom de sleutelkolom nu extra op het bord staat). D365-lookups ongewijzigd.
- `activeFieldEntries` filtert daarna: doelkolom `isActive` **en** derived key niet in `lk.hiddenDerivedKeys`. Geen extra payload-keys voor uitgezette kolommen.
- Zelfde module: `selectExcelLookupFieldEntries({ fields, hiddenDerivedKeys, activeTargetKeys })`, `parseJoinKeysJson`, `serializeExcelJoinKeys`, `normalizeHiddenDerivedKeys(fields, rawHidden)`. D365-`loadSingleLookup` roept `selectExcelLookupFieldEntries` niet aan. Tests in [`server/utils/excelLookupVisibility.test.js`](server/utils/excelLookupVisibility.test.js). Service-tests voor `updateLinkColumnVisibility` (validatie + 404-paden) in [`server/services/ExcelLinkService.test.js`](server/services/ExcelLinkService.test.js) waar I/O te mocken is; anders een smalle route-test.

**Revision / cache:**
- `getRevisionByTable` krijgt part `maxRelationsAt` = `MAX(updated_at)` van `tb_relations` waar `table_id = @tableId`. Zonder dit blijft de board-session-cache de oude kolommen tonen na een toggle.
- Test in [`server/services/TableDataService.test.js`](server/services/TableDataService.test.js): andere `maxRelationsAt` → andere revision-hash.
- In-memory table-cache: `invalidateTableCache()` op PATCH.

**Publish:**
- `publishLink` MERGE zet `join_keys_json` via `serializeExcelJoinKeys({ hiddenDerivedKeys: [] })` op **MATCHED en INSERT** (alle gekozen kolommen aan, ook her-publish). `lookup_fields_json` ongewijzigd. `updated_at` meenemen.

**listLinks:**
- Per link `columns: [{ derivedKey, targetKey, label, visible }]`. Labels in **één** query op dataset-`tb_columns` (geen query per link); fallback `derivedKey`. `visible = !hiddenSet.has(derivedKey)`. Volgorde = field-map-volgorde. Parser = `parseJoinKeysJson`.

**PATCH-service:**
- `updateLinkColumnVisibility(id, hiddenDerivedKeys)` leest de relatie met de excel-join, valideert, schrijft via `serializeExcelJoinKeys` (behoudt een bestaande `joinKeys`-array als die in de huidige JSON zit), zet `updated_at`, invalidates cache, retourneert de geüpdatete link in dezelfde vorm als `listLinks`.

**Frontend:**
- `useExcelLinksAdmin`: `{ links, listError, busyKeys, loadLinks, deleteLink, toggleLinkColumn }`. Alle referenties `useCallback`/`useMemo`. `toggleLinkColumn(linkId, derivedKey, visible)`: optimistic alleen die `derivedKey` via functionele `setLinks`; bij fout alleen die key terugzetten (geen snapshot van de hele lijst). Eén `apiRequest` PATCH. `busyKeys` = `Set` van `${linkId}:${derivedKey}`.
- `useExcelLinkWizard` levert geen list-CRUD meer (`deleteLink` / `links` verhuizen). Na geslaagde publish: `loadLinks()`.
- `ExistingLinksList` krijgt `listError`, `busyKeys`, `onToggleColumn`, `onDelete`. Headers Engels (`Key field`, `Columns`). `ExistingLinkColumnRow` (`React.memo`) vanaf dag 1: stabiele `onToggle={toggleLinkColumn}` plus `linkId` en `derivedKey` — geen inline wrapper in de parent-`map`. Switch `aria-label={`Show column ${label} on the board`}`, `disabled` als busy. Delete op `ExistingLinkRow`. Max 10 props, max 4 JSX-niveaus, geen Tooltip in herhaalde rijen.
- `listError` zichtbaar boven de lijst op elke wizard-stap.
- Data model-bestanden niet wijzigen.

**Volgorde:**
1. `excelLookupVisibility.js` (parse/serialize/select) + tests.
2. `getLookups`-adapter + excel-only field-selectie in `loadSingleLookup`.
3. Migratie `updated_at` + revision-part + tests.
4. `publishLink` reset hidden; `listLinks` columns; `updateLinkColumnVisibility` + PATCH-route + validatie-/IDOR-tests.
5. `useExcelLinksAdmin` + Existing links UI (Row/ColumnRow) + hook-tests.
6. `version.js` PATCH +1.

**Perf:**
- PATCH is één parameterized UPDATE, geen board-read.
- Board-read: kleinere `synthetic`/`fieldEntries` bij hidden keys (minder JSON). Meetpunt: bestaande `time(lookupTimingLabel(...))` in `loadSingleLookup`; PATCH via `apiRequest`.
- Geen queries in een frontend-loop; één PATCH per toggle.

**Aantoonbaar:**
- External links: kolomnamen + Switch; uit → na board-herlaad (revision) kolom weg; aan → terug zonder wizard. Foutmelding bij mislukte PATCH zichtbaar bij de lijst.
- Publish: gekozen kolommen aan, geen extra sleutelkolom.
- Data model Purchase Order Header: D365/custom-toggles ongewijzigd.
- Non-admin: PATCH 403.
- PATCH op D365-lookup-id → 404 en `join_keys_json` ongewijzigd; `id=0` / non-integer → 400; unknown hidden-keys → 400.

**Niet wijzigen:** `AdminDataModel.jsx`, D365 `lookup_fields_json` van vendors/items/receipts, per-user `visibleColumns` op het bord.

