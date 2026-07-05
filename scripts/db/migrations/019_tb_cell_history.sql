-- Migratie 019: cel-geschiedenis (audit trail) voor eigen (custom) tb_-kolomwaarden (#AB:173, cutover Fase 4).
-- Append-only: elke wijziging van een tb_custom_values-cel levert hier één rij. D365-veldcorrecties hebben
-- hun eigen historie (tb_field_corrections, migratie 011); de lees-/UI-laag unioneert beide tot één per-cel
-- tijdlijn. Generalisatie van po_cell_history (level->scope, data_area_id->partition_key,
-- order_number->record_key, line_number->detail_key). Idempotent.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_cell_history' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_cell_history (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    column_id BIGINT NOT NULL,
    table_id BIGINT NOT NULL,
    scope NVARCHAR(16) NOT NULL CONSTRAINT CK_tb_cell_history_scope CHECK (scope IN ('master','detail')),
    partition_key NVARCHAR(32) NOT NULL,
    record_key NVARCHAR(128) NOT NULL,
    detail_key INT NOT NULL DEFAULT -1,           -- -1 = master-niveau (conform tb_custom_values)
    action NVARCHAR(16) NOT NULL
      CONSTRAINT CK_tb_cell_history_action CHECK (action IN ('insert','update','clear')),
    -- oude waarde (getypeerd; NULL bij eerste invoer)
    old_value_text NVARCHAR(MAX) NULL,
    old_value_number DECIMAL(38,10) NULL,
    old_value_date DATETIME2 NULL,
    old_value_bool BIT NULL,
    -- nieuwe waarde (getypeerd; NULL bij wissen)
    new_value_text NVARCHAR(MAX) NULL,
    new_value_number DECIMAL(38,10) NULL,
    new_value_date DATETIME2 NULL,
    new_value_bool BIT NULL,
    change_reason NVARCHAR(512) NULL,             -- gereserveerd; v1 niet gevuld
    changed_by INT NULL,                          -- geen cascade: historie overleeft een kolom-/gebruikersverwijdering
    changed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_tb_cell_history_column FOREIGN KEY (column_id) REFERENCES dbo.tb_columns(id)
  );

  -- Hot read: alle wijzigingen van één cel, nieuwste eerst.
  CREATE INDEX IX_tb_cell_history_cell
    ON dbo.tb_cell_history (column_id, partition_key, record_key, detail_key, changed_at DESC);
END
