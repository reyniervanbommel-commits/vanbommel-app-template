-- sync_retained: PO's die uit de harde D365-filter vielen maar bewust in de app blijven
-- en via fase-2 refresh uit D365 worden bijgewerkt.

IF COL_LENGTH('dbo.tb_cache', 'sync_retained') IS NULL
BEGIN
  ALTER TABLE dbo.tb_cache
    ADD sync_retained BIT NOT NULL
      CONSTRAINT DF_tb_cache_sync_retained DEFAULT 0;
END

IF COL_LENGTH('dbo.tb_cache', 'sync_retained_at') IS NULL
BEGIN
  ALTER TABLE dbo.tb_cache
    ADD sync_retained_at DATETIME2 NULL;
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_tb_cache_retained'
    AND object_id = OBJECT_ID('dbo.tb_cache')
)
BEGIN
  CREATE INDEX IX_tb_cache_retained
    ON dbo.tb_cache(table_id, sync_retained)
    WHERE scope = 'master' AND sync_retained = 1;
END
