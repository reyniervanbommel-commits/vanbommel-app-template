# D365-productafbeeldingen (DevOps)

**Feature:** #203
**Doel:** Toon beveiligde standaard D365-productafbeeldingen per inkooporderregel en als compacte orderheaderpreview.
**Plan:** [.cursor/plans/dev_2026-07-13-d365-productafbeeldingen.plan.md](../../.cursor/plans/dev_2026-07-13-d365-productafbeeldingen.plan.md)

## Dwingende scope: uitsluitend as-is

Feature #203 vereist geen enkele wijziging in D365 F&O:

- geen custom service of X++-code;
- geen custom data entity;
- geen custom security role, duty of privilege;
- geen legal-entity-allowlist;
- geen D365 package, configuratie of deployment;
- geen productafbeelding-specifieke vrije URL of trusted-origin-setting.

De app gebruikt uitsluitend de bestaande standaard data entity `EcoResReleasedProductDocumentAttachmentEntity`, die publiek doorgaans `ReleasedProductDocumentAttachments` heet. De vaste app-integratie is `/data/ReleasedProductDocumentAttachments` via de bestaande `D365ODataService.fetchEntityRecords`, bestaande OAuth-instellingen en bestaande `D365_ODATA_COMPANY`-scope.

## User story

**Als** medewerker
**wil ik** bij elke inkooporderregel de standaard D365-productafbeelding en op de orderheader een compacte preview zien
**zodat** ik artikelen sneller visueel kan herkennen zonder directe toegang tot D365 of Blob Storage.

## Technisch contract

De browser roept alleen aan:

`GET /api/media/product-image?dataAreaId=<legalEntity>&itemNumber=<itemNumber>`

De backend:

1. accepteert uitsluitend `dataAreaId` en `itemNumber`;
2. gebruikt altijd het vaste standaard entity path;
3. filtert op `ItemNumber`, naast de bestaande company-scope van `fetchEntityRecords`;
4. selecteert `dataAreaId`, `ItemNumber`, `Attachment`, `FileType`, `IsProductImage`, `IsDefaultProductImage` en `AttachedDateTime`;
5. kiest client-side uitsluitend de default product image; bij meerdere defaults wordt de nieuwste `AttachedDateTime` gebruikt;
6. decodeert `Attachment` als Base64;
7. accepteert alleen JPEG, PNG en WebP tot maximaal 5 MB;
8. controleert dat `FileType` en magic bytes overeenkomen;
9. cachet alleen succesvolle beelden maximaal 15 minuten.

Er wordt geen vrije URL, entitynaam, document-id, Blob-pad of bestandsnaam vanuit de request geaccepteerd.

## Security en statuscodes

- De route vereist een geldige sessie en de rol medewerker of admin.
- De bestaande routespecifieke rate limiter blijft actief.
- D365 OAuth-tokens en technische foutdetails blijven server-side.
- `200`: geldige afbeelding met `Cache-Control: private, max-age=900`.
- `204`: geen default record of geen bruikbare `Attachment`.
- `400`: ongeldige of extra queryparameter.
- `403`: niet-geautoriseerde rol.
- `502`: standaardentiteit ontbreekt, OData faalt, of inhoud faalt MIME-, magic-byte- of groottelimieten.
- Alle niet-succesresponses gebruiken `Cache-Control: no-store`.

## UI en frontendrefactors

- Elke zichtbare orderregel met `itemNumber` gebruikt de gedeelde thumbnailcomponent.
- De orderheader gebruikt het eerste zichtbare regelitem en toont `+N` voor overige unieke itemnummers.
- Ontbrekende of geweigerde media blijven rustig leeg zonder broken-image-weergave.
- De bestaande externe image-kolom blijft werken.
- De relevante componentopsplitsingen en board-hooks blijven behouden.

## Acceptatiecriteria

1. Geen artifact of configuratie vereist nieuwe inrichting of deployment in D365.
2. Alleen de vaste standaard OData-entiteit wordt gebruikt.
3. Defaultselectie gebeurt in de app op de standaard entity records.
4. Alleen JPEG, PNG en WebP met correcte bytesignatuur en maximaal 5 MB worden geserveerd.
5. Auth, rate limiting, cache, veilige statuscodes en foutmaskering zijn getest.
6. De UI en relevante frontendrefactors blijven behouden.
7. Appversie is `v1.14.136`; relevante tests, typecheck en build slagen.

## Live metadata

Live metadata kon in de preview niet worden geverifieerd, omdat daar momenteel geen D365 base URL en OAuth client credentials zijn geconfigureerd. Dit is geen verzoek om D365 aan te passen. Zodra een bestaande omgeving wel is geconfigureerd, kan `scripts/d365/check-standard-product-images.mjs` read-only controleren welke standaard entity set gepubliceerd is. Het script toont geen token, client secret of volledige configuratiewaarde.

## Buiten scope

- D365-development, custom modellen en deployment.
- Nieuwe D365-rollen of allowlists.
- Directe Blob Storage-toegang.
- Supplier-toegang tot de media-route.
- Uploaden, wijzigen of verwijderen van productdocumenten.
- Commit, push of PR als onderdeel van deze scopecorrectie.
