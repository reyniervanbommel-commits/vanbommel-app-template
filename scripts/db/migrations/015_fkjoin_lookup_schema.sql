-- Migratie 015 (standalone Excel #AB:162): tb_relations uitbreiden voor lookup-relaties (fk_join).
-- Dit is het minimale fk_join-fundament dat de Excel-koppeling nodig heeft, los overgenomen uit #161
-- zodat #162 zelfstandig op develop test-/mergebaar is. Idempotent (IF NOT EXISTS) + non-destructief.
-- LET OP: #161 levert dezelfde kolommen via 015_tb_relations_lookups.sql; beide zijn idempotent, dus
-- samen draaien is veilig. Na een #161-merge mag dit bestand verwijderd worden (dan is het overbodig).
-- Deel 1/2 (schema). De vervangende detail-index staat in 016_fkjoin_detail_index.sql (aparte batch:
-- de migratie-runner gebruikt .batch(), en relation_role is pas in een volgende batch bij naam refereerbaar).

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tb_relations') AND name = 'relation_role')
  ALTER TABLE dbo.tb_relations ADD relation_role NVARCHAR(16) NOT NULL
    CONSTRAINT DF_tb_relations_role DEFAULT 'detail'
    CONSTRAINT CK_tb_relations_role CHECK (relation_role IN ('detail','lookup'));

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tb_relations') AND name = 'source_scope')
  ALTER TABLE dbo.tb_relations ADD source_scope NVARCHAR(16) NULL
    CONSTRAINT CK_tb_relations_source_scope CHECK (source_scope IN ('master','detail'));

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tb_relations') AND name = 'source_field')
  ALTER TABLE dbo.tb_relations ADD source_field NVARCHAR(128) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tb_relations') AND name = 'target_table_key')
  ALTER TABLE dbo.tb_relations ADD target_table_key NVARCHAR(64) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tb_relations') AND name = 'target_key_field')
  ALTER TABLE dbo.tb_relations ADD target_key_field NVARCHAR(128) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tb_relations') AND name = 'lookup_fields_json')
  ALTER TABLE dbo.tb_relations ADD lookup_fields_json NVARCHAR(MAX) NULL;

-- De oude 1-relatie-per-tabel-constraint (011) moet weg; lookups mogen meervoudig per tabel.
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_tb_relations_table' AND parent_object_id = OBJECT_ID('dbo.tb_relations'))
  ALTER TABLE dbo.tb_relations DROP CONSTRAINT UQ_tb_relations_table;
