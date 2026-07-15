-- Migratie 025: vendor-scope voor po_saved_views
-- Admin kan een vendor-view aanmaken die alle leveranciers zien (scope = 'vendor').
-- Idempotent: veilig meerdere keren uitvoeren.

IF EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = 'CK_po_saved_views_scope' AND parent_object_id = OBJECT_ID('dbo.po_saved_views')
)
BEGIN
  ALTER TABLE dbo.po_saved_views DROP CONSTRAINT CK_po_saved_views_scope;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = 'CK_po_saved_views_scope' AND parent_object_id = OBJECT_ID('dbo.po_saved_views')
)
BEGIN
  ALTER TABLE dbo.po_saved_views
    ADD CONSTRAINT CK_po_saved_views_scope CHECK (scope IN ('personal', 'global', 'vendor'));
END;

IF EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = 'CK_po_saved_views_scope_user' AND parent_object_id = OBJECT_ID('dbo.po_saved_views')
)
BEGIN
  ALTER TABLE dbo.po_saved_views DROP CONSTRAINT CK_po_saved_views_scope_user;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = 'CK_po_saved_views_scope_user' AND parent_object_id = OBJECT_ID('dbo.po_saved_views')
)
BEGIN
  ALTER TABLE dbo.po_saved_views
    ADD CONSTRAINT CK_po_saved_views_scope_user CHECK (
      (scope = 'personal' AND user_id IS NOT NULL) OR
      ((scope = 'global' OR scope = 'vendor') AND user_id IS NULL)
    );
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'UX_po_saved_views_vendor_name' AND object_id = OBJECT_ID('dbo.po_saved_views')
)
BEGIN
  CREATE UNIQUE INDEX UX_po_saved_views_vendor_name
    ON dbo.po_saved_views(board_key, name)
    WHERE scope = 'vendor';
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'UX_po_saved_views_vendor_default' AND object_id = OBJECT_ID('dbo.po_saved_views')
)
BEGIN
  CREATE UNIQUE INDEX UX_po_saved_views_vendor_default
    ON dbo.po_saved_views(board_key)
    WHERE scope = 'vendor' AND is_default = 1;
END;
