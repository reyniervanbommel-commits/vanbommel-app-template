-- Migratie 018: tb_row_exclusions — handmatig verborgen masterrijen op de generieke tb_*-laag (#AB:171).
-- Plan: .cursor/plans/dev_2026-07-03-po-board-cutover-tb.plan.md (board-cutover Fase 2).
-- Generalisatie van po_row_exclusions: verwijderen = een persistente exclusion per (tabel, partitie, record),
-- geen harde delete. Een refresh haalt de rij wel opnieuw op; read() filtert hem eruit zolang de exclusion bestaat.
-- Idempotent + non-destructief.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_row_exclusions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_row_exclusions (
    table_id BIGINT NOT NULL,
    partition_key NVARCHAR(32) NOT NULL,
    record_key NVARCHAR(128) NOT NULL,
    reason NVARCHAR(32) NOT NULL CONSTRAINT DF_tb_row_exclusions_reason DEFAULT 'manual_delete',
    excluded_by INT NULL,
    excluded_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_tb_row_exclusions PRIMARY KEY (table_id, partition_key, record_key),
    CONSTRAINT FK_tb_row_exclusions_table FOREIGN KEY (table_id) REFERENCES dbo.tb_tables(id),
    CONSTRAINT FK_tb_row_exclusions_user FOREIGN KEY (excluded_by) REFERENCES dbo.users(id) ON DELETE SET NULL
  );
END
