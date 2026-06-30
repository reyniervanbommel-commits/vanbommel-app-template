-- Migratie 008: corrigeer gegokte D365-veldnamen in de kolomregistry (#AB:131 — Fase 0, $metadata-verificatie).
-- Geverifieerd via $metadata van PurchaseOrderHeaderV2 / PurchaseOrderLineV2 op de ACC-sandbox.
-- Idempotent: UPDATE's zijn herhaalbaar; alleen rijen met de oude (foute) waarde worden geraakt.

-- 1) Regel-leverdatum: 'RequestedReceiptDate' bestaat NIET op PurchaseOrderLineV2.
--    Het echte veld is 'RequestedDeliveryDate'.
UPDATE dbo.po_columns
SET d365_field = 'RequestedDeliveryDate', updated_at = SYSUTCDATETIME()
WHERE [level] = 'line' AND [key] = 'requestedDeliveryDate' AND d365_field = 'RequestedReceiptDate';

-- 2) Header 'createdDateTime': 'CreatedDateTime' is niet geëxposeerd op PurchaseOrderHeaderV2;
--    'AccountingDate' is het bruikbare datumveld (en de bestaande fallback in mapPurchaseOrder).
UPDATE dbo.po_columns
SET d365_field = 'AccountingDate', updated_at = SYSUTCDATETIME()
WHERE [level] = 'header' AND [key] = 'createdDateTime' AND d365_field = 'CreatedDateTime';

-- 3) Header 'vendorName': 'PurchaseOrderName' is de ORDER-naam, niet de leveranciersnaam.
--    De leveranciersnaam wordt afgeleid uit de VendorsV2-verrijking, niet uit een direct
--    header-veld. d365_field daarom op NULL (afgeleid/verrijkt veld).
UPDATE dbo.po_columns
SET d365_field = NULL, updated_at = SYSUTCDATETIME()
WHERE [level] = 'header' AND [key] = 'vendorName' AND d365_field = 'PurchaseOrderName';
