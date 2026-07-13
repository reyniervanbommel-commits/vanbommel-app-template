---
name: d365-productafbeeldingen
overview: Toon beveiligde D365-productafbeeldingen per inkooporderregel en als compacte orderheaderpreview, zonder directe Blob-toegang en zonder een D365 data entity.
tags: d365; productafbeeldingen; backend; frontend; security; testing
todos:
  - id: d365-image-service
    content: Lever het D365 custom-servicecontract voor productafbeeldingen op en verifieer het met een bekend item.
    status: pending
  - id: product-image-proxy
    content: Bouw de beveiligde app-proxy met validatie, autorisatie, caching en tests.
    status: pending
  - id: product-image-ui
    content: Toon productafbeeldingen op orderregels en de headerpreview met unieke-items-badge.
    status: pending
  - id: release-verification
    content: Voer tests en browserchecks uit, verhoog de appversie en registreer de DEV-testchecklist.
    status: pending
isProject: false
---

# D365-productafbeeldingen

## Doel
Als medewerker wil ik bij elke inkooporderregel de D365-productafbeelding en op de orderheader een compacte preview zien, zodat ik artikelen sneller visueel kan herkennen zonder toegang tot D365 Blob Storage.

## Architectuur en vaste keuzes
- De D365 Blob-container wordt nooit direct benaderd.
- Er wordt geen D365 data entity gemaakt. De D365-uitbreiding is een custom service `VBProductImageService`.
- `VBProductImageService.getProductImage(dataAreaId, itemNumber)` zoekt het released product op en gebruikt de bestaande `EcoResProductImage`-/`DocumentManagement`-logica. De response bevat uitsluitend `found`, `contentType`, `contentBase64` en `sourceUpdatedAt`.
- De D365-service geeft voor ontbrekende afbeeldingen `found: false` terug en weigert onbekende legal entities of ongeldige itemnummers.
- De app-backend decodeert de Base64-response, accepteert uitsluitend `image/jpeg`, `image/png` en `image/webp`, begrenst de gedecodeerde payload op 5 MB en streamt nooit D365-tokens, Blob-paden of D365-fouten naar de browser.
- De app-route is `GET /api/media/product-image?dataAreaId=<legalEntity>&itemNumber=<itemNumber>`. Een valide beeld geeft `200`; ontbrekend beeld geeft `204`; ongeldige invoer geeft `400`; niet-geautoriseerde toegang geeft `403`; een D365-storing geeft `502`.
- De route is uitsluitend beschikbaar voor ingelogde medewerkers en admins. Supplier-gebruikers krijgen pas toegang wanneer de route aantoonbaar de zichtbare PO-regels van die supplier beperkt; dit valt buiten deze eerste versie.
- Succesvolle beelden worden per `dataAreaId` en `itemNumber` maximaal 15 minuten in een in-memory cache bewaard. Responses krijgen `Cache-Control: private, max-age=900`; foutresponses worden niet gecachet.
- De regelweergave gebruikt het `itemNumber` van de regel. De header toont het eerste niet-verwijderde, zichtbare item volgens de actuele boardvolgorde en een badge `+N` voor overige unieke, niet-lege itemnummers. Een order zonder regelitem toont geen preview of badge.

## Wat is al gedaan
| Item | Locatie |
|---|---|
| OAuth client-credentials en token-cache voor D365 | `server/services/D365ODataService.js` |
| Sessiebeveiliging, CSP en globale rate-limit | `server/server.js` |
| Huidige externe, template-gedreven image-kolom | `src/components/supplier/PurchaseOrderHeaderCellContent.jsx` |
| Rendering van inkooporderregels | `src/components/supplier/PurchaseOrdersSubitemsBodyRows.jsx` |
| Versieconfiguratie | `src/config/version.js` |
| DEV-browserchecklist | `src/config/devTestItems.js` |

## Backlog — child User Stories

### Story A: D365 custom service voor productafbeeldingen
**Beschrijving:** Lever een beveiligd D365 custom-servicecontract op dat voor een legal entity en itemnummer de standaard productafbeelding retourneert, zonder data entity of directe Blob-toegang.

**Implementatie:**
1. Maak in D365 `VBProductImageService` met operatie `getProductImage`.
2. Valideer `dataAreaId` en `itemNumber`; zoek het released product binnen de opgegeven legal entity.
3. Gebruik de D365 productafbeeldings- en documentmanagement-API om de standaardafbeelding op te halen; retourneer Base64 en MIME-type volgens het vaste contract.
4. Ken de bestaande app-registration/service-user uitsluitend leesrechten toe die nodig zijn voor released products en productdocumenten.
5. Leg de service-URL, operationele naam en de vereiste D365-rol vast in `docs/devops`.

