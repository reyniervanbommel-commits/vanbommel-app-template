-- Migratie 021: centrale change-ledger voor D365 + user mutaties (#AB:196).
-- Idempotent en non-destructief.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_change_ledger' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_change_ledger (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    table_id BIGINT NOT NULL,
    partition_key NVARCHAR(32) NOT NULL,
    record_key NVARCHAR(128) NOT NULL,
    detail_key INT NOT NULL DEFAULT -1,
    field_key NVARCHAR(128) NULL,
    source NVARCHAR(16) NOT NULL
      CONSTRAINT CK_tb_change_ledger_source CHECK (source IN ('USER', 'D365')),
    action NVARCHAR(16) NOT NULL
      CONSTRAINT CK_tb_change_ledger_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_value NVARCHAR(MAX) NULL,
    new_value NVARCHAR(MAX) NULL,
    changed_by_user_id INT NULL,
    correlation_id NVARCHAR(64) NULL,
    refresh_job_id NVARCHAR(64) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_tb_change_ledger_table FOREIGN KEY (table_id) REFERENCES dbo.tb_tables(id),
    CONSTRAINT FK_tb_change_ledger_user FOREIGN KEY (changed_by_user_id) REFERENCES dbo.users(id)
  );
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.tb_change_ledger')
    AND name = 'IX_tb_change_ledger_table_created'
)
BEGIN
  CREATE INDEX IX_tb_change_ledger_table_created
    ON dbo.tb_change_ledger (table_id, created_at DESC, source);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.tb_change_ledger')
    AND name = 'IX_tb_change_ledger_record'
)
BEGIN
  CREATE INDEX IX_tb_change_ledger_record
    ON dbo.tb_change_ledger (table_id, partition_key, record_key, detail_key, created_at DESC);
END
