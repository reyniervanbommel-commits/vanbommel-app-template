-- Migratie 006: user_board_settings (kolom voorkeuren per gebruiker/board)
-- Idempotent: veilig meerdere keren uitvoeren

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_board_settings' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.user_board_settings (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    board_key NVARCHAR(64) NOT NULL,
    settings_json NVARCHAR(MAX) NOT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_user_board_settings_user_board UNIQUE (user_id, board_key),
    CONSTRAINT FK_user_board_settings_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );

  CREATE INDEX IX_user_board_settings_user ON dbo.user_board_settings(user_id);
  CREATE INDEX IX_user_board_settings_board ON dbo.user_board_settings(board_key);
END
