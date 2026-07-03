-- Migratie 015: tb_relations uitbreiden voor lookup-relaties (fk_join) naast de master-detail-relatie (#AB:161).
-- Plan: .cursor/plans/dev_2026-07-03-datamodel-vendors-items-tb.plan.md
-- Deel 1/2 (schema). Deel 2 (seed vendors/items + lookups) staat in 016_tb_vendors_items.sql — bewust
-- een aparte batch, omdat de migratie-runner .batch() gebruikt (geen GO) en nieuw toegevoegde kolommen
-- pas in een volgende batch bij naam refereerbaar zijn.
-- Idempotent (IF NOT EXISTS) en non-destructief: 011 kende 1 master-detail-relatie per tabel; PO krijgt
-- er nu 2 lookups bij (naar vendors + items). De bestaande expand-relatie (PO -> lines) blijft ongewijzigd.

-- Onderscheid detail-relatie (de master-detail, bv. PO -> lines via $expand) vs lookup-relatie (fk_join
-- naar een andere tb_table, bv. PO.header -> vendors). Bestaande rijen worden via de DEFAULT 'detail'.
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
-- De vervangende "max 1 detail-relatie"-index staat in 016 (refereert relation_role -> aparte batch).
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_tb_relations_table' AND parent_object_id = OBJECT_ID('dbo.tb_relations'))
  ALTER TABLE dbo.tb_relations DROP CONSTRAINT UQ_tb_relations_table;
