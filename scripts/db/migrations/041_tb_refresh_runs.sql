-- Migratie 041: D365 refresh-run historie (#AB:262).
-- Idempotent: veilig meerdere keren uit te voeren.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_refresh_runs' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_refresh_runs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    started_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    finished_at DATETIME2 NULL,
    status NVARCHAR(16) NOT NULL
      CONSTRAINT CK_tb_refresh_runs_status CHECK (status IN ('running', 'done', 'error', 'interrupted')),
    source NVARCHAR(16) NOT NULL
      CONSTRAINT CK_tb_refresh_runs_source CHECK (source IN ('manual', 'night')),
    triggered_by_user_id INT NULL,
    error_text NVARCHAR(500) NULL,
    alert_status NVARCHAR(16) NULL
      CONSTRAINT CK_tb_refresh_runs_alert CHECK (alert_status IN ('sent', 'skipped', 'failed')),
    fetched_total INT NOT NULL CONSTRAINT DF_tb_refresh_runs_fetched DEFAULT (0),
    saved_total INT NOT NULL CONSTRAINT DF_tb_refresh_runs_saved DEFAULT (0),
    inserted_total INT NOT NULL CONSTRAINT DF_tb_refresh_runs_inserted DEFAULT (0),
    updated_total INT NOT NULL CONSTRAINT DF_tb_refresh_runs_updated DEFAULT (0),
    deleted_total INT NOT NULL CONSTRAINT DF_tb_refresh_runs_deleted DEFAULT (0),
    CONSTRAINT FK_tb_refresh_runs_user FOREIGN KEY (triggered_by_user_id) REFERENCES dbo.users(id)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_refresh_run_entities' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_refresh_run_entities (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    run_id BIGINT NOT NULL,
    table_key NVARCHAR(64) NOT NULL,
    entity_label NVARCHAR(128) NOT NULL,
    sort_order INT NOT NULL CONSTRAINT DF_tb_refresh_run_entities_sort DEFAULT (0),
    status NVARCHAR(16) NOT NULL
      CONSTRAINT CK_tb_refresh_run_entities_status CHECK (status IN ('queued', 'running', 'done', 'error', 'interrupted')),
    fetched INT NOT NULL CONSTRAINT DF_tb_refresh_run_entities_fetched DEFAULT (0),
    saved INT NOT NULL CONSTRAINT DF_tb_refresh_run_entities_saved DEFAULT (0),
    inserted INT NOT NULL CONSTRAINT DF_tb_refresh_run_entities_inserted DEFAULT (0),
    updated INT NOT NULL CONSTRAINT DF_tb_refresh_run_entities_updated DEFAULT (0),
    deleted INT NOT NULL CONSTRAINT DF_tb_refresh_run_entities_deleted DEFAULT (0),
    started_at DATETIME2 NULL,
    finished_at DATETIME2 NULL,
    error_text NVARCHAR(500) NULL,
    CONSTRAINT FK_tb_refresh_run_entities_run FOREIGN KEY (run_id) REFERENCES dbo.tb_refresh_runs(id)
  );
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.tb_refresh_runs')
    AND name = 'IX_tb_refresh_runs_started_at'
)
BEGIN
  CREATE INDEX IX_tb_refresh_runs_started_at
    ON dbo.tb_refresh_runs (started_at DESC);
END
