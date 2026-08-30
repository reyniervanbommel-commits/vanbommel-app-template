# RCCP vaste veldslots, allowlist weg (DevOps)

**Doel:** RCCP-settings mappen alleen vaste rollen (Vendor, Requested/Confirmed/Receipt date, Open/Received/Ordered) naar getypte kolommen; Data model-toggle verdwijnt; planningweek = confirmed als echte datum, anders requested.  
**Referentie in repo:** [.cursor/plans/dev_2026-08-30-rccp-semantic-field-slots.plan.md](../../.cursor/plans/dev_2026-08-30-rccp-semantic-field-slots.plan.md)  
**Ontwerp:** [docs/specs/2026-08-30-rccp-semantic-field-slots-design.md](../specs/2026-08-30-rccp-semantic-field-slots-design.md)  
**Tags:** rccp; settings; datamodel; allowlist  
**Work item:** Feature #298 (children #299, #300, #301)

---

## User story

**Als** admin (planner)  
**wil ik** op RCCP-settings alleen de vaste rollen Vendor, Requested delivery date, Confirmed delivery date, Receipt date, Open, Received en Ordered mappen naar kolommen  
**zodat** ik niet meer via Data model een allowlist hoef bij te houden en niet per ongeluk willekeurige kolommen als datum of hoeveelheid kies.

---

## Acceptatiecriteria (definitie van "klaar")

1. Data-tab toont precies vier velden; datum-dropdowns bevatten geen tekstkolommen zoals Artikelnaam; Vendor alleen header-tekst.
2. Quantities-tab toont precies drie vooringevulde slots Open / Received / Ordered; geen Add-knop; geen chart-role-dropdown.
3. Admin → Data model toont geen kolom “RCCP value column”.
4. PUT `/api/admin/rccp/settings` slaagt zonder Data model-toggle als de drie getalkolommen eligible zijn; twee slots dezelfde kolom → 400.
5. Regel met confirmed-week ≠ requested-week: open/ordered en drill-down landen in de confirmed-week; leeg of 1-1-1900 confirmed → requested.
6. `GET /api/rccp/board-kpis` blijft op gevraagde leverdatum.
7. UI-teksten Engels.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Receipt date-slot + received onder de as | `RccpSettingsDataFields.jsx`, `rccpPoSegments.js` |
| Open/Received chart roles | `rccpChartRole.js`, quantity cards |
| RCCP-config JSON in app_settings | `RccpSettingsService.js` |
| Allowlist-toggle (wordt verwijderd) | Data model `rccp_measure` |

---

## Backlog — child User Stories

### Story A: Data-tab — vier getypte slots (#299)
**Beschrijving:** Vendor, Requested delivery date, Confirmed delivery date, Receipt date; dropdowns filteren op dataType; DataFields via onUpdateField (max 5 props).  
**Acceptatiecriteria:**
1. Precies die vier velden, Engels, 200px-slots.
2. Geen Artikelnaam in een datumlijst.
3. Confirmed en Receipt mogen None zijn.

### Story B: Quantities drie slots + allowlist weg (#300)
**Beschrijving:** Vaste Open / Received / Ordered; save zonder rccpMeasure-gate; Data model-kolom en PATCH rccp-measure weg; SQL-kolom blijft.  
**Acceptatiecriteria:**
1. Geen Add quantity column.
2. Save 200 zonder toggle; duplicate keys 400.
3. Data model zonder RCCP value column; grep geen runtime-rccpMeasure in JS.

### Story C: Planningweek confirmed-of-requested (#301)
**Beschrijving:** planningDateValue in aggregate, segmenten en drill-down. Board-kpis ongewijzigd.  
**Acceptatiecriteria:**
1. Confirmed W40 vs requested W38 → W40 in grafiek en drill-down.
2. 1900 of ongeldige datum → W38.
3. Board-KPI-strip volgt requested.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-08-30-rccp-semantic-field-slots.plan.md](../../.cursor/plans/dev_2026-08-30-rccp-semantic-field-slots.plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: docs/devops/298-rccp-semantic-field-slots.md