**Acceptatiecriteria:**
1. Een request voor een bekend item met JPEG-, PNG- of WebP-afbeelding retourneert `found: true`, een toegestaan `contentType` en geldige Base64-data.
2. Een bestaand item zonder afbeelding retourneert `found: false` zonder foutmelding of bestandsgegevens.
3. Een ongeldig itemnummer of legal entity geeft geen documentdata terug.
4. De app-registration heeft geen Blob Storage-credentials en geen directe Blob-toegang.

### Story B: Beveiligde app-proxy voor productafbeeldingen
**Beschrijving:** Haal de service-response uitsluitend server-side op en lever veilige image-bytes aan de browser.

**Implementatie:**
1. Maak `server/services/ProductImageService.js` voor D365-I/O, Base64-decodering, MIME- en groottelimieten en cachebeheer. Houd pure validatie en cache-sleutels in losse hulpfuncties.
2. Maak `server/routes/media.js`; valideer queryparameters strikt, pas `requireSession` en medewerker-/admin-rolcontrole toe, voeg een specifieke rate-limit toe en roep `time()` aan voor de D365-download.
3. Mount de route in `server/server.js` zonder de bestaande `D365ODataService.js` (647 regels) uit te breiden.
4. Voeg route- en servicetests toe voor tokengebruik, 400/403/204/502, onveilige MIME-types, payloads groter dan 5 MB, cache-hit en cache-miss.

**Acceptatiecriteria:**
1. Een geautoriseerde medewerker ontvangt via `/api/media/product-image` een valide `image/jpeg`, `image/png` of `image/webp` met `Cache-Control: private, max-age=900`.
2. Onjuiste invoer, ontbrekende afbeeldingen, ontbrekende rechten en D365-fouten leveren respectievelijk 400, 204, 403 en 502 zonder token, Blob-pad of D365-stacktrace.
3. De proxy accepteert geen vrije URL, `DocuRef`-ID of andere identifier dan `dataAreaId` en `itemNumber`.
4. Een tweede request voor hetzelfde item binnen 15 minuten voert geen tweede D365-call uit.

### Story C: Native productafbeeldingen in het inkooporderboard
**Beschrijving:** Toon veilige productthumbnails in de orderregels en een toegankelijke samenvatting op de header.

**Implementatie:**
1. Maak `src/components/supplier/PurchaseOrderProductImageCell.jsx` als gedeelde, gememoized component met lazy loading, Nederlandse alternatieve tekst en een fout-/lege toestand zonder broken-image-icoon.
2. Breid `src/components/supplier/PurchaseOrdersSubitemsBodyRows.jsx` uit met de gedeelde component voor het regel-itemnummer. Houd het component onder 250 regels door zuivere afleiding en renderlogica te extraheren wanneer nodig.
3. Breid `src/components/supplier/PurchaseOrderHeaderCellContent.jsx` uit voor de thumbnail van het eerste zichtbare regelitem en de `+N`-badge. Houd de huidige externe image-kolom ongewijzigd.
4. Voeg een pure utility en unit-tests toe voor de selectie van het eerste zichtbare item en het aantal overige unieke items.
5. Gebruik `apiRequest` voor eventuele nieuwe frontend metadata-calls; de afbeelding zelf wordt via de browser naar de geauthenticeerde same-origin media-route geladen.

**Acceptatiecriteria:**
1. Elke zichtbare, niet-verwijderde orderregel met `itemNumber` toont de D365-thumbnail of blijft rustig leeg bij 204/fout.
2. De header toont de afbeelding van het eerste zichtbare regelitem en badge `+N` met het correcte aantal overige unieke itemnummers.
3. Een order zonder regelitems toont geen afbeelding en geen badge.
4. Thumbnail en badge zijn via toetsenbord bruikbaar en hebben Nederlandse, beschrijvende toegankelijkheidslabels.
5. De bestaande handmatige externe image-kolom blijft werken.

## Release en verificatie
1. Voeg een DEV-testitem toe aan `src/config/devTestItems.js` met browserchecks voor regelthumbnail, headerpreview, `+N`-badge, ontbrekende afbeelding en een niet-geautoriseerde request.
2. Verhoog `src/config/version.js` van `v1.14.126` naar `v1.14.127`; de bestaande app-footer toont de nieuwe versie.
3. Voer de server- en frontend-unit-tests uit, inclusief nieuwe route-, service- en utility-tests.
4. Verifieer in de browser met een order met minstens drie regels, waarvan twee hetzelfde itemnummer hebben: de headerbadge telt alleen het derde unieke item.
5. Werk op `feature/d365-productafbeeldingen`; commits gebruiken `feat: ... #AB:203`.
