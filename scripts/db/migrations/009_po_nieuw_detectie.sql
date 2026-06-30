-- Migratie 009: nieuw-/gewijzigd-detectie per gebruiker (#AB:133, Fase 2). Idempotent.
-- ModifiedDateTime is NIET geexposeerd op PurchaseOrderHeaderV2 (geverifieerd via $metadata),
-- daarom een content-hash per order i.p.v. delta op ModifiedDateTime: bij een afwijkende hash
-- tijdens refresh wordt content_changed_at bijgewerkt. "nieuw" gebruikt het bestaande first_seen_at.

-- content_hash + content_changed_at op de header-cache
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.po_cache_headers') AND name = 'content_hash')
  ALTER TABLE dbo.po_cache_headers ADD content_hash NVARCHAR(64) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.po_cache_headers') AND name = 'content_changed_at')
  ALTER TABLE dbo.po_cache_headers ADD content_changed_at DATETIME2 NULL;

-- Per-gebruiker watermerk: wanneer keek deze gebruiker voor het laatst.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'po_user_view_state' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.po_user_view_state (
    user_id INT NOT NULL PRIMARY KEY,
    last_viewed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_po_user_view_state_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END
