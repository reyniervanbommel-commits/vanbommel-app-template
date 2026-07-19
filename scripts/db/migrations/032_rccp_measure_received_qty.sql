-- Migratie 032: geef 'Received qty' vrij als RCCP-waardekolom.
--
-- De waarde komt op het PO-bord binnen als lookup-kolom vanuit de ontvangstregels (relatie uit
-- migratie 029). Een lookup-kolom is synthetisch en heeft geen eigen tb_columns-rij, dus hij kan de
-- vlag niet zelf dragen — hij erft die van zijn doelkolom. Vandaar dat we hier de doelkolom op
-- product-receipt-lines vrijgeven, niet iets op purchase-orders.
--
-- Eenmalige seed. De runner draait elke migratie bij iedere deploy opnieuw, dus zonder marker zou
-- deze UPDATE een door de admin uitgezette kolom telkens weer aanzetten (zie de vergelijkbare
-- redenering in 031). De marker in app_settings maakt de seed eenmalig; daarna is het puur een
-- admin-keuze op de data model-tab.

IF OBJECT_ID('dbo.tb_columns', 'U') IS NOT NULL
   AND OBJECT_ID('dbo.app_settings', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.app_settings
    WHERE setting_key = 'MIGRATION_032_RCCP_RECEIVED_QTY_SEEDED'
  )
  BEGIN
    UPDATE c
    SET c.rccp_measure = 1
    FROM dbo.tb_columns c
    INNER JOIN dbo.tb_tables t ON t.id = c.table_id
    WHERE t.[key] = 'product-receipt-lines'
      AND c.[key] = 'receivedPurchaseQuantity'
      AND c.scope = 'master';

    INSERT INTO dbo.app_settings (setting_key, setting_value)
    VALUES ('MIGRATION_032_RCCP_RECEIVED_QTY_SEEDED', '1');
  END;
END;
