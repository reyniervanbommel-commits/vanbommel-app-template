-- Migratie 004: user_permissions tabel
-- Idempotent: veilig meerdere keren uitvoeren

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_permissions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.user_permissions (
    id        BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id   INT NOT NULL,
    page_name NVARCHAR(100) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_user_permissions_user_page UNIQUE (user_id, page_name),
    CONSTRAINT FK_user_permissions_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );

  CREATE INDEX IX_user_permissions_user ON dbo.user_permissions(user_id);
  CREATE INDEX IX_user_permissions_page ON dbo.user_permissions(page_name);
END
