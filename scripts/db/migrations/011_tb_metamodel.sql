-- Migratie 011: Generieke Table Builder — bron-neutraal metamodel (tb_*). Fase A (#AB:152).
-- Plan: docs/plans/dev_2026-06-30-generieke-table-builder-architectuur.md
-- Strangler-fig: tb_* staat NAAST de bestaande po_*-laag (die blijft het PO-scherm voeden tot de
-- omschakeling). Idempotent (IF NOT EXISTS) en non-destructief: po_* wordt niet gewijzigd of verwijderd.
-- Gebruikersdata (kolomregistry, eigen waarden, write-back-audit, view-state) migreert mee; de cache
-- (tb_cache) wordt NIET gemigreerd maar bij de eerstvolgende refresh opnieuw opgebouwd (afgeleide data).
-- Naamgeving (plan §4): scope master|detail (was header|line), source source|custom (was d365|custom).

-- ===========================================================================
-- tb_sources — bronnen-registry (herbruikbare bronverbinding; provider-type-gedreven)
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_sources' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_sources (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    [key] NVARCHAR(64) NOT NULL UNIQUE,
    label NVARCHAR(128) NOT NULL,
    provider_type NVARCHAR(32) NOT NULL
      CONSTRAINT CK_tb_sources_provider CHECK (provider_type IN ('d365_odata','sql_view','rest')),
    config_json NVARCHAR(MAX) NULL,         -- provider-specifiek (geen geheimen!)
    secret_ref NVARCHAR(128) NULL,          -- verwijst naar een app_settings-sleutel
    is_active BIT NOT NULL DEFAULT 1,
    created_by INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by INT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END

-- Seed: bestaande D365-connectie als eerste bron (config/geheimen blijven in app_settings).
IF NOT EXISTS (SELECT 1 FROM dbo.tb_sources WHERE [key] = 'd365')
  INSERT INTO dbo.tb_sources ([key], label, provider_type, config_json)
  VALUES ('d365', 'Dynamics 365 F&O', 'd365_odata', N'{"settingsPrefix":"D365_ODATA"}');

-- ===========================================================================
-- tb_tables — tabel-definitie (vervangt het impliciete "PO-board")
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_tables' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_tables (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    [key] NVARCHAR(64) NOT NULL UNIQUE,     -- slug + board_key voor prefs
    label NVARCHAR(128) NOT NULL,
    description NVARCHAR(512) NULL,
    source_id BIGINT NOT NULL,
    source_entity NVARCHAR(256) NOT NULL,   -- D365: /data/PurchaseOrderHeadersV2; SQL: vw_x; REST: pad
    key_fields NVARCHAR(256) NULL,          -- comma-sep natuurlijke sleutel
    default_filter_json NVARCHAR(MAX) NULL, -- bron-neutrale scope, door provider vertaald
    cache_mode NVARCHAR(16) NOT NULL DEFAULT 'auto'
      CONSTRAINT CK_tb_tables_cache_mode CHECK (cache_mode IN ('auto','always','never')),
    stale_minutes INT NOT NULL DEFAULT 15,
    max_rows INT NOT NULL DEFAULT 2000,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_by INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by INT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_tb_tables_source FOREIGN KEY (source_id) REFERENCES dbo.tb_sources(id)
  );
END

-- Seed: Purchase Orders als eerste concrete tabel.
IF NOT EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'purchase-orders')
  INSERT INTO dbo.tb_tables ([key], label, description, source_id, source_entity, key_fields, cache_mode, stale_minutes, max_rows)
  SELECT 'purchase-orders', 'Inkooporders', 'D365 Purchase Orders (header + lines)',
         s.id, '/data/PurchaseOrderHeadersV2', 'dataAreaId,PurchaseOrderNumber', 'auto', 15, 2000
  FROM dbo.tb_sources s WHERE s.[key] = 'd365';

