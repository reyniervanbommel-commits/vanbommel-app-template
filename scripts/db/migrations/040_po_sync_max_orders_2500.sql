-- PO_SYNC_MAX_ORDERS default 2000 → 2500: een whitelist van ~2190 PO-nummers
-- moet in één sync passen. Alleen omhoog bij ontbrekende, lege of lagere waarde;
-- een bewust hoger getal blijft staan.
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'app_settings' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  MERGE dbo.app_settings AS target
  USING (VALUES (N'PO_SYNC_MAX_ORDERS', N'2500')) AS src(setting_key, new_value)
    ON target.setting_key = src.setting_key
  WHEN MATCHED AND (
      target.setting_value IS NULL
      OR LTRIM(RTRIM(target.setting_value)) = N''
      OR TRY_CONVERT(INT, LTRIM(RTRIM(target.setting_value))) IS NULL
      OR TRY_CONVERT(INT, LTRIM(RTRIM(target.setting_value))) < 2500
    )
    THEN UPDATE SET setting_value = src.new_value, updated_at = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (setting_key, setting_value, updated_at)
    VALUES (src.setting_key, src.new_value, SYSUTCDATETIME());
END
