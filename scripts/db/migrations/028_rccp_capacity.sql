-- RCCP capacity planning tables (#AB:224)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'rccp_capacity' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.rccp_capacity (
    id BIGINT IDENTITY(1,1) NOT NULL,
    vendor_account NVARCHAR(64) NOT NULL,
    period_year INT NOT NULL,
    iso_week INT NOT NULL,
    capacity_category NVARCHAR(128) NOT NULL,
    available_qty DECIMAL(18, 4) NOT NULL CONSTRAINT DF_rccp_capacity_available DEFAULT (0),
    created_at DATETIME2 NOT NULL CONSTRAINT DF_rccp_capacity_created DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_rccp_capacity_updated DEFAULT (SYSUTCDATETIME()),
    updated_by INT NULL,
    CONSTRAINT PK_rccp_capacity PRIMARY KEY CLUSTERED (id),
    CONSTRAINT UQ_rccp_capacity UNIQUE (vendor_account, period_year, iso_week, capacity_category)
  );
  CREATE INDEX IX_rccp_capacity_vendor_period ON dbo.rccp_capacity (vendor_account, period_year, iso_week);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'rccp_import_batches' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.rccp_import_batches (
    id BIGINT IDENTITY(1,1) NOT NULL,
    file_name NVARCHAR(256) NULL,
    imported_at DATETIME2 NOT NULL CONSTRAINT DF_rccp_import_batches_imported DEFAULT (SYSUTCDATETIME()),
    imported_by INT NULL,
    total_rows INT NOT NULL CONSTRAINT DF_rccp_import_batches_total DEFAULT (0),
    valid_rows INT NOT NULL CONSTRAINT DF_rccp_import_batches_valid DEFAULT (0),
    error_rows INT NOT NULL CONSTRAINT DF_rccp_import_batches_error DEFAULT (0),
    duplicate_rows INT NOT NULL CONSTRAINT DF_rccp_import_batches_duplicate DEFAULT (0),
    summary NVARCHAR(MAX) NULL,
    CONSTRAINT PK_rccp_import_batches PRIMARY KEY CLUSTERED (id)
  );
END
