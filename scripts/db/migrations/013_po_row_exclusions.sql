-- Migratie 013: po_row_exclusions — handmatig verborgen PO-rijen ("SQL-only verwijderen").
-- Verwijderen in het PO-scherm doet GEEN harde DELETE, maar zet een persistente exclusion.
-- Zo haalt een D365-refresh de rij wel opnieuw op (data blijft actueel voor een eventueel
-- later "opnemen"), maar read() filtert de rij eruit zolang de exclusion bestaat.
-- Eén verborgen-status: exclusions sluiten aan op de bestaande removed_in_d365-leeslogica.
-- Idempotent: veilig meerdere keren uitvoeren.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_row_exclusions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.po_row_exclusions (
    data_area_id NVARCHAR(16) NOT NULL,
    order_number NVARCHAR(64) NOT NULL,
    reason NVARCHAR(32) NOT NULL CONSTRAINT DF_po_row_exclusions_reason DEFAULT 'manual_delete',
    excluded_by INT NULL,
    excluded_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_po_row_exclusions PRIMARY KEY (data_area_id, order_number),
    CONSTRAINT FK_po_row_exclusions_user FOREIGN KEY (excluded_by) REFERENCES dbo.users(id) ON DELETE SET NULL
  );
END
