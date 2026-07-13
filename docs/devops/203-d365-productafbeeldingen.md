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

#### Integratiecontract — normatief

Dit contract is de volledige oplevering van Story A. Het betreft uitsluitend de D365 F&O-uitbreiding; de app-proxy en board-UI uit Stories B en C wijzigen niet.

| Onderdeel | Waarde |
|---|---|
| Service group | `VBProductImageServiceGroup` |
| Service | `VBProductImageService` |
| Operation | `getProductImage` |
| Request-contract | `VBProductImageRequestContract` |
| Response-contract | `VBProductImageResponseContract` (ook voor afgehandelde businessfouten) |
| HTTP-methode | `POST` |
| Endpointvorm | `https://{d365-fo-host}/api/services/VBProductImageServiceGroup/VBProductImageService/getProductImage` |
| Authenticatie | Microsoft Entra ID client credentials; de app-registratie representeert een D365 application user met uitsluitend de hieronder beschreven leesrol |
| Transport | Alleen HTTPS; geen browser-call en geen directe Blob-call |

De exacte hostnaam is omgevingsafhankelijk. De service group, servicenaam en operationele naam zijn vaste AOT-namen en mogen niet per omgeving verschillen.

**Request**

```json
{
  "request": {
    "dataAreaId": "usmf",
    "itemNumber": "1000"
  }
}
```

`request` is de enige operation-parameter. De X++-methode heeft daarom de vorm `public VBProductImageResponseContract getProductImage(VBProductImageRequestContract _request)`. De data members heten exact `dataAreaId` en `itemNumber`; gebruik `DataContractAttribute` en `DataMemberAttribute` om die JSON-namen vast te leggen.

De service gebruikt voor alle door de operatie afgehandelde uitkomsten één response-contract en HTTP `200`. Dit is bewust: een X++ custom service kan geen consistente eigen HTTP-statuscodes garanderen voor alle foutpaden. Transport- en platformfouten (bijvoorbeeld een ongeldig token of niet-geautoriseerde service-call) blijven door D365 als HTTP-fout afgehandeld; de consumer mag daar geen foutbody of specifieke statuscode van afleiden.

**Response met standaardafbeelding (`200`)**

```json
{
  "outcome": "success",
  "errorCode": null,
  "message": null,
  "found": true,
  "contentType": "image/jpeg",
  "contentBase64": "/9j/4AAQSkZJRgABAQ...",
  "sourceUpdatedAt": "2026-07-13T18:42:11Z"
}
```

**Response zonder standaardafbeelding (`200`)**

```json
{
  "outcome": "notFound",
  "errorCode": null,
  "message": null,
  "found": false,
  "contentType": null,
  "contentBase64": null,
  "sourceUpdatedAt": null
}
```

`contentBase64` bevat uitsluitend de bytes van het bronbestand, zonder `data:`-URI-prefix of Blob-URL. `sourceUpdatedAt` is UTC in ISO-8601-formaat en komt van de meest recente wijzigingsdatum van de gebruikte document-/afbeeldingsrecord. Bij `found: false` moeten de drie bestandsgerelateerde velden `null` zijn. De stringwaarden voor `outcome` zijn exact `success`, `notFound`, `invalidRequest`, `accessDenied`, `unsupportedMedia`, `payloadTooLarge` en `sourceFailure`.

#### Validatie en foutcontract

Valideer vóór elke product- of documentquery. Gebruik nooit requestwaarden als pad, URL, `DocuRef`-id, bestandsnaam of dynamisch queryfragment.

