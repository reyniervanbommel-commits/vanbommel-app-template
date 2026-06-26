IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'app_settings' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.app_settings (
    setting_key  NVARCHAR(100)  NOT NULL,
    setting_value NVARCHAR(MAX)  NULL,
    updated_at   DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by   INT            NULL,
    CONSTRAINT PK_app_settings PRIMARY KEY (setting_key)
  );
END
