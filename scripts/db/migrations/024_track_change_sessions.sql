-- Migratie 024: globale sessie-registratie voor "track changes" op celniveau (#AB:214).
-- Idempotent en non-destructief. Eén rij per in-aanmerking-komende login (rol in de geconfigureerde
-- sessionRoles) terwijl de globale track-changes-modus 'session' is. De board-read leest de laatste
-- 5 started_at-waarden als sessie-grenzen; de tabel wordt nooit volledig gescand (TOP 5 + index).
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tb_track_change_sessions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tb_track_change_sessions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    started_at DATETIME2 NOT NULL CONSTRAINT DF_tb_track_change_sessions_started DEFAULT SYSUTCDATETIME(),
    triggered_by_role NVARCHAR(16) NULL      -- ter diagnose; welke rol de sessie startte
  );
END;

IF OBJECT_ID('dbo.tb_track_change_sessions', 'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM sys.indexes
     WHERE object_id = OBJECT_ID('dbo.tb_track_change_sessions')
       AND [name] = 'IX_tb_track_sessions_started'
   )
  CREATE INDEX IX_tb_track_sessions_started
    ON dbo.tb_track_change_sessions (started_at DESC);
