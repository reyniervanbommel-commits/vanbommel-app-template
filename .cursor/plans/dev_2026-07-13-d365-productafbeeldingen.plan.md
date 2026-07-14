---
name: d365-productafbeeldingen
overview: Toon productafbeeldingen uitsluitend via de bestaande standaard D365 F&O OData-entiteit, zonder wijzigingen of deployment in D365.
tags: d365; odata; productafbeeldingen; backend; frontend; security; testing
todos:
  - id: standard-odata-source
    content: Lees de standaard ReleasedProductDocumentAttachments-entiteit via de bestaande D365 OData-service.
    status: completed
  - id: product-image-proxy
    content: Behoud de beveiligde app-proxy met validatie, selectie, inhoudscontrole en caching.
    status: completed
  - id: product-image-ui
    content: Toon productafbeeldingen op orderregels en de headerpreview met unieke-items-badge.
    status: completed
  - id: release-verification
    content: Voer tests, typecheck en build uit en verhoog de appversie.
    status: completed
isProject: false
---

# D365-productafbeeldingen

## Doel
Als medewerker wil ik bij elke inkooporderregel de standaard D365-productafbeelding en op de orderheader een compacte preview zien, zodat ik artikelen sneller visueel kan herkennen.

## Dwingende scope: D365 blijft as-is
- Er wordt absoluut niets nieuws in D365 ingericht of gedeployed.
- Er komt geen custom service, custom data entity, custom rol, legal-entity-allowlist, X++-code of D365-deployment.
- De oplossing gebruikt uitsluitend de reeds bestaande standaard data entity `EcoResReleasedProductDocumentAttachmentEntity`, publiek doorgaans beschikbaar als `ReleasedProductDocumentAttachments`.
- De app gebruikt de bestaande D365 base URL, company-scope en OAuth/settings. Er komen geen productafbeelding-specifieke URL- of origin-settings.
- De backend roept bij voorkeur de bestaande `D365ODataService.fetchEntityRecords` aan met het vaste pad `/data/ReleasedProductDocumentAttachments`; een gebruiker of beheerder kan geen vrije entity- of service-URL opgeven.
- De browser ontvangt nooit D365-tokens en benadert D365 of Blob Storage nooit rechtstreeks.

## Backendontwerp
1. `ProductImageService` valideert uitsluitend `dataAreaId` en `itemNumber` van de bestaande app-route.
2. De OData-query filtert op `ItemNumber`; `D365ODataService.fetchEntityRecords` voegt de bestaande `D365_ODATA_COMPANY`-scope toe.
3. De query selecteert `dataAreaId`, `ItemNumber`, `Attachment`, `FileType`, `IsProductImage`, `IsDefaultProductImage` en `AttachedDateTime`.
4. De app kiest client-side uitsluitend een record dat zowel productafbeelding als default productafbeelding is. Bij meerdere defaults wint de meest recent gekoppelde.
5. `Attachment` wordt als Base64 gedecodeerd. Alleen JPEG, PNG en WebP zijn toegestaan, maximaal 5 MB, en MIME/extensie moet overeenkomen met de magic bytes.
6. Succesvolle afbeeldingen worden maximaal 15 minuten per `dataAreaId` en `itemNumber` in-memory gecachet.
7. De bestaande route `GET /api/media/product-image` behoudt sessie-auth, medewerker/admin-rolcontrole, rate limiting en timing.

## Statuscodes en veilige foutafhandeling
- `200`: geldige JPEG, PNG of WebP met `Cache-Control: private, max-age=900`.
- `204`: geen default productafbeelding of geen bruikbare `Attachment`.
- `400`: ongeldige of extra queryparameters.
- `403`: gebruiker is niet geautoriseerd.
- `502`: de standaardentiteit ontbreekt, de OData-call faalt of de inhoud faalt MIME-, signature- of groottelimieten.
- Foutresponses tonen geen token, D365-responsebody, document-id, bestandsnaam of Blob-informatie.

## UI
- Behoud de gedeelde, gememoized thumbnailcomponent voor orderregels en de headerpreview.
- De header gebruikt het eerste zichtbare regelitem en toont `+N` voor overige unieke itemnummers.
- Een ontbrekend beeld blijft visueel rustig; de bestaande externe image-kolom blijft intact.
- Behoud de relevante opsplitsingen en hooks waarmee componenten onder de afgesproken omvang blijven.

## Testdekking
- Defaultselectie en nieuwste-defaultselectie.
- Ontbrekende entity, records, default en `Attachment`.
- JPEG/PNG/WebP allowlist plus magic-byte-overeenkomst.
- Ongeldige Base64 en payload boven 5 MB.
- Cache-hit en beschermde cachebuffer.
- Routecodes, auth, queryvalidatie en gemaskeerde fouten.
- Bestaande frontendtests voor thumbnails, headersamenvatting en refactors.

## Omgevingsverificatie
Live D365-metadata kon in de preview niet worden geverifieerd, omdat daar momenteel geen D365 base URL en OAuth client credentials zijn geconfigureerd. Dit leidt niet tot een D365-inrichtingsactie: de feature blijft afhankelijk van de standaardentiteit zoals die as-is in de doelomgeving beschikbaar is. Het read-only script `scripts/d365/check-standard-product-images.mjs` mag later metadata diagnosticeren zonder tokens, secrets of volledige configuratiewaarden te tonen.

## Release
- Verhoog `src/config/version.js` één patch vanaf `v1.14.135` naar `v1.14.136`.
- Voer relevante unit-tests, volledige typecheck en productie-build uit.
- Geen commit, push, PR of D365-deployment binnen deze scopecorrectie.
