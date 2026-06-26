-- Migratie 005: analytics tabellen voor pagina-gebruik en sessies
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_page_views' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.user_page_views (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT NULL REFERENCES dbo.users(id) ON DELETE SET NULL,
    user_email  NVARCHAR(255) NULL,
    page_name   NVARCHAR(200) NOT NULL,
    created_at  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_page_views_user_date' AND object_id = OBJECT_ID('dbo.user_page_views'))
BEGIN
  CREATE INDEX IX_page_views_user_date ON dbo.user_page_views(user_id, created_at);
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_sessions_log' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.user_sessions_log (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT NULL REFERENCES dbo.users(id) ON DELETE SET NULL,
    user_email      NVARCHAR(255) NULL,
    started_at      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ended_at        DATETIME2 NULL,
    duration_seconds AS DATEDIFF(SECOND, started_at, ISNULL(ended_at, SYSUTCDATETIME()))
  );
END;
