-- Migratie 042: owner + heartbeat voor D365 refresh-runs (#AB:262).
-- Voorkomt dat een nieuwe replica een verse run van een andere replica interrupted.
-- Idempotent.

IF COL_LENGTH('dbo.tb_refresh_runs', 'owner_instance_id') IS NULL
BEGIN
  ALTER TABLE dbo.tb_refresh_runs
    ADD owner_instance_id NVARCHAR(64) NULL;
END

IF COL_LENGTH('dbo.tb_refresh_runs', 'heartbeat_at') IS NULL
BEGIN
  ALTER TABLE dbo.tb_refresh_runs
    ADD heartbeat_at DATETIME2 NULL;
END