| Veld | Exacte validatie | Veilige outcome / foutcode |
|---|---|---|
| `dataAreaId` | Verplicht; na trimmen 2–4 kleine ASCII-letters/cijfers (`^[a-z0-9]{2,4}$`). Een syntactisch ongeldige waarde is ongeldig; een geldige waarde moet bestaan, actief zijn en voorkomen in de door beheerders beheerde allowlist `VBProductImageLegalEntity`. | `invalidRequest` / `VBPI_INVALID_LEGAL_ENTITY`; niet-actief of niet-toegestaan: `accessDenied` / `VBPI_ACCESS_DENIED` |
| `itemNumber` | Verplicht; na trimmen 1–20 tekens (`^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$`); lookup gebeurt alleen binnen de gevalideerde legal entity. | `invalidRequest` / `VBPI_INVALID_ITEM_NUMBER` |
| Autorisatie | De app user moet de eigen service-rol én leestoegang binnen de allowlist hebben. | `accessDenied` / `VBPI_ACCESS_DENIED` |
| Bronlimiet | Lees maximaal `5 * 1024 * 1024` bytes uit de documentstroom vóór Base64-conversie. Is de bron groter, stop dan zonder Base64-allocatie. | `payloadTooLarge` / `VBPI_PAYLOAD_TOO_LARGE` |
| Bestandsinhoud | MIME moet exact `image/jpeg`, `image/png` of `image/webp` zijn én overeenkomen met de bytesignatuur: JPEG `FF D8 FF`; PNG `89 50 4E 47 0D 0A 1A 0A`; WebP `RIFF` op bytes 0–3 én `WEBP` op bytes 8–11. | `unsupportedMedia` / `VBPI_UNSUPPORTED_MEDIA` |

Voor een syntactisch geldige maar niet-bestaande `itemNumber`, een niet-released product of een product zonder standaardafbeelding retourneert de operatie de `200`-response met `found: false`. Daarmee kan de consumer ontbrekende media onderscheiden zonder informatie over documenten of bestanden te ontvangen.

Elke door de operation afgehandelde validatie- of bronfout retourneert HTTP `200`, `found: false`, `contentType: null`, `contentBase64: null` en `sourceUpdatedAt: null`, aangevuld met de outcome en foutcode uit de tabel. D365 autoriseert de service group vóór de operation wordt uitgevoerd; een caller zonder service-rol ontvangt daarom een D365-transportfout en geen `VBProductImageResponseContract`. Gebruik uitsluitend onderstaande publieke foutresponse en log intern een correlatie-id plus technische details:

```json
{
  "outcome": "invalidRequest",
  "errorCode": "VBPI_INVALID_LEGAL_ENTITY",
  "message": "The requested legal entity is not available.",
  "found": false,
  "contentType": null,
  "contentBase64": null,
  "sourceUpdatedAt": null
}
```

Voor een door de operatie afgevangen document-, storage- of platformfout retourneert de service eveneens HTTP `200` met `outcome: "sourceFailure"`, `errorCode: "VBPI_SERVICE_FAILURE"` en bericht `The product image service is temporarily unavailable.` Niet-afgevangen platformfouten blijven D365-transportfouten; geen foutbody mag een Blob-pad, SAS-token, document-id, stacktrace, SQL-fout, tenant-id of bestandsnaam bevatten. De app-proxy uit Story B vertaalt transport- en `sourceFailure`-uitkomsten later naar zijn eigen `502`; die vertaling valt buiten deze story.

#### X++-implementatieblauwdruk

1. Maak de twee serialiseerbare contracts met alleen de hierboven genoemde members. De response initialiseert altijd alle zeven velden; maak `contentBase64`, `contentType` en `sourceUpdatedAt` alleen gevuld bij `outcome: "success"`.
2. Maak server-side klasse `VBProductImageService` en publiceer deze in `VBProductImageServiceGroup`. De operation is read-only, wordt niet als OData data entity gepubliceerd en accepteert geen documentidentificator.
3. Implementeer één concrete adapterklasse `VBProductImageDocumentAdapter`. Deze class is de enige laag die `EcoResProductImage` en `DocumentManagement` aanroept en heeft exact twee publieke server-methoden: `resolveStandardImage(EcoResProduct _product)`, die een `DocuRef` van uitsluitend de standaardafbeelding retourneert, en `readContent(DocuRef _docuRef, int _maxBytes)`, die maximaal `_maxBytes + 1` bytes als container teruggeeft. De service krijgt dus nooit een Blob-URL, stream of `DocuValue.AccessInformation`.
4. De adapter gebruikt uitsluitend de door Microsoft ondersteunde server-side documentmanagementlaag: hij laat `EcoResProductImage` de standaardafbeelding voor het meegegeven product bepalen en leest de geselecteerde `DocuRef` met `DocumentManagement` als container. De adapter voert geen directe query op Blob-opslag uit, genereert geen download-URL en heeft geen Azure Storage SDK- of credential-afhankelijkheid. Als de doelplatformversie andere methodesignatures heeft, wordt alleen de private implementatie van deze adapter aangepast; de twee adaptermethoden en het servicecontract blijven onveranderd.
5. Valideer request, controleer de allowlist en schakel pas daarna met `changecompany(_request.parmDataAreaId())` naar de legal entity. Zoek `InventTable` op `ItemId`; gebruik de productreferentie van het released product om `EcoResProduct` te bepalen. Het product mag niet buiten die legal entity worden opgezocht.
6. Vraag de adapter altijd eerst met `_maxBytes = 5 * 1024 * 1024` aan. Als de teruggegeven container meer dan 5 MB bevat, retourneer `payloadTooLarge` zonder Base64-conversie. Controleer daarna zowel MIME als bytesignatuur en controleer dat beide hetzelfde type aanwijzen. Converteer pas vervolgens de gevalideerde bytes naar Base64 en vul de successresponse.
7. Als geen standaardbeeld of geen bruikbare documentinhoud bestaat, retourneer `notFound`. Een secundaire bijlage, willekeurig document of niet-standaardafbeelding is nooit een fallback.
8. Vang technische uitzonderingen aan de servicegrens af, schrijf de gedetailleerde oorzaak met correlatie-id naar D365 logging en retourneer `sourceFailure` uit het response-contract. De service mag geen transacties openen en mag geen gegevens schrijven.

