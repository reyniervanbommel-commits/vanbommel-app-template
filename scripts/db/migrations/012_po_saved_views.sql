-- Migratie 012: po_saved_views (D365-achtige opgeslagen views per board)
-- Een view bevat kolomlayout + filter/sort/grouping-state (view_state_json).
-- Scope 'personal' hoort bij een user_id; scope 'global' is gedeeld (user_id NULL).
-- Idempotent: veilig meerdere keren uitvoeren.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_saved_views' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.po_saved_views (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    board_key NVARCHAR(64) NOT NULL,
    name NVARCHAR(120) NOT NULL,
    scope NVARCHAR(16) NOT NULL,
    user_id INT NULL,
    view_state_json NVARCHAR(MAX) NOT NULL,
    is_default BIT NOT NULL DEFAULT 0,
    created_by INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_po_saved_views_scope CHECK (scope IN ('personal', 'global')),
    -- Personal views horen bij een user; global views hebben geen user_id.
    CONSTRAINT CK_po_saved_views_scope_user CHECK (
      (scope = 'personal' AND user_id IS NOT NULL) OR
      (scope = 'global' AND user_id IS NULL)
    ),
    CONSTRAINT FK_po_saved_views_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );

  -- Unieke naam per personal-view (board_key, user_id, name). Filtered zodat de NULL
  -- user_id van global views geen last heeft van SQL Server's "1 NULL"-regel.
  CREATE UNIQUE INDEX UX_po_saved_views_personal_name
    ON dbo.po_saved_views(board_key, user_id, name)
    WHERE scope = 'personal';

  -- Unieke naam per global-view (board_key, name).
  CREATE UNIQUE INDEX UX_po_saved_views_global_name
    ON dbo.po_saved_views(board_key, name)
    WHERE scope = 'global';

  -- Maximaal 1 default personal-view per (board_key, user_id).
  CREATE UNIQUE INDEX UX_po_saved_views_personal_default
    ON dbo.po_saved_views(board_key, user_id)
    WHERE scope = 'personal' AND is_default = 1;

  -- Maximaal 1 default global-view per board_key.
  CREATE UNIQUE INDEX UX_po_saved_views_global_default
    ON dbo.po_saved_views(board_key)
    WHERE scope = 'global' AND is_default = 1;

  -- Lookup-index voor het ophalen van de zichtbare views van een gebruiker.
  CREATE INDEX IX_po_saved_views_board_scope_user
    ON dbo.po_saved_views(board_key, scope, user_id);
END
