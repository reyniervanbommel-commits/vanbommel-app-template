-- Migratie 034: verwijder de legacy kolomrij purchase-orders/detail/receivedPurchaseQuantity.
--
-- Achtergrond: 026 maakte deze rij aan voor een D365-veld dat niet op PurchaseOrderLineV2 bestaat
-- (zie 026 regel 3), 028 zette hem inactief. Sinds 029 komt de waarde binnen als lookup vanuit de
-- ontvangstregels, met dezelfde sleutel. De rij is daarmee overbodig en levert twee kolommen
-- 'Received qty' op in de admin-tab (die toont inactieve kolommen bewust).
--
-- Veiligheidscontrole vóór deze migratie (DEV, 2026-07-19):
--   * 0 verwijzende rijen in tb_custom_values / tb_field_corrections / tb_cell_history /
--     tb_row_remarks — de enige FK's naar tb_columns.
--   * De formulekolom 'deliverRemainderApprox' verwijst naar (receivedpurchasequantity), maar
--     formules resolven tegen rijwaarden (case-insensitive), niet tegen het kolomregister. De
--     lookup levert die waarde, dus de formule blijft gewoon rekenen.
--   * Formulevalidatie draait op listColumns({includeInactive: false}); de rij zat daar als
--     inactieve kolom sowieso al niet in. Verwijderen verandert daar dus niets aan.
--
-- Let op de wisselwerking met 026: die heeft IF NOT EXISTS en maakt de rij bij elke deploy opnieuw
-- aan (inactief). Omdat migraties op bestandsnaam gesorteerd draaien, loopt 034 daarna en is de
-- eindstand per deploy altijd 'verwijderd'. Geen marker nodig: een DELETE is vanzelf idempotent.

IF OBJECT_ID('dbo.tb_columns', 'U') IS NOT NULL
   AND EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'purchase-orders')
BEGIN
  DECLARE @poTableId BIGINT = (SELECT id FROM dbo.tb_tables WHERE [key] = 'purchase-orders');

  DELETE FROM dbo.tb_columns
  WHERE table_id = @poTableId
    AND scope = 'detail'
    AND [key] = 'receivedPurchaseQuantity'
    -- Uitsluitend de legacy, niet-gesynct gebleven rij. Mocht D365 het veld ooit wél leveren en
    -- iemand de kolom activeren, dan blijft hij staan.
    AND is_active = 0;
END;