-- ===========================================================================
-- tb_columns — uniforme kolom-registry (generalisatie van po_columns)
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_columns' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_columns (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    table_id BIGINT NOT NULL,
    scope NVARCHAR(16) NOT NULL CONSTRAINT CK_tb_columns_scope CHECK (scope IN ('master','detail')),
    [key] NVARCHAR(64) NOT NULL,
    label NVARCHAR(128) NOT NULL,
    source NVARCHAR(16) NOT NULL CONSTRAINT CK_tb_columns_source CHECK (source IN ('source','custom')),
    source_field NVARCHAR(128) NULL,
    data_type NVARCHAR(16) NOT NULL CONSTRAINT CK_tb_columns_data_type CHECK (data_type IN ('text','number','date','boolean','select')),
    options_json NVARCHAR(MAX) NULL,
    writable BIT NOT NULL DEFAULT 0,
    write_mechanism NVARCHAR(16) NULL CONSTRAINT CK_tb_columns_write_mechanism CHECK (write_mechanism IN ('patch','action','sql')),
    is_default_visible BIT NOT NULL DEFAULT 1,
    filterable BIT NOT NULL DEFAULT 1,
    sortable BIT NOT NULL DEFAULT 1,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_by INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by INT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_tb_columns_table FOREIGN KEY (table_id) REFERENCES dbo.tb_tables(id),
    CONSTRAINT UQ_tb_columns_table_scope_key UNIQUE (table_id, scope, [key])
  );

  CREATE INDEX IX_tb_columns_active ON dbo.tb_columns(table_id, is_active, scope, sort_order);
END

-- Migreer po_columns -> tb_columns met behoud van id (FK's van custom-waarden/correcties blijven kloppen).
-- Mapping: level header->master, line->detail; source d365->source; d365_field->source_field;
--          writable_to_d365->writable. is_default_visible/filterable/sortable -> defaults (1).
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_columns' AND schema_id = SCHEMA_ID('dbo'))
   AND EXISTS (SELECT 1 FROM dbo.po_columns)
   AND EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'purchase-orders')
   AND NOT EXISTS (
     SELECT 1 FROM dbo.tb_columns c
     INNER JOIN dbo.tb_tables t ON t.id = c.table_id
     WHERE t.[key] = 'purchase-orders'
   )
BEGIN
  DECLARE @poTableId BIGINT = (SELECT id FROM dbo.tb_tables WHERE [key] = 'purchase-orders');
  SET IDENTITY_INSERT dbo.tb_columns ON;
  INSERT INTO dbo.tb_columns
    (id, table_id, scope, [key], label, source, source_field, data_type, options_json,
     writable, write_mechanism, is_active, sort_order, created_by, created_at, updated_by, updated_at)
  SELECT
    pc.id, @poTableId,
    CASE pc.[level] WHEN 'header' THEN 'master' WHEN 'line' THEN 'detail' ELSE 'master' END,
    pc.[key], pc.label,
    CASE pc.source WHEN 'd365' THEN 'source' ELSE 'custom' END,
    pc.d365_field, pc.data_type, pc.options,
    pc.writable_to_d365, pc.write_mechanism, pc.is_active, pc.sort_order,
    pc.created_by, pc.created_at, pc.updated_by, pc.updated_at
  FROM dbo.po_columns pc;
  SET IDENTITY_INSERT dbo.tb_columns OFF;
END

-- ===========================================================================
-- tb_relations — master-detail-relatie (maakt "header/lines" generiek)
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_relations' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_relations (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    table_id BIGINT NOT NULL,
    detail_source_entity NVARCHAR(256) NULL,  -- bv. PurchaseOrderLines nav-property
    relation_kind NVARCHAR(16) NOT NULL DEFAULT 'expand'
      CONSTRAINT CK_tb_relations_kind CHECK (relation_kind IN ('expand','fk_join','none')),
    join_keys_json NVARCHAR(MAX) NULL,
    detail_key_fields NVARCHAR(256) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_tb_relations_table FOREIGN KEY (table_id) REFERENCES dbo.tb_tables(id),
    CONSTRAINT UQ_tb_relations_table UNIQUE (table_id)  -- v1: 1 master -> 0..1 detail
  );
END

-- Seed: PO -> lines (expand op de PurchaseOrderLines nav-property).
IF EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'purchase-orders')
   AND NOT EXISTS (
     SELECT 1 FROM dbo.tb_relations r INNER JOIN dbo.tb_tables t ON t.id = r.table_id
     WHERE t.[key] = 'purchase-orders'
   )
  INSERT INTO dbo.tb_relations (table_id, detail_source_entity, relation_kind, detail_key_fields)
  SELECT id, 'PurchaseOrderLines', 'expand', 'LineNumber'
  FROM dbo.tb_tables WHERE [key] = 'purchase-orders';

