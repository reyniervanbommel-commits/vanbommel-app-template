-- Migratie 004: user_page_permissions tabel
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_page_permissions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.user_page_permissions (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES dbo.users(id) ON DELETE CASCADE,
    page_name   NVARCHAR(100) NOT NULL,
    created_at  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_user_page_permissions' AND object_id = OBJECT_ID('dbo.user_page_permissions'))
BEGIN
  CREATE UNIQUE INDEX UQ_user_page_permissions ON dbo.user_page_permissions(user_id, page_name);
END;
