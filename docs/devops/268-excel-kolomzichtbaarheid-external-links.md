# Excel-kolomzichtbaarheid op External links (DevOps)

**Doel:** Admin ziet en zet Excel-verrijkingskolommen globaal aan/uit op External links, zonder Data model.  
**Referentie in repo:** [docs/specs/2026-08-24-excel-link-column-visibility-design.md](../specs/2026-08-24-excel-link-column-visibility-design.md)  
**Tags:** `excel; external-links; visibility`  
**Work item:** [Feature #268](https://dev.azure.com/reyniervanbommel0745/Vendor-App/_workitems/edit/268)  
**Gerelateerd:** Feature #162 (Excel-koppeling)

---

## User story

**Als** admin  
**wil ik** op External links per gepubliceerde Excel-kolom zien dat die gekoppeld is, en die globaal aan/uit kunnen zetten  
**zodat** ik de zichtbaarheid van Excel-verrijking niet meer op Data model van de gekoppelde tabel hoef te beheren

---

## Acceptatiecriteria (definitie van "klaar")

1. External links toont per bestaande koppeling de kolomnamen, niet alleen een telling.
2. Elke zo’n kolom heeft een admin-toggle; uit = voor alle board-gebruikers verborgen; de kolom blijft in de lijst; later weer aan zonder opnieuw te publiceren.
3. Direct na publish (en her-publish) staan de gekozen kolommen aan op het bord, zonder Data model.
4. Alleen gekozen enrichment-kolommen op het bord (geen extra sleutelkolom van de dataset).
5. Alle kolommen mogen uit; Delete verwijdert de hele koppeling.
6. Data model `Visible in table` voor D365/custom blijft ongewijzigd.
7. Non-admin krijgt 403 op PATCH; PATCH op een D365-lookup-id geeft 404 en wijzigt die relatie niet.
8. Helper-tests groen (`npm test`); versie gepatcht in `src/config/version.js`.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| BRD + FRD + TD + review | `docs/specs/2026-08-24-excel-link-column-visibility-design.md` |
| Excel-upload + publish + Existing links (delete) | `src/components/admin/datamodel/ExcelLinkWizard.jsx`, `server/services/ExcelLinkService.js` |
| Lookup-read (fk_join) | `server/services/TableDataService.js` (`loadSingleLookup`) |
| Admin-only API | `GET/DELETE /api/data-links/links` achter `requireRole('admin')` |

---

## Backlog — tasks

- [ ] `excelLookupVisibility.js`: parse/serialize/select + tests
- [ ] `getLookups`-adapter + excel-only field-selectie in `loadSingleLookup`
- [ ] Migratie `043_tb_relations_updated_at.sql` + revision-part `maxRelationsAt`
- [ ] `publishLink` reset hidden; `listLinks` columns; `PATCH /api/data-links/links/:id` + validatie/IDOR-tests
- [ ] `useExcelLinksAdmin` + Existing links UI (rij/kolom-switch); `listError` boven de lijst
- [ ] PATCH-versie in `src/config/version.js`
- [ ] Browser: toggle uit → kolom weg op het bord na herlaad; weer aan zonder wizard

---

## Versie document

Aangemaakt op basis van [docs/specs/2026-08-24-excel-link-column-visibility-design.md](../specs/2026-08-24-excel-link-column-visibility-design.md); wijzig dit bestand bij nieuwe afspraken.  
Repo-document: docs/devops/268-excel-kolomzichtbaarheid-external-links.md
