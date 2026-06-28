# Visie: D365 Composite Proxy voor Purchase Order-data (DevOps)

**Concept:** Express als samenstellende proxy tussen de app en D365 F&O — deterministisch, geen AI.
**Versie:** 0.1 — concept
**Datum:** juni 2026
**Status:** ter bespreking
**Vervangt:** het AI/MCP-visiedocument (`docs/specs/visie-guardrailed-ai-d365.md`) is voor deze fase geparkeerd.
**Tags:** d365; odata; purchase-orders; composite-proxy; bff; integration

---

## 1. Scope van deze fase

Bewust ingeperkt om de risico's beheersbaar te houden:

- **Wél:** purchase order-data uit D365 ophalen, verrijken met aanvullende entiteiten (voorraad, vendor) en eigen SQL, en gecontroleerd terugschrijven naar D365.
- **Niet (voorlopig):** vendor-self-service en per-vendor data-isolatie. **Alleen eigen Van Bommel-medewerkers** gebruiken de app. Dat haalt het zwaarste beveiligingsvraagstuk (row-level isolatie per leverancier) van tafel.
- **Niet:** AI/LLM in het datapad. Een LLM is voor dit doel onnodig, niet-deterministisch en duur. Reads en writes blijven exact en testbaar.

**Kerngedachte:** de Express-backend is de consumer en doet de samenstellende logica. De React-frontend praat nooit direct met D365.

```
React Frontend → Express /api/purchase-orders/composite → parallel: D365 OData + eigen SQL → gecombineerde, eigen response-shape
```

---

## 2. Waarom een composite proxy (en geen alternatief)

| Aanpak | Oordeel |
|---|---|
| Frontend roept D365 OData direct aan | ❌ Token-lekkage, CORS, geen eigen shape, geen join met SQL |
| C#/X++ custom data entity in D365 | ⚠️ Werkt, maar vereist D365-development en deployment buiten ons team |
| **Express composite proxy** | ✅ Past op bestaande stack (Express + MSSQL + React), eigen response-shape, join met eigen SQL, geen C# |

De composite proxy is de logische keuze gegeven de huidige architectuur. De bestaande [server/services/D365ODataService.js](../../server/services/D365ODataService.js) is het vertrekpunt.

---

## 3. Wat de huidige code al doet — en waar het tekortschiet

`D365ODataService.fetchPurchaseOrders()` haalt headers op met een `$filter` op `OrderAccount`. Bruikbaar als basis, maar met vier concrete tekortkomingen die deze fase moet adresseren:

1. **Statisch bearer token.** `buildHeaders()` leest een opgeslagen `D365_ODATA_BEARER_TOKEN`. Azure AD-tokens verlopen na ~60 minuten — dit breekt elk uur. **Blocker voor productie en voor schrijven.**
2. **Pagination kapot.** `total: records.length` geeft de paginagrootte, niet het totaal. Vereist `$count=true` + `@odata.count`.
3. **Gegokte veldnamen.** `mapPurchaseOrder()` hangt vol `||`-fallbacks — niemand heeft het echte entiteitschema bevestigd.
4. **Verplicht supplier-filter.** Het filter is hard gekoppeld aan één `OrderAccount`. Voor medewerkers moet filtering juist optioneel zijn (op vendor, status, datum).

---

## 4. De vijf zaken die succes bepalen

Niet `$expand` en `Promise.all` zijn het risico — die zijn triviaal. Dit zijn de punten die bepalen of dit een middag of een maand kost:

### 4.1 Authenticatie: OAuth2 client credentials (niet een geplakt token)
Vervang het statische bearer token door de OAuth2 client-credentials flow: Azure AD app-registratie (client id + secret), token ophalen bij `login.microsoftonline.com`, **cachen en refreshen vóór expiry**. Zonder dit valt alles elk uur om en is terugschrijven onmogelijk.

### 4.2 `$expand` bestaat mogelijk niet op deze entiteit
In standaard D365 zijn `PurchaseOrderHeadersV2` en `PurchaseOrderLinesV2` losse data entities die vaak **géén navigation property** naar elkaar hebben. `$expand=PurchaseOrderLines` geeft dan een fout. **Verifiëren via `$metadata` vóór er code op gebouwd wordt.** Als de relatie ontbreekt: client-side joinen op `PurchaseOrderNumber` — in **één** gefilterde batch-call (`$filter=PurchaseOrderNumber in (...)`), nooit N+1 (één call per order).

### 4.3 Terugschrijven is geen simpele PATCH
Twee smaken, met sterk verschillende complexiteit:
- **Veld bijwerken** (notitie, datum) → `PATCH` op de entiteit. Eenvoudig, mits niet read-only.
- **Actie/boeking** (ontvangst bevestigen, order confirmeren, posten) → een OData **bound Action** of D365 custom service. Een platte PATCH triggert de business logic niet. Significant meer werk.

