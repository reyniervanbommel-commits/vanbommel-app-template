-- Migratie 001: Initial schema
-- Idempotent: veilig meerdere keren uitvoeren

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'users' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL,
    display_name NVARCHAR(255) NULL,
    role NVARCHAR(50) NOT NULL DEFAULT 'user',
    password_hash NVARCHAR(255) NULL,
    must_set_password BIT NOT NULL DEFAULT 1,
    failed_attempts INT NOT NULL DEFAULT 0,
    is_locked BIT NOT NULL DEFAULT 0,
    phone_number NVARCHAR(20) NULL,
    phone_verified BIT NOT NULL DEFAULT 0,
    mfa_enabled BIT NOT NULL DEFAULT 0,
    mfa_method NVARCHAR(10) NULL,
    mfa_secret_enc NVARCHAR(512) NULL,
    mfa_key_version TINYINT NOT NULL DEFAULT 1,
    mfa_required BIT NOT NULL DEFAULT 0,
    session_version INT NOT NULL DEFAULT 1,
    last_login DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_users_email' AND object_id = OBJECT_ID('dbo.users'))
BEGIN
  CREATE UNIQUE INDEX UQ_users_email ON dbo.users(email);
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'sessions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.sessions (
    sid NVARCHAR(255) NOT NULL PRIMARY KEY,
    session NVARCHAR(MAX) NOT NULL,
    expires DATETIME2 NOT NULL
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_sessions_expires' AND object_id = OBJECT_ID('dbo.sessions'))
BEGIN
  CREATE INDEX IX_sessions_expires ON dbo.sessions(expires);
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'password_reset_tokens' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.password_reset_tokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES dbo.users(id) ON DELETE CASCADE,
    token_hash NVARCHAR(128) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    used_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_password_reset_tokens_hash' AND object_id = OBJECT_ID('dbo.password_reset_tokens'))
BEGIN
  CREATE INDEX IX_password_reset_tokens_hash ON dbo.password_reset_tokens(token_hash);
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mfa_backup_codes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.mfa_backup_codes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES dbo.users(id) ON DELETE CASCADE,
    code_hash NVARCHAR(255) NOT NULL,
    used_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'auth_events' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.auth_events (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL,
    event_type NVARCHAR(50) NOT NULL,
    ip_address NVARCHAR(64) NULL,
    user_agent NVARCHAR(512) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_log' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.audit_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL,
    user_email NVARCHAR(255) NULL,
    action NVARCHAR(100) NOT NULL,
    table_name NVARCHAR(100) NULL,
    record_id NVARCHAR(100) NULL,
    payload NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
