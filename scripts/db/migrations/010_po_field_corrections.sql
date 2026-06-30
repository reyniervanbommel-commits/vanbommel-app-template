-- Migratie 010: write-back audit + status (#AB:134, Fase 3). Idempotent.
-- po_columns heeft writable_to_d365 + write_mechanism al (migratie 007); hier alleen de audit-tabel.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_field_corrections' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.po_field_corrections (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    column_id BIGINT NOT NULL,
    data_area_id NVARCHAR(16) NOT NULL,
    order_number NVARCHAR(64) NOT NULL,
    line_number INT NOT NULL DEFAULT -1,         -- -1 = header-niveau
    d365_field NVARCHAR(128) NOT NULL,
    old_value NVARCHAR(MAX) NULL,                 -- waarde waarop de gebruiker baseerde (concurrency-check)
    new_value NVARCHAR(MAX) NULL,
    status NVARCHAR(16) NOT NULL DEFAULT 'pending'
      CONSTRAINT CK_po_field_corrections_status CHECK (status IN ('pending', 'applied', 'failed')),
    error NVARCHAR(MAX) NULL,
    created_by INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    applied_at DATETIME2 NULL,
    CONSTRAINT FK_po_field_corrections_column FOREIGN KEY (column_id) REFERENCES dbo.po_columns(id)
  );

  CREATE INDEX IX_po_field_corrections_order ON dbo.po_field_corrections(data_area_id, order_number, line_number);
  CREATE INDEX IX_po_field_corrections_status ON dbo.po_field_corrections(status);
END
