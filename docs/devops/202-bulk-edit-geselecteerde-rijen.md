# Plan bulk-bewerken geselecteerde rijen (DevOps)

**Doel:** Bij celbewerking in de Purchase Orders board kan de gebruiker (bij multi-select) dezelfde kolomwaarde in één keer op alle geselecteerde, zichtbare rijen toepassen, via een modal-keuze.
**Referentie in repo:** [.cursor/plans/dev_bulk-edit-geselecteerde-rijen_7864e0d7.plan.md](../../.cursor/plans/dev_bulk-edit-geselecteerde-rijen_7864e0d7.plan.md)
**Tags:** purchase-orders; bulk-edit; frontend

---

## User story

**Als** leverancier-beheerder
**wil ik** een kolomwaarde in één keer op alle geselecteerde zichtbare PO-rijen zetten
**zodat** ik niet elke rij los hoef te bewerken

---

## Acceptatiecriteria (definitie van "klaar")

1. Eén geselecteerde rij: geen modal, normale save.
2. Meerdere zichtbare geselecteerde rijen: bij celbewerking verschijnt een bevestigingsmodal.
3. De bulk-modal verschijnt óók bij het bewerken van een D365-write-back-cel met meerdere geselecteerde rijen.
4. Keuze `Alleen deze cel`: alleen de actieve rij wijzigt.
5. Keuze `Toepassen op geselecteerde rijen`: de waarde wordt in dezelfde kolom op alle zichtbare geselecteerde rijen gezet.
6. Bewerkte rij die niet in de zichtbare selectie zit: single-cell update zonder modal.
7. Regelcel (subitem, `lineNumber` gezet) met meerdere rijen geselecteerd: geen modal, alleen die cel — bulk geldt alleen voor header-cellen.
8. Bulk op een D365-write-back-kolom: elke rij schrijft met de eigen `basedOnValue`; een rij die de waarde al heeft wordt niet naar D365 geschreven.
9. Bij een fout in bulk: het proces stopt direct op de eerste fout; rijen vóór de fout blijven persistent en er verschijnt een samenvatting die "bijgewerkt / overgeslagen (al gelijk) / niet geprobeerd (na fout)" onderscheidt.
10. Alle UI-labels zijn Nederlands (modaltitel `Meerdere rijen bijwerken?`, knoppen `Alleen deze cel` / `Toepassen op geselecteerde rijen`).
11. App-versie opgehoogd naar `v1.14.37` in `src/config/version.js`; footer loopt automatisch mee.
12. Een `devTestItem` voor deze feature verschijnt in de dev-testlijst.
13. Alle gewijzigde componentbestanden blijven ≤300 regels (Dev Lead-limiet).

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Multi-select state + zichtbare selectie-keys | `src/hooks/usePurchaseOrdersSelection.js`, `src/hooks/usePurchaseOrderRowSelection.js` |
| Per-cel save + D365 write-back handlers (hergebruikt door bulk) | `saveValue` / `correctField` in `src/hooks/usePurchaseOrdersPage.js` |
| Bestaande cel-componenten die de handlers aanroepen | `src/components/supplier/PurchaseOrderHeaderCellContent.jsx`, `PurchaseOrderWriteBackCell.jsx`, `EditableCell.jsx` |

---

## Gekozen route (en waarom)

Bulk = een sequentiële lus over de bestaande `saveValue`/`correctField` (elk een eigen `apiRequest`), **geen** nieuw backend bulk-endpoint. Bewuste afweging (YAGNI): geen atomariteit vereist, bescheiden selecties, frontend-only zonder nieuwe route of migratie. Geaccepteerde consequentie: bij een fout halverwege is de toepassing niet atomair (rijen vóór de fout blijven persistent). Een server-side `…/values/bulk` / `…/correct/bulk` (één transactie) is de alternatieve route als atomariteit of grote selecties later een eis worden — dan als aparte story.

**Autorisatie:** bulk hergebruikt exact de bestaande handlers, dus de per-cel-permissies blijven gelden (write-back admin-gated, `requireSession`/`requireRole` op de routes ongewijzigd). Geen nieuw autorisatie-oppervlak.

---

## Backlog — tasks

- [ ] **bulk-hook** — `src/hooks/usePurchaseOrderBulkEdit.js`: decision (multi-select + zichtbare selectie), modal-state, single/bulk uitvoering. Header-cellen only (`lineNumber == null`); per-rij `basedOnValue`; skip onveranderde rijen; retour-promise die na modal-keuze + hele batch resolvet; stop-op-eerste-fout met samenvatting; `busy`-teller bij grote selecties.
- [ ] **bulk-dialog** — `src/components/supplier/PurchaseOrderBulkEditDialog.jsx`: Fluent v9 `Dialog`, Nederlandse labels; benoemt kolomlabel en aantal zichtbare geselecteerde rijen.
- [ ] **page-integration** — `src/components/supplier/PurchaseOrdersPage.jsx`: wrapped `onSaveValue`/`onCorrect` + dialog-render; page ≤300 regels (hook levert props; vangnet: `PurchaseOrdersBoardTable`-props extraheren).
- [ ] **scope-en-stop** — visible-only selectie + stop-on-first-error-sequentie voor zowel save als correct.
- [ ] **version-bump** — `src/config/version.js` van `v1.14.36` → `v1.14.37`.
- [ ] **dev-test-item** — entry toevoegen in `src/config/devTestItems.js`.
- [ ] **validate-flow** — alle acceptatiecriteria handmatig valideren in de browser tegen de preview-URL.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_bulk-edit-geselecteerde-rijen_7864e0d7.plan.md](../../.cursor/plans/dev_bulk-edit-geselecteerde-rijen_7864e0d7.plan.md); wijzig dit bestand bij nieuwe afspraken.
