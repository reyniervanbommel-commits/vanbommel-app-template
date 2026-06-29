# Fase 0 — Bevindingen (#AB:131)

> **Datum:** 2026-06-29 · **Branch:** feature/138-po-cache-afronding
> Afronding van de drie Fase 0-acceptatiecriteria: OAuth2, `$metadata`-veldnamen, write-back-mechanisme.

## 1. OAuth2 client-credentials — ✅
- `getAccessToken()` in [D365ODataService.js](../../server/services/D365ODataService.js): token-cache + refresh vóór expiry, concurrency-guard.
- App-registratie **VBO-OData-VendorApp-DEV** (`64dc4948-…`), secret in Key Vault `kv-vp-ne-20260628` + `.env`.
- End-to-end geverifieerd op de ACC-sandbox (token + OData-call → echte PO-data).
- **Statisch bearer token (#131-1):** behouden als **expliciet gemarkeerde legacy-fallback** (alleen actief als client-credentials ontbreken). Zichtbaar als zodanig op de OData-adminpagina. Bewuste keuze i.p.v. harde verwijdering, zodat een omgeving zonder app-registratie nog handmatig kan koppelen.

## 2. `$metadata`-verificatie (#131-2) — ✅
Geverifieerd tegen `PurchaseOrderHeaderV2` / `PurchaseOrderLineV2` op de ACC-sandbox.

- **Header→regels navigation property bestaat:** `PurchaseOrderLinesV2 → Collection(PurchaseOrderLineV2)`. `$expand` is dus geldig (maar traag → cache-sync wordt begrensd, B2).
- **Header key:** `dataAreaId, PurchaseOrderNumber`. **Regel key:** `dataAreaId, PurchaseOrderNumber, LineNumber`.
- **Gecorrigeerde veldnamen (migratie 008):**

| Niveau | Kolom | Was (gegokt) | Correct (geverifieerd) |
|---|---|---|---|
| line | requestedDeliveryDate | `RequestedReceiptDate` (bestaat niet) | **`RequestedDeliveryDate`** |
| header | createdDateTime | `CreatedDateTime` (niet geëxposeerd) | **`AccountingDate`** |
| header | vendorName | `PurchaseOrderName` (= ordernaam) | afgeleid uit VendorsV2-verrijking (d365_field → NULL) |

- **`ModifiedDateTime` is niet geëxposeerd** op `PurchaseOrderHeaderV2`. Gevolg: delta-refresh op ModifiedDateTime (Fase 2) is niet mogelijk; een **begrensde volledige resync** is de gekozen aanpak (B2). Voor Fase 2 (nieuw-detectie) moet een alternatief watermark-veld of een hash-vergelijking gebruikt worden.

## 3. Write-back-mechanisme (#131-3) — gedocumenteerd (uitvoering in Fase 3)
Twee paden, te bepalen per veld:

| Type wijziging | Mechanisme | Voorbeeldvelden |
|---|---|---|
| Vrij veld bijwerken | **PATCH** op de entiteit (mits niet read-only) | notitie/opmerking, `ConfirmedDeliveryDate`, `VendorOrderReference` |
| Status/boeking | **Bound Action / D365-service** (PATCH triggert de business-logica niet) | order bevestigen, ontvangst boeken, `PurchaseOrderStatus` |

**Aanbeveling Fase 3:** start met PATCH op één veilig vrij veld (bijv. een datum of referentie) met `If-Match`/ETag voor optimistic concurrency; boekingsacties pas daarna via bound Actions. Welke concrete velden write-back krijgen is een openstaande business-vraag.
