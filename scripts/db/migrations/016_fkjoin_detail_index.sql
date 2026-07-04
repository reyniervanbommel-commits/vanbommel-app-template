-- Migratie 016 (standalone Excel #AB:162): vervangende constraint "max 1 detail-relatie per tabel".
-- Deel 2/2 na 015_fkjoin_lookup_schema.sql. Via EXEC omdat relation_role in 015 is toegevoegd
-- (deferred name resolution binnen dezelfde .batch()). Idempotent. Zie 015 voor de #161-samenloop-notitie.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tb_relations_detail' AND object_id = OBJECT_ID('dbo.tb_relations'))
  EXEC('CREATE UNIQUE INDEX UX_tb_relations_detail ON dbo.tb_relations(table_id) WHERE relation_role = ''detail''');
