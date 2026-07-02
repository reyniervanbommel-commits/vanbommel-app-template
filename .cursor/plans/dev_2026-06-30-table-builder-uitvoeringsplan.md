# Uitvoeringsplan: Table Builder afwerken in DevOps (Vendor-App, Feature #130)

> **Status:** werkplan — hoe we de resterende DevOps-tickets afwerken
> **Datum:** 2026-06-30
> **Scope:** alle open Vendor-App-tickets onder Feature **#130** + **#153**.
> **Buiten scope (expliciet):** tickets **#143 t/m #151** (de tech-debt-children van Feature #142).
> **Architectuur:** [dev_2026-06-30-generieke-table-builder-architectuur.md](dev_2026-06-30-generieke-table-builder-architectuur.md)
> **Bord:** `Vendor-App` (org reyniervanbommel0745) — NIET QAQC Module.

---

## 0. Werkwijze per ticket (OTAP)

Elke story doorloopt dezelfde straat (skill `develop-from-devops`, modus `full`):

1. Story op **Active** in DevOps.
2. **Feature-worktree/branch** `feature/<id>-<korte-naam>` vanaf `develop` (strangler-fig: `tb_*` naast `po_*`, nooit het PO-pad breken).
3. Implementatie + **unit-tests** (DB-vrije logica) groen.
4. **Push → preview** (Container App) → **browser-test** tegen de preview-URL.
5. Adaptieve **team-review** → blockers oplossen.
6. **PR naar `develop`** → merge → DEV-deploy → preview opruimen.
7. DevOps: slotcomment + work item **Closed**.

> **Randvoorwaarde (nu opgelost, verificatie pending):** de [[session-store-hang]] blokkeerde stap 4. Fix staat op `feature/152-tb-metamodel` (commit cb1332b). **Eerst preview-rebuild verifiëren** dat authenticated requests niet meer hangen, vóór we op verdere stories live-testen.

---

## 1. Volgorde, afhankelijkheden en deliverables

| Volgorde | Ticket | Fase | Levert | Hangt af van |
|:---:|:---|:---|:---|:---|
| ✅ 1 | **#152** | A | `tb_*`-metamodel + seed PO + `TableDataService` + `/api/data/:tableKey` (GEBOUWD, branch gepusht) | — |
| 🔧 — | *(blocker C)* | — | session-store-fix (GEBOUWD, pending live-verificatie) | — |
| 2 | **#139** | B | `SourceProvider`-interface + `D365ODataProvider` + `discoverFields` (`$metadata`) + **admin `<TableBuilder>`-UI** | #152, C |
| 3 | **#141** | C | generieke projectie via provider + per-kolom filters → server-side `serverFilter` + **filtersets** + echte paginering | #139 |
| 4 | **#140** | D | tweede entiteit (Vendors) **puur via de TableBuilder** (bewijs: config, geen code) | #139 (+#141) |
| 5 | **#153** | E | `SqlViewProvider` — een tabel op een SQL-view, zonder D365 (bewijs bron-agnostiek) | #139 |
| 6 | **#135** | F | per-gebruiker kolomzichtbaarheid (`tb_column_visibility`) | #139 |
| 7 | **#136** | F | oplevering: tests, OTAP-runbook, versie-bump | alle bovenstaande |

**Kritisch pad:** #152 → C → #139 → #141 → {#140, #153, #135}. #136 sluit af.
**Parallelliseerbaar na #141:** #140, #153 en #135 zijn onafhankelijk van elkaar.

---

## 2. Per ticket — concrete afronding

### #152 — Fase A (gebouwd, nog te closen)
- **Resteert:** migratie `011_tb_metamodel.sql` tegen DEV draaien (na C); `/api/data/purchase-orders` op **pariteit** testen met het bestaande PO-scherm; PO-scherm omschakelen naar `/api/data` zodra functioneel gelijk. Pas daarna #152 → Closed.
- **Acceptatie:** PO draait aantoonbaar op `tb_*` zonder regressie.

### #139 — Fase B: provider + TableBuilder
- `server/services/sources/SourceProvider.js` (contract) + `D365ODataProvider.js` (wrapt `D365ODataService`); factory op `tb_sources.provider_type`.
- `discoverFields()` via `$metadata` (hergebruik `scripts/d365/inspect-metadata.mjs`).
- `TableDataService` losmaken van de interne PO-adapter → via provider.
- Admin-UI `<TableBuilder>` (wizard: bron → entiteit → velden cureren → relatie → publiceren).
- **Beslissing nodig (§3):** UI-navigatie van nieuwe tabellen.

### #141 — Fase C: projectie, filters, filtersets, paginering
- Generieke `$select`/`$expand` via `D365ODataProvider` (capability `serverFilter`/`serverPaging`).
- Per-kolom filters client-side op cache; "volledig zoeken" → server-side, whitelist veld+operator, literals escapen.
- `tb_filter_sets` (privé + admin-gedeeld) + echte server-side paginering (vervangt de 50-cap).

### #140 — Fase D: tweede entiteit (Vendors)
- Alleen via de TableBuilder: nieuwe `tb_tables`/`tb_columns`-config, geen nieuwe code. Bewijst het generieke ontwerp.

### #153 — Fase E: SqlViewProvider
- `SqlViewProvider` (`discoverFields` via `INFORMATION_SCHEMA`, `fetch` via parametrized SELECT op een **whitelisted** view, `needsCache=false`). Bewijst dat de abstractie niet lekt (tabel zonder OData-code).
- **Beslissing nodig (§3):** write-back voor SQL-bronnen ja/nee.

### #135 — Fase F: per-gebruiker zichtbaarheid
- `tb_column_visibility` + admin-UI; read filtert kolommen per gebruiker. Geen regressie op gedeelde kolommen.

### #136 — Fase F: oplevering
- Tests (refresh/merge-read/custom-values/write-back-conflict, generiek), OTAP/devops-runbook, versie-bump in de footer.

---

## 3. Te beslissen vóór de betreffende fase (niet-blokkerend voor #139-start)
1. **Relatie-diepte** — v1 = 1 master → 1 detail (zoals PO→lines). Bevestigen vóór #141.
2. **Write-back voor SQL-bronnen** — alleen D365, of ook UPDATE op views? Bepaalt #153/#141-scope.
3. **UI-navigatie** — verschijnen nieuwe tabellen automatisch (lijst uit `tb_tables`) of wijst de admin een menu-plek toe? Bepaalt #139-UI.

---

## 4. Wat NIET in dit plan zit
- **#142 + #143–#151** (TypeScript, TanStack Query, Zustand, i18next, Storybook, GraphQL-PoC, OpenAPI, feature flags, D365-token/Managed Identity): los tech-debt-spoor, bewust uitgesloten. Wel raakvlakken om in de gaten te houden: #144 (TanStack) ↔ #141-paginering; #151 (token/Managed Identity) ↔ provider-betrouwbaarheid.
- **Cel-geschiedenis/audittrail** (apart plan in `docs/plans/`): hangt aan `tb_custom_values`, in te plannen na Fase C.

---

*Werkplan; bijwerken zodra §3-beslissingen vallen of de fasering wijzigt. Volgt de architectuur uit [dev_2026-06-30-generieke-table-builder-architectuur.md](dev_2026-06-30-generieke-table-builder-architectuur.md).*
