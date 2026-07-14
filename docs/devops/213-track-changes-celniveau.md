# Track changes op celniveau (sessie/week-streepjes) (DevOps)

**Doel:** Per kolom (admin) aanzetbare track-changes die onderin elke cel max. 5 streepjes tonen in welke recente sessie(s) of week/weken de cel is gewijzigd — globaal, generiek voor alle `tb_*`-boards.
**Referentie in repo:** [.cursor/plans/dev_2026-07-14-track-changes-celniveau.plan.md](../../.cursor/plans/dev_2026-07-14-track-changes-celniveau.plan.md)
**Tags:** track-changes; tb-board; admin-settings; full-stack; audit

---

## User story

**Als** beheerder/inkoper
**wil ik** per kolom kunnen zien in welke recente sessies of weken een cel is gewijzigd
**zodat** ik snel recente wijzigingspatronen herken zonder de volledige celhistorie te openen.

---

## Acceptatiecriteria (definitie van "klaar")

1. Een admin kan per kolom track-changes aan/uit zetten via een menu-item in de kolomheader; niet-admins zien die toggle niet.
2. Op de Settings-tab "Track changes" is de granulariteit instelbaar: **Per sessie** of **Per week (ma–zo)**, globaal actief voor alle boards.
3. In sessie-modus is instelbaar **welke gebruikersrollen** een sessie starten (multi-select uit `admin` / `employee` / `supplier`; default `admin` + `employee`). Alleen een login van een gekozen rol maakt een nieuwe sessie aan.
4. Een getrackte, gewijzigde cel toont ≤5 streepjes: **rood** = gewijzigd, **geel** = afgeronde sessie/week zonder wijziging, **grijs** = lopende/toekomstige sessie/week óf vóór activatie.
5. Sessies/weken vóór de `activatedAt` van een kolom blijven grijs (fresh start per kolom).
6. Zonder actieve kolommen draait er geen extra query: de Server-Timing-metric `tb_track_marks` is dan afwezig.
7. Streepjes worden meeberekend in de bestaande parallelle read-stap (geen extra board-round-trip) en zijn kleurenblind-vriendelijk toegankelijk (`title`/`aria-label`, geen `Tooltip` in herhaalde cellen).

**v1-scope:** alleen custom `tb_`-kolommen (bron `tb_cell_history`). D365-kolommen volgen als aparte vervolg-story.

---

## Wat is al gedaan

_(Nog niets — nieuw plan.)_

---

## Backlog — child User Stories

### Story A (#214): Data-fundament, config-endpoint en sessie-registratie
**Beschrijving:** Migratie `024_track_change_sessions.sql` (idempotent, globaal), endpoint `GET/POST /api/admin/settings/track-changes` (patroon `settings/odata`, `requireRole('admin')`) met server-side validatie, en een conditionele sessie-insert in `recordLoginAnalytics` (alleen bij `mode==='session'` én rol ∈ `sessionRoles`).
**Acceptatiecriteria:**
1. Migratie idempotent en non-destructief.
2. GET geeft config met defaults (`mode` `session`, `sessionRoles` `['admin','employee']`).
3. POST met ongeldige `mode`/`sessionRoles` → 400; geldige payload opgeslagen.
4. Login van rol ∈ `sessionRoles` voegt in sessie-modus precies één sessierij toe; andere rollen niet.

### Story B (#215): Server-side berekening van track-marks in de board-read
**Beschrijving:** `server/utils/trackChangeMarks.js` (`buildMarkPattern`, server-only, +test) en `loadTrackMarks` in `TableDataService.read()`, meegeprikt in het bestaande `Promise.all`-blok, alleen bij ≥1 actieve kolom. Bucketing in SQL (week via `DATEDIFF`, session via `CASE` tegen de ≤5 grenzen), per-kolom `activeOffset`, `trackMarksByColumnId` + meta, metric `tb_track_marks`.
**Acceptatiecriteria:**
1. `buildMarkPattern`-unittests: rood-rechts, shift, geel na afloop, venster-slide >5, fresh-start grijs.
2. `loadTrackMarks` correcte buckets session én week bij vaste timestamps.
3. Geen actieve kolommen → helper niet aangeroepen, `tb_track_marks` afwezig.
4. Payload: 5-tekenstring per gewijzigde cel + per kolom `defaultPattern`.

### Story C (#216): Settings-tab "Track changes"
**Beschrijving:** Nieuwe tab in `AdminPage.jsx` + `AdminTrackChangesSettings.jsx` (<300 regels, patroon `AdminODataSettings.jsx`): segmented control session/week, `sessionRoles`-multiselect (alleen in sessie-modus), legenda met kleur én tekst, kolomoverzicht. Laden/opslaan via `apiRequest`.
**Acceptatiecriteria:**
1. Tab toont huidige config en slaat wijzigingen op via het endpoint.
2. Wisselen session/week werkt; `sessionRoles` alleen relevant in sessie-modus.
3. Legenda toont kleur én tekst; component < 300 regels.
4. Config-calls via `apiRequest`.

### Story D (#217): Board-UI — kolom-toggle en cel-streepjes
**Beschrijving:** `useTrackChanges.js`-hook, admin-only kolom-toggle + indicator in `PurchaseOrderColumnHeader.jsx` (patroon `showFilterIndicator`), `TrackChangeMarks.jsx` (pure, `React.memo`, één `linear-gradient`-div, `aria-label`, geen `Tooltip`) geïntegreerd in `PurchaseOrderDataCell.jsx`, versie-bump `v1.15.0`.
**Acceptatiecriteria:**
1. Admin ziet/gebruikt de toggle; niet-admins niet; header-indicator bij actief.
2. Getrackte cellen tonen correcte kleuren; niet-getrackte kolommen renderen niets extra.
3. Eén DOM-node per cel, `React.memo`, `aria-label` aanwezig.
4. Versie `v1.15.0` zichtbaar in de footer.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-07-14-track-changes-celniveau.plan.md](../../.cursor/plans/dev_2026-07-14-track-changes-celniveau.plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: docs/devops/213-track-changes-celniveau.md
