-- Migratie 011: cel-geschiedenis (audit trail) voor eigen (custom) kolomwaarden. Idempotent.
-- Append-only: elke wijziging van een po_custom_values-cel levert hier één rij.
-- D365-veldcorrecties hebben hun eigen historie (po_field_corrections, migratie 010);
-- de lees-/UI-laag unioneert beide tot één per-cel tijdlijn.
-- Bron-neutraal ontwerp: mapt later 1-op-1 op tb_cell_history (level->scope,
-- data_area_id->partition_key, order_number->record_key, line_number->detail_key).
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_cell_history' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.po_cell_history (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    column_id BIGINT NOT NULL,
    data_area_id NVARCHAR(16) NOT NULL,
    order_number NVARCHAR(64) NOT NULL,
    line_number INT NOT NULL DEFAULT -1,          -- -1 = header-niveau (conform po_custom_values)
    action NVARCHAR(16) NOT NULL                  -- 'insert' | 'update' | 'clear'
      CONSTRAINT CK_po_cell_history_action CHECK (action IN ('insert','update','clear')),
    -- oude waarde (getypeerd; NULL bij eerste invoer)
    old_value_text NVARCHAR(MAX) NULL,
    old_value_number DECIMAL(38,10) NULL,
    old_value_date DATETIME2 NULL,
    -- nieuwe waarde (getypeerd; NULL bij wissen)
    new_value_text NVARCHAR(MAX) NULL,
    new_value_number DECIMAL(38,10) NULL,
    new_value_date DATETIME2 NULL,
    change_reason NVARCHAR(512) NULL,             -- gereserveerd; v1 niet gevuld
    changed_by INT NULL,                          -- geen cascade: historie overleeft een kolom-/gebruikersverwijdering
    changed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_po_cell_history_column FOREIGN KEY (column_id) REFERENCES dbo.po_columns(id)
  );

  -- Hot read: alle wijzigingen van één cel, nieuwste eerst.
  CREATE INDEX IX_po_cell_history_cell
    ON dbo.po_cell_history (column_id, data_area_id, order_number, line_number, changed_at DESC);
END
