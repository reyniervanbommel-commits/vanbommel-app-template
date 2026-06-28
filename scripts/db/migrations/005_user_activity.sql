-- Migratie 005: user_activity tabel voor analytics
-- Idempotent: veilig meerdere keren uitvoeren

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_activity' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.user_activity (
    id                      INT IDENTITY(1,1) PRIMARY KEY,
    user_id                 INT NOT NULL,
    session_id              NVARCHAR(255) NOT NULL,
    activity_type           NVARCHAR(50) NOT NULL,  -- 'login','logout','route_change','click'
    page_name               NVARCHAR(255) NULL,
    element_type            NVARCHAR(100) NULL,
    element_id              NVARCHAR(255) NULL,
    element_label           NVARCHAR(255) NULL,
    session_duration_seconds INT NULL,
    extra_data              NVARCHAR(MAX) NULL,
    created_at              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_user_activity_user_id  ON dbo.user_activity(user_id);
  CREATE INDEX IX_user_activity_session  ON dbo.user_activity(session_id);
  CREATE INDEX IX_user_activity_type     ON dbo.user_activity(activity_type);
  CREATE INDEX IX_user_activity_created  ON dbo.user_activity(created_at);
  CREATE INDEX IX_user_activity_page     ON dbo.user_activity(page_name);
END

-- Voeg mfa_required kolom toe aan users als die nog niet bestaat
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'mfa_required')
BEGIN
  ALTER TABLE dbo.users ADD mfa_required BIT NOT NULL DEFAULT 0;
END