De adapter wordt als afzonderlijke unit in hetzelfde D365-model gecompileerd en krijgt adaptertests met een standaard JPEG, PNG, WebP, te grote bron, verkeerde MIME en verkeerde bytesignatuur. Daarmee blijft de service-operation autonoom en stabiel, zonder afhankelijkheid van een ongedocumenteerde of onzekere helpermethode.

#### D365 security en toegang

Maak een eigen, read-only securityketen:

```text
VBProductImageServicePrivilege
  → VBProductImageServiceDuty
    → VBProductImageServiceRole
```

- `VBProductImageServicePrivilege` geeft uitsluitend toegang tot de entry point `VBProductImageService.getProductImage` en de minimale read-permissions die de standaard `EcoResProductImage`- en `DocumentManagement`-resolvers nodig hebben voor `EcoResProduct`, released products (`InventTable`), `DocuRef` en `DocuValue`.
- Ken geen create-, update-, delete-, export-, attachment-maintenance- of brede documentmanagementrechten toe. Gebruik geen `SysAdmin` of standaard brede productbeheerrol als vervanging.
- Registreer de Entra app-registratie in D365 als application user en wijs **alleen** `VBProductImageServiceRole` toe. De app-registratie krijgt geen Azure Storage RBAC-rol, account key, connection string, SAS-token of Blob-containerrechten.
- Beheer `VBProductImageLegalEntity` uitsluitend via een afzonderlijke beheerdersprivilege. De service user mag de allowlist lezen, niet wijzigen.
- Log iedere geweigerde legal entity, autorisatiefout en technische fout met correlatie-id; log geen Base64-inhoud, tokens of Blob-metadata.

#### D365-verificatie vóór overdracht aan Story B

1. Publiceer en synchroniseer de service in een niet-productieomgeving; haal het exacte service-document/metadata op en verifieer group-, service-, operation- en contractnamen.
2. Roep de operatie met een application-user-token aan voor een vooraf goedgekeurd item met JPEG, PNG en WebP aan. Controleer `outcome: "success"`, het correcte én door magic bytes bevestigde MIME-type, Base64-decodeerbaarheid, bronlimiet van 5 MB vóór encodering en `sourceUpdatedAt` in UTC.
3. Controleer een bestaand item zonder standaardafbeelding en een onbekend, maar syntactisch geldig item: beide leveren `200`, `outcome: "notFound"` en drie `null`-velden.
4. Controleer een ongeldige of niet-toegestane legal entity, een ongeldig itemnummer, verkeerde MIME, verkeerde magic bytes en een bron groter dan 5 MB. Controleer dat elk van deze operationele scenario's HTTP `200`, een veilige outcome/foutcode en geen document- of Blob-informatie oplevert. Controleer afzonderlijk dat een application user zonder rol door D365 vóór de operation wordt geweigerd en dat de consumer die transportfout generiek behandelt.
5. Controleer in Entra en Azure Storage dat de app-registratie geen storage-credentials en geen Blob RBAC-toegang heeft.

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
