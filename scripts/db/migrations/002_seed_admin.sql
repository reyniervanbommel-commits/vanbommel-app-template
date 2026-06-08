-- Migratie 002: Seed admin-account
-- Idempotent: veilig meerdere keren uitvoeren
-- Maakt het admin-account aan zonder wachtwoord in code.
-- Het wachtwoord wordt veilig ingesteld via de set-password / reset-flow
-- of via de bootstrap-login (BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD in .env).

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email = 'reyniervanbommel@vanbommel.nl')
BEGIN
  INSERT INTO dbo.users (email, display_name, role, must_set_password)
  VALUES ('reyniervanbommel@vanbommel.nl', 'Reynier van Bommel', 'admin', 1);
END
ELSE
BEGIN
  -- Zorg dat een bestaand account de admin-rol heeft en niet vergrendeld is.
  UPDATE dbo.users
  SET role = 'admin', is_locked = 0, failed_attempts = 0, updated_at = SYSUTCDATETIME()
  WHERE email = 'reyniervanbommel@vanbommel.nl';
END;
