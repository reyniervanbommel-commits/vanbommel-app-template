# D365-productafbeeldingen (DevOps)

**Doel:** Toon beveiligde D365-productafbeeldingen per inkooporderregel en als compacte orderheaderpreview, zonder directe Blob-toegang en zonder een D365 data entity.  
**Referentie in repo:** [.cursor/plans/dev_2026-07-13-d365-productafbeeldingen.plan.md](../../.cursor/plans/dev_2026-07-13-d365-productafbeeldingen.plan.md)  
**Tags:** d365; productafbeeldingen; backend; frontend; security; testing

---

## User story

**Als** medewerker  
**wil ik** bij elke inkooporderregel de D365-productafbeelding en op de orderheader een compacte preview zien  
**zodat** ik artikelen sneller visueel kan herkennen zonder toegang tot D365 Blob Storage.

---

## Acceptatiecriteria (definitie van "klaar")

1. Productafbeeldingen worden uitsluitend via een geauthenticeerde app-route opgehaald; de browser krijgt nooit D365-tokens, Blob-paden of Blob-credentials.
2. Orderregels tonen een thumbnail op basis van `ItemNumber`; ontbrekende afbeeldingen blijven rustig leeg.
3. De orderheader toont de thumbnail van het eerste zichtbare regelitem plus een `+N`-badge voor overige unieke items.
4. Alleen JPEG, PNG en WebP tot maximaal 5 MB worden geserveerd.
5. De route valideert invoer, beperkt toegang tot medewerker/admin en cachet succesvolle afbeeldingen maximaal 15 minuten.
6. Versie, tests en DEV-browserchecklist zijn bijgewerkt.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|---|---|
| OAuth client-credentials en token-cache voor D365 | `server/services/D365ODataService.js` |
| Sessiebeveiliging, CSP en globale rate-limit | `server/server.js` |
| Huidige externe image-kolom | `src/components/supplier/PurchaseOrderHeaderCellContent.jsx` |
| Rendering orderregels | `src/components/supplier/PurchaseOrdersSubitemsBodyRows.jsx` |

---

## Backlog — child User Stories

### Story A: D365 custom service voor productafbeeldingen (#204)
**Beschrijving:** Lever een beveiligd custom-servicecontract op dat per legal entity en itemnummer de standaard D365-productafbeelding retourneert, zonder data entity of directe Blob-toegang.

**Acceptatiecriteria:**
1. Een bekend item met JPEG-, PNG- of WebP-afbeelding retourneert `found: true`, toegestaan `contentType` en geldige Base64-data.
2. Een bestaand item zonder afbeelding retourneert `found: false` zonder bestandsgegevens.
3. Ongeldige legal entities of itemnummers geven geen documentdata terug.
4. De app-registration heeft geen Blob Storage-credentials en geen directe Blob-toegang.

### Story B: Beveiligde app-proxy voor productafbeeldingen (#205)
**Beschrijving:** Haal de D365-service-response uitsluitend server-side op en lever veilige image-bytes aan de browser.

**Acceptatiecriteria:**
1. `GET /api/media/product-image?dataAreaId=<legalEntity>&itemNumber=<itemNumber>` geeft voor een toegestaan beeld `200` plus `Cache-Control: private, max-age=900`.
2. Onjuiste invoer, ontbrekend beeld, ontbrekende rechten en D365-fouten geven respectievelijk 400, 204, 403 en 502 zonder gevoelige informatie.
3. De proxy accepteert geen vrije URL, `DocuRef`-ID of andere identifier dan legal entity en itemnummer.
4. Een tweede request voor hetzelfde item binnen 15 minuten voert geen tweede D365-call uit.

### Story C: Native productafbeeldingen in het inkooporderboard (#206)
**Beschrijving:** Toon thumbnails per orderregel en de eerste zichtbare productthumbnail met unieke-items-badge op de orderheader; behoud bestaande externe image-kolommen.

**Acceptatiecriteria:**
1. Elke zichtbare, niet-verwijderde orderregel met een itemnummer toont de D365-thumbnail of blijft rustig leeg bij 204/fout.
2. De header toont de afbeelding van het eerste zichtbare regelitem en badge `+N` met het correcte aantal overige unieke itemnummers.
3. Een order zonder regelitems toont geen afbeelding en geen badge.
4. Thumbnail en badge zijn via toetsenbord bruikbaar en hebben Nederlandse, beschrijvende toegankelijkheidslabels.
5. De bestaande handmatige externe image-kolom blijft werken.

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-07-13-d365-productafbeeldingen.plan.md](../../.cursor/plans/dev_2026-07-13-d365-productafbeeldingen.plan.md); wijzig dit bestand bij nieuwe afspraken.
