-- Migratie 024: vendor_account op dbo.users
-- Expliciet leveranciersaccount per gebruiker. Wordt gebruikt om het PO-board voor
-- supplier-gebruikers te filteren (TableDataService.read). Zonder waarde valt de app
-- terug op het local-part van het e-mailadres.
-- Idempotent: veilig meerdere keren uitvoeren.

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.users') AND name = 'vendor_account'
)
BEGIN
  ALTER TABLE dbo.users ADD vendor_account NVARCHAR(64) NULL;
END;