-- ===========================================================================
-- tb_cache — generieke, dynamisch-brede cache (data_json). Cache-is-leidend.
-- detail_key = -1 voor master-rijen (NULL kan niet in een PK matchen).
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_cache' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_cache (
    table_id BIGINT NOT NULL,
    scope NVARCHAR(16) NOT NULL CONSTRAINT CK_tb_cache_scope CHECK (scope IN ('master','detail')),
    partition_key NVARCHAR(32) NOT NULL,    -- bv. dataAreaId
    record_key NVARCHAR(128) NOT NULL,      -- natuurlijke sleutel (bv. PurchaseOrderNumber)
    detail_key INT NOT NULL DEFAULT -1,
    data_json NVARCHAR(MAX) NULL,           -- gecureerde bronvelden als getypeerde JSON
    source_modified_at DATETIME2 NULL,
    content_hash NVARCHAR(64) NULL,         -- alleen op master-rij (nieuw/gewijzigd-detectie)
    content_changed_at DATETIME2 NULL,
    synced_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    first_seen_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    removed_at_source BIT NOT NULL DEFAULT 0,
    CONSTRAINT PK_tb_cache PRIMARY KEY (table_id, scope, partition_key, record_key, detail_key),
    CONSTRAINT FK_tb_cache_table FOREIGN KEY (table_id) REFERENCES dbo.tb_tables(id)
  );

  CREATE INDEX IX_tb_cache_record ON dbo.tb_cache(table_id, scope, partition_key, record_key);
  CREATE INDEX IX_tb_cache_modified ON dbo.tb_cache(table_id, scope, source_modified_at);
END

-- ===========================================================================
-- tb_custom_values — app-native kolomwaarden (EAV, getypeerd). Werkt voor elke bron.
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_custom_values' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_custom_values (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    column_id BIGINT NOT NULL,
    table_id BIGINT NOT NULL,
    scope NVARCHAR(16) NOT NULL CONSTRAINT CK_tb_custom_values_scope CHECK (scope IN ('master','detail')),
    partition_key NVARCHAR(32) NOT NULL,
    record_key NVARCHAR(128) NOT NULL,
    detail_key INT NOT NULL DEFAULT -1,
    value_text NVARCHAR(MAX) NULL,
    value_number DECIMAL(38,10) NULL,
    value_date DATETIME2 NULL,
    value_bool BIT NULL,
    updated_by INT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_tb_custom_values_column FOREIGN KEY (column_id) REFERENCES dbo.tb_columns(id) ON DELETE CASCADE,
    CONSTRAINT UQ_tb_custom_values_cell UNIQUE (column_id, partition_key, record_key, detail_key)
  );

  CREATE INDEX IX_tb_custom_values_cell ON dbo.tb_custom_values(table_id, column_id, record_key, detail_key);
END

-- Migreer po_custom_values -> tb_custom_values (scope afgeleid uit de kolom).
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_custom_values' AND schema_id = SCHEMA_ID('dbo'))
   AND EXISTS (SELECT 1 FROM dbo.po_custom_values)
   AND EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'purchase-orders')
   AND NOT EXISTS (
     SELECT 1 FROM dbo.tb_custom_values cv INNER JOIN dbo.tb_tables t ON t.id = cv.table_id
     WHERE t.[key] = 'purchase-orders'
   )
BEGIN
  DECLARE @poTableId2 BIGINT = (SELECT id FROM dbo.tb_tables WHERE [key] = 'purchase-orders');
  SET IDENTITY_INSERT dbo.tb_custom_values ON;
  INSERT INTO dbo.tb_custom_values
    (id, column_id, table_id, scope, partition_key, record_key, detail_key, value_text, value_number, value_date, updated_by, updated_at)
  SELECT
    cv.id, cv.column_id, @poTableId2, tc.scope, cv.data_area_id, cv.order_number, cv.line_number,
    cv.value_text, cv.value_number, cv.value_date, cv.updated_by, cv.updated_at
  FROM dbo.po_custom_values cv
  INNER JOIN dbo.tb_columns tc ON tc.id = cv.column_id;
  SET IDENTITY_INSERT dbo.tb_custom_values OFF;
END

-- ===========================================================================
-- tb_sync_state — globale refresh-staat per tabel
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_sync_state' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_sync_state (
    table_id BIGINT NOT NULL PRIMARY KEY,
    watermark DATETIME2 NULL,
    last_full_sync_at DATETIME2 NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_tb_sync_state_table FOREIGN KEY (table_id) REFERENCES dbo.tb_tables(id)
  );
END

