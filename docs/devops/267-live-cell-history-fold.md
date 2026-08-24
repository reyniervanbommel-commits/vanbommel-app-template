# Live history-hoekje na celwijziging (DevOps)

**Doel:** Na een celwijziging op het PO-board verschijnt het history-hoekje meteen, zonder page refresh.  
**Referentie in repo:** [docs/specs/2026-08-24-live-cell-history-fold-design.md](../specs/2026-08-24-live-cell-history-fold-design.md)  
**Tags:** `po-board; cell-history; optimistic-ui`  
**Work item:** [User Story #267](https://dev.azure.com/ReyniervanBommel0745/Vendor-App/_workitems/edit/267)

---

## User story

**Als** staff (admin of employee) op het purchase-orderboard  
**wil ik** meteen het history-hoekje zien nadat ik een cel heb opgeslagen  
**zodat** ik zonder page refresh weet dat de wijziging in de celhistorie staat.

---

## Acceptatiecriteria (definitie van "klaar")

1. Na een geslaagde celwijziging (custom save of D365-write-back) verschijnt het hoekje op die cel zonder page refresh.
2. Het hoekje verschijnt in dezelfde render als de nieuwe waarde.
3. Klik opent de bestaande history-popover.
4. Bij een mislukte save blijft het hoekje weg, of verdwijnt het weer (rollback samen met de waarde).
5. Geen extra netwerkcall en geen board-herlaad voor dit hoekje.
6. History-indicators uit: geen hoekje na save.
7. Cel die het hoekje al had: blijft zichtbaar.
8. Helper-tests groen (`npm test`); versie gepatcht in `src/config/version.js`.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| BRD + FRD + TD | `docs/specs/2026-08-24-live-cell-history-fold-design.md` |
| Hoekje + popover | `src/components/supplier/CellHistoryPopover.jsx` |
| Optimistic save (waarde + track-marks) | `src/hooks/usePurchaseOrdersPage.js` (`saveValue`, `correctField`) |
| Track-marks-patroon | `withRightmostMarkRed` in hetzelfde hook-bestand |
| History-vlag bij board-read | `historyByColumnId` via `TableDataService.buildHistoryByCell` |

---

## Backlog — tasks

- [ ] Pure helper `withHistoryFlag` + unit tests (`src/utils/withHistoryFlag.js`)
- [ ] Helper inpluggen in de vier optimistic patches (save/correct × header/line)
- [ ] PATCH-versie in `src/config/version.js`
- [ ] Browser: cel zonder history bewerken → hoekje zichtbaar zonder refresh

---

## Versie document

Aangemaakt op basis van [docs/specs/2026-08-24-live-cell-history-fold-design.md](../specs/2026-08-24-live-cell-history-fold-design.md); wijzig dit bestand bij nieuwe afspraken.  
Repo-document: docs/devops/267-live-cell-history-fold.md
