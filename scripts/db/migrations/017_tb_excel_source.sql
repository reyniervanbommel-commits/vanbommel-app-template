-- Migratie 017: Excel-upload als generieke bron in het tb_*-metamodel (#AB:162).
-- Plan: .cursor/plans/dev_excel-koppeling-hoofdtabel_184778a6.plan.md
-- Bouwt voort op 011 (metamodel) en 015/016 (fk_join-lookups uit #AB:161). Idempotent + non-destructief.
--
-- Kernidee: een geuploade Excel is GEEN nieuw parallel systeem, maar gewoon nog een bron.
--   * provider_type 'excel' erbij op tb_sources (CHECK uitbreiden).
--   * per upload een tb_tables-rij (cache_mode='never' -> refresh()/isStale slaan de tabel over: de
--     upload-snapshot IS de bron; er valt niets te pollen).
--   * kolommen -> tb_columns (source='source'); rijen -> tb_cache (scope master). Beide dynamisch door
--     ExcelUploadService, niet hier geseed.
--   * koppeling -> tb_relations relation_role='lookup' (exact hetzelfde mechanisme als vendors/items).
-- Deze migratie zet alleen het schema + de gedeelde 'excel'-bron klaar.

-- ===========================================================================
-- 1) provider_type 'excel' toestaan op tb_sources.
--    De CHECK-constraint droppen en hermaken; bestaande rijen (d365_odata/sql_view/rest) blijven geldig.
-- ===========================================================================
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_tb_sources_provider' AND parent_object_id = OBJECT_ID('dbo.tb_sources'))
  ALTER TABLE dbo.tb_sources DROP CONSTRAINT CK_tb_sources_provider;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_tb_sources_provider' AND parent_object_id = OBJECT_ID('dbo.tb_sources'))
  ALTER TABLE dbo.tb_sources ADD CONSTRAINT CK_tb_sources_provider
    CHECK (provider_type IN ('d365_odata','sql_view','rest','excel'));

-- ===========================================================================
-- 2) Gedeelde 'excel'-bron. Alle geuploade datasets hangen aan deze ene bron; de dataset-metadata
--    (bestandsnaam, rij-telling) staat op tb_upload_batches, niet in config_json.
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.tb_sources WHERE [key] = 'excel')
  INSERT INTO dbo.tb_sources ([key], label, provider_type, config_json)
  VALUES ('excel', 'Excel-upload', 'excel', N'{"kind":"upload"}');

-- ===========================================================================
-- 3) tb_upload_batches — audit/herupload-historie per Excel-dataset (louter metadata, geen rijdata;
--    de rijdata staat in tb_cache). Eén tb_table kan meerdere batches hebben (her-uploads).
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_upload_batches' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_upload_batches (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    table_id BIGINT NOT NULL,
    file_name NVARCHAR(260) NULL,
    row_count INT NOT NULL DEFAULT 0,
    column_count INT NOT NULL DEFAULT 0,
    key_field NVARCHAR(128) NULL,          -- gekozen dataset-sleutelkolom op moment van publiceren (nullable tot publish)
    status NVARCHAR(16) NOT NULL DEFAULT 'draft'
      CONSTRAINT CK_tb_upload_batches_status CHECK (status IN ('draft','published','replaced')),
    uploaded_by INT NULL,
    uploaded_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_tb_upload_batches_table FOREIGN KEY (table_id) REFERENCES dbo.tb_tables(id)
  );

  CREATE INDEX IX_tb_upload_batches_table ON dbo.tb_upload_batches(table_id, uploaded_at);
END