Bepaal vroeg welk type nodig is — dit bepaalt de haalbaarheid van de write-fase.

### 4.4 Voorraad-join is geen 1:1
`InventOnHandV2` is per artikel **per dimensie** (magazijn, site, locatie). Eén PO-regel-item heeft veel on-hand records. "Actuele voorraad bij een orderregel" dwingt een aggregatiekeuze af (som over magazijnen? per site? beschikbaar vs. fysiek?). Dit is een business-afspraak, geen merge-detail.

### 4.5 Endpoint-plaatsing en autorisatie
PO-endpoints horen **niet** in [admin.js](../../server/routes/admin.js) achter `requireRole('admin')`. Aparte route (`server/routes/purchaseOrders.js`), `requireSession` + medewerker-rol, met optionele filters.

---

## 5. Doel-architectuur

```
┌─────────────────────────────────────────────────────────┐
│  React Frontend                                         │
│  PurchaseOrders-pagina: lijst + detail + bewerken       │
└─────────────────────────────────────────────────────────┘
                    │  GET /api/purchase-orders/composite
                    │  PATCH /api/purchase-orders/:id        (write-back)
┌─────────────────────────────────────────────────────────┐
│  Express: routes/purchaseOrders.js                      │
│  requireSession + medewerker-rol                        │
└─────────────────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────────────────┐
│  D365ODataService (uitgebreid)                          │
│  - OAuth2 token-cache + refresh                         │
│  - fetchComposite(): parallel headers + lines + invent  │
│  - $count voor echte pagination                         │
│  - escapeODataLiteral (bestaat al)                      │
│  - writeBack(): PATCH of bound Action                   │
└──────────────┬──────────────────────────┬───────────────┘
               │ Promise.all              │
        ┌──────▼──────┐            ┌───────▼────────┐
        │ D365 OData  │            │ Eigen MSSQL     │
        │ PO/lines/   │            │ noten, QC-status│
        │ invent/vendor│           │ statusmodel     │
        └─────────────┘            └────────────────┘
```

---

## 6. Wat er gebouwd moet worden

### Fase 0 — Verifiëren (eerst, ~1 dag)
- [ ] `$metadata` ophalen en de echte entiteit- en veldnamen vastleggen (vervangt de `||`-fallbacks)
- [ ] Bevestigen of PO-header → lines een navigation property heeft (bepaalt `$expand` vs. client-side join)
- [ ] Bepalen of write-back PATCH of bound Action is
- [ ] Azure AD app-registratie + benodigde D365-rollen/scopes vaststellen

### Fase 1 — Fundament read
- [ ] OAuth2 client-credentials in `D365ODataService` (token-cache + refresh) — vervangt statisch token
- [ ] `$count=true` + `@odata.count` → correcte pagination-meta
- [ ] Optionele filters (vendor, status, datum) i.p.v. verplicht supplier-filter
- [ ] `fetchComposite()`: headers + lines (expand óf batch-join) + eigen SQL parallel via `Promise.all`
- [ ] Nieuwe route `server/routes/purchaseOrders.js` (`requireSession` + medewerker-rol)
- [ ] React PO-lijst + detailweergave

### Fase 2 — Verrijking
- [ ] Voorraad (`InventOnHandV2`) toevoegen met afgesproken aggregatie
- [ ] Vendor-data toevoegen waar nodig
- [ ] Eigen SQL-velden (noten, QC-status) koppelen op orderNumber
- [ ] Korte-TTL caching van composite-responses (D365 OData is traag)

### Fase 3 — Terugschrijven
- [ ] Write-back endpoint (PATCH óf bound Action, op basis van Fase 0)
- [ ] Idempotency + bevestiging in de UI
- [ ] Audit-log van schrijfacties (hergebruik bestaand `auditLog`-patroon)

---

## 7. Openstaande vragen

1. Welke D365-velden vormen de canonieke PO-mapping (uit `$metadata`)?
2. Heeft de PO-header-entiteit een navigation property naar de regels?
3. Is terugschrijven een veldwijziging (PATCH) of een boeking (Action)?
4. Welke voorraad-aggregatie wil de business zien bij een orderregel?
5. Welke D365-rollen/scopes krijgt de Azure AD app-registratie (minimale rechten)?
6. Welke eigen SQL-data (noten, QC-status) moet aan de PO-view gekoppeld worden?

---

*Concept ter bespreking. Na akkoord uitwerken tot implementatieplan; sluit aan op de bestaande Supplier Portal-backlog ([73-supplier-portal-implementatieplan.md](73-supplier-portal-implementatieplan.md), Story C en G).*
