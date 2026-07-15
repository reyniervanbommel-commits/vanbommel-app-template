-- Migratie 029: indexen voor de board revision-check (getRevision()).
-- De revision-endpoint doet MAX()-subqueries over timestamp-kolommen om te bepalen of het board
-- opnieuw gelezen moet worden. Zonder deze indexen wordt dat een table-scan op de grootste tabellen
-- (tb_cache, tb_custom_values) en verdampt de winst t.o.v. een volledige read.
-- tb_change_ledger heeft al IX (table_id, created_at DESC, source) uit migratie 021.
-- Idempotent + non-destructief.

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tb_cache_content_changed' AND object_id = OBJECT_ID('dbo.tb_cache'))
  CREATE INDEX IX_tb_cache_content_changed ON dbo.tb_cache(table_id, content_changed_at);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tb_cache_first_seen' AND object_id = OBJECT_ID('dbo.tb_cache'))
  CREATE INDEX IX_tb_cache_first_seen ON dbo.tb_cache(table_id, first_seen_at);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tb_custom_values_updated' AND object_id = OBJECT_ID('dbo.tb_custom_values'))
  CREATE INDEX IX_tb_custom_values_updated ON dbo.tb_custom_values(table_id, updated_at);