-- Start "stale" (geen last_full_sync_at) zodat de eerste lazy refresh tb_cache opbouwt.
IF EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'purchase-orders')
   AND NOT EXISTS (
     SELECT 1 FROM dbo.tb_sync_state ss INNER JOIN dbo.tb_tables t ON t.id = ss.table_id
     WHERE t.[key] = 'purchase-orders'
   )
  INSERT INTO dbo.tb_sync_state (table_id, watermark, last_full_sync_at)
  SELECT id, NULL, NULL FROM dbo.tb_tables WHERE [key] = 'purchase-orders';

-- ===========================================================================
-- tb_user_view_state — per gebruiker + tabel laatst-bekeken-watermerk (nieuw/gewijzigd)
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_user_view_state' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_user_view_state (
    table_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    last_viewed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_tb_user_view_state PRIMARY KEY (table_id, user_id),
    CONSTRAINT FK_tb_user_view_state_table FOREIGN KEY (table_id) REFERENCES dbo.tb_tables(id),
    CONSTRAINT FK_tb_user_view_state_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END

-- Migreer po_user_view_state -> tb_user_view_state (tabel purchase-orders).
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_user_view_state' AND schema_id = SCHEMA_ID('dbo'))
   AND EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'purchase-orders')
BEGIN
  INSERT INTO dbo.tb_user_view_state (table_id, user_id, last_viewed_at, updated_at)
  SELECT t.id, uv.user_id, uv.last_viewed_at, uv.updated_at
  FROM dbo.po_user_view_state uv
  CROSS JOIN dbo.tb_tables t
  WHERE t.[key] = 'purchase-orders'
    AND NOT EXISTS (
      SELECT 1 FROM dbo.tb_user_view_state o WHERE o.table_id = t.id AND o.user_id = uv.user_id
    );
END

-- ===========================================================================
-- tb_field_corrections — write-back audit + status (generalisatie van po_field_corrections)
-- ===========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_field_corrections' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_field_corrections (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    column_id BIGINT NOT NULL,
    table_id BIGINT NOT NULL,
    scope NVARCHAR(16) NOT NULL CONSTRAINT CK_tb_field_corr_scope CHECK (scope IN ('master','detail')),
    partition_key NVARCHAR(32) NOT NULL,
    record_key NVARCHAR(128) NOT NULL,
    detail_key INT NOT NULL DEFAULT -1,
    source_field NVARCHAR(128) NOT NULL,
    old_value NVARCHAR(MAX) NULL,
    new_value NVARCHAR(MAX) NULL,
    status NVARCHAR(16) NOT NULL DEFAULT 'pending'
      CONSTRAINT CK_tb_field_corr_status CHECK (status IN ('pending','applied','failed')),
    error NVARCHAR(MAX) NULL,
    created_by INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    applied_at DATETIME2 NULL,
    CONSTRAINT FK_tb_field_corr_column FOREIGN KEY (column_id) REFERENCES dbo.tb_columns(id)
  );

  CREATE INDEX IX_tb_field_corr_record ON dbo.tb_field_corrections(table_id, partition_key, record_key, detail_key);
  CREATE INDEX IX_tb_field_corr_status ON dbo.tb_field_corrections(status);
END

-- Migreer po_field_corrections -> tb_field_corrections (met behoud van id + audit-historie).
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_field_corrections' AND schema_id = SCHEMA_ID('dbo'))
   AND EXISTS (SELECT 1 FROM dbo.po_field_corrections)
   AND EXISTS (SELECT 1 FROM dbo.tb_tables WHERE [key] = 'purchase-orders')
   AND NOT EXISTS (
     SELECT 1 FROM dbo.tb_field_corrections fc INNER JOIN dbo.tb_tables t ON t.id = fc.table_id
     WHERE t.[key] = 'purchase-orders'
   )
BEGIN
  DECLARE @poTableId3 BIGINT = (SELECT id FROM dbo.tb_tables WHERE [key] = 'purchase-orders');
  SET IDENTITY_INSERT dbo.tb_field_corrections ON;
  INSERT INTO dbo.tb_field_corrections
    (id, column_id, table_id, scope, partition_key, record_key, detail_key, source_field,
     old_value, new_value, status, error, created_by, created_at, applied_at)
  SELECT
    fc.id, fc.column_id, @poTableId3, ISNULL(tc.scope, 'master'), fc.data_area_id, fc.order_number, fc.line_number,
    fc.d365_field, fc.old_value, fc.new_value, fc.status, fc.error, fc.created_by, fc.created_at, fc.applied_at
  FROM dbo.po_field_corrections fc
  LEFT JOIN dbo.tb_columns tc ON tc.id = fc.column_id;
  SET IDENTITY_INSERT dbo.tb_field_corrections OFF;
END
