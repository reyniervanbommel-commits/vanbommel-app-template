-- Migratie 024: bi_charts (#AB:219) — centraal opgeslagen BI-grafiekdefinities.
-- Idempotent + non-destructief: veilig meerdere keren uitvoeren (IF NOT EXISTS).
-- Split-screen-selectie leeft in de bestaande user_board_settings.settings_json (geen extra kolom).

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'bi_charts' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.bi_charts (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    board_key NVARCHAR(64) NOT NULL DEFAULT 'purchase-orders',
    name NVARCHAR(200) NOT NULL,
    config_json NVARCHAR(MAX) NOT NULL,
    visibility NVARCHAR(16) NOT NULL DEFAULT 'private',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_bi_charts_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT CK_bi_charts_visibility CHECK (visibility IN ('private', 'shared'))
  );

  CREATE INDEX IX_bi_charts_user ON dbo.bi_charts(user_id);
  CREATE INDEX IX_bi_charts_board ON dbo.bi_charts(board_key);
  CREATE INDEX IX_bi_charts_visibility ON dbo.bi_charts(visibility);
END
