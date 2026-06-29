-- Migratie 007: D365 Purchase Orders — SQL-cache + uniforme kolom-registry + eigen kolommen (EAV)
-- Fase 1 (#AB:132). Idempotent: veilig meerdere keren uitvoeren.
-- Ontwerpkeuze: header- en regelvelden zijn disjunct, daarom twee cache-tabellen
-- (po_cache_headers / po_cache_lines) i.p.v. de enkele po_cache uit het conceptplan.

-- ---------------------------------------------------------------------------
-- po_columns — uniforme kolom-registry (D365-velden + eigen kolommen)
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_columns' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.po_columns (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    [key] NVARCHAR(64) NOT NULL,
    label NVARCHAR(128) NOT NULL,
    source NVARCHAR(16) NOT NULL CONSTRAINT CK_po_columns_source CHECK (source IN ('d365','custom')),
    [level] NVARCHAR(16) NOT NULL CONSTRAINT CK_po_columns_level CHECK ([level] IN ('header','line')),
    data_type NVARCHAR(16) NOT NULL CONSTRAINT CK_po_columns_data_type CHECK (data_type IN ('text','number','date','boolean','select')),
    options NVARCHAR(MAX) NULL,
    d365_field NVARCHAR(128) NULL,
    writable_to_d365 BIT NOT NULL DEFAULT 0,
    write_mechanism NVARCHAR(16) NULL CONSTRAINT CK_po_columns_write_mechanism CHECK (write_mechanism IN ('patch','action')),
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_by INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by INT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_po_columns_level_key UNIQUE ([level], [key])
  );

  CREATE INDEX IX_po_columns_active ON dbo.po_columns(is_active, [level], sort_order);
END

-- ---------------------------------------------------------------------------
-- po_cache_headers — gecachete D365 PO-headers
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_cache_headers' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.po_cache_headers (
    data_area_id NVARCHAR(16) NOT NULL,
    order_number NVARCHAR(64) NOT NULL,
    vendor_account NVARCHAR(64) NULL,
    vendor_name NVARCHAR(256) NULL,
    status NVARCHAR(64) NULL,
    currency_code NVARCHAR(8) NULL,
    requested_delivery_date DATETIME2 NULL,
    created_date_time DATETIME2 NULL,
    d365_modified_at DATETIME2 NULL,
    raw_json NVARCHAR(MAX) NULL,
    synced_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    first_seen_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    removed_in_d365 BIT NOT NULL DEFAULT 0,
    CONSTRAINT PK_po_cache_headers PRIMARY KEY (data_area_id, order_number)
  );

  CREATE INDEX IX_po_cache_headers_status ON dbo.po_cache_headers(status);
  CREATE INDEX IX_po_cache_headers_modified ON dbo.po_cache_headers(d365_modified_at);
END

-- ---------------------------------------------------------------------------
-- po_cache_lines — gecachete D365 PO-regels
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_cache_lines' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.po_cache_lines (
    data_area_id NVARCHAR(16) NOT NULL,
    order_number NVARCHAR(64) NOT NULL,
    line_number INT NOT NULL,
    item_number NVARCHAR(64) NULL,
    description NVARCHAR(512) NULL,
    quantity DECIMAL(18,4) NULL,
    unit NVARCHAR(16) NULL,
    line_amount DECIMAL(18,4) NULL,
    currency_code NVARCHAR(8) NULL,
    requested_delivery_date DATETIME2 NULL,
    raw_json NVARCHAR(MAX) NULL,
    synced_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_po_cache_lines PRIMARY KEY (data_area_id, order_number, line_number)
  );

  CREATE INDEX IX_po_cache_lines_order ON dbo.po_cache_lines(data_area_id, order_number);
END

-- ---------------------------------------------------------------------------
-- po_custom_values — waarden van eigen kolommen (EAV, getypeerd)
-- line_number = -1 betekent header-niveau (NULL kan niet in een UNIQUE-sleutel matchen)
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_custom_values' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.po_custom_values (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    column_id BIGINT NOT NULL,
    data_area_id NVARCHAR(16) NOT NULL,
    order_number NVARCHAR(64) NOT NULL,
    line_number INT NOT NULL DEFAULT -1,
    value_text NVARCHAR(MAX) NULL,
    value_number DECIMAL(38,10) NULL,
    value_date DATETIME2 NULL,
    updated_by INT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_po_custom_values_column FOREIGN KEY (column_id) REFERENCES dbo.po_columns(id) ON DELETE CASCADE,
    CONSTRAINT UQ_po_custom_values_cell UNIQUE (column_id, data_area_id, order_number, line_number)
  );

  CREATE INDEX IX_po_custom_values_cell ON dbo.po_custom_values(column_id, order_number, line_number);
END

-- ---------------------------------------------------------------------------
-- po_sync_state — globale refresh-staat (Fase 1: synced_at/watermark voor versheid)
-- id = 1 is de enige globale rij.
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_sync_state' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.po_sync_state (
    id INT NOT NULL PRIMARY KEY,
    watermark DATETIME2 NULL,
    last_full_sync_at DATETIME2 NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );

  INSERT INTO dbo.po_sync_state (id, watermark, last_full_sync_at) VALUES (1, NULL, NULL);
END

-- ---------------------------------------------------------------------------
-- Seed: D365-velden in de kolom-registry (idempotent per level+key)
-- ---------------------------------------------------------------------------
MERGE dbo.po_columns AS target
USING (VALUES
  -- header-niveau
  ('orderNumber',            'Inkooporder',     'header', 'text',   'PurchaseOrderNumber',     10),
  ('vendorAccount',          'Leverancier',     'header', 'text',   'OrderVendorAccountNumber',20),
  ('vendorName',             'Leveranciersnaam','header', 'text',   'PurchaseOrderName',       30),
  ('status',                 'Status',          'header', 'text',   'PurchaseOrderStatus',     40),
  ('currencyCode',           'Valuta',          'header', 'text',   'CurrencyCode',            50),
  ('requestedDeliveryDate',  'Leverdatum',      'header', 'date',   'RequestedDeliveryDate',   60),
  ('createdDateTime',        'Aangemaakt',      'header', 'date',   'CreatedDateTime',         70),
  -- regel-niveau
  ('lineNumber',             'Regel',           'line',   'number', 'LineNumber',              10),
  ('itemNumber',             'Artikel',         'line',   'text',   'ItemNumber',              20),
  ('description',            'Omschrijving',    'line',   'text',   'LineDescription',         30),
  ('quantity',               'Aantal',          'line',   'number', 'OrderedPurchaseQuantity', 40),
  ('unit',                   'Eenheid',         'line',   'text',   'PurchaseUnitSymbol',      50),
  ('lineAmount',             'Regelbedrag',     'line',   'number', 'LineAmount',              60),
  ('requestedDeliveryDate',  'Leverdatum',      'line',   'date',   'RequestedReceiptDate',    70)
) AS src ([key], label, [level], data_type, d365_field, sort_order)
ON target.[level] = src.[level] AND target.[key] = src.[key]
WHEN NOT MATCHED THEN
  INSERT ([key], label, source, [level], data_type, d365_field, writable_to_d365, is_active, sort_order)
  VALUES (src.[key], src.label, 'd365', src.[level], src.data_type, src.d365_field, 0, 1, src.sort_order);
