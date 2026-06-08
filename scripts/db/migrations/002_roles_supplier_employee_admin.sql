-- Migratie 002: standaardiseer gebruikersrollen
-- Idempotent: veilig meerdere keren uitvoeren

UPDATE dbo.users
SET role = 'supplier',
    updated_at = SYSUTCDATETIME()
WHERE role IS NULL OR LTRIM(RTRIM(LOWER(role))) = '' OR LTRIM(RTRIM(LOWER(role))) = 'user';

UPDATE dbo.users
SET role = 'supplier',
    updated_at = SYSUTCDATETIME()
WHERE LTRIM(RTRIM(LOWER(role))) NOT IN ('admin', 'employee', 'supplier');

IF EXISTS (
  SELECT 1
  FROM sys.default_constraints dc
  INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
  WHERE dc.parent_object_id = OBJECT_ID('dbo.users')
    AND c.name = 'role'
)
BEGIN
  DECLARE @DropRoleDefaultSql NVARCHAR(MAX);
  SELECT @DropRoleDefaultSql = 'ALTER TABLE dbo.users DROP CONSTRAINT [' + dc.name + ']'
  FROM sys.default_constraints dc
  INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
  WHERE dc.parent_object_id = OBJECT_ID('dbo.users')
    AND c.name = 'role';
  EXEC sp_executesql @DropRoleDefaultSql;
END;

ALTER TABLE dbo.users
ADD CONSTRAINT DF_users_role DEFAULT ('supplier') FOR role;

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = 'CK_users_role_allowed'
    AND parent_object_id = OBJECT_ID('dbo.users')
)
BEGIN
  ALTER TABLE dbo.users
  ADD CONSTRAINT CK_users_role_allowed
  CHECK (role IN ('admin', 'employee', 'supplier'));
END;
