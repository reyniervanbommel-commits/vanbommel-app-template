-- Retentielimiet 500 → 2000: orders die uit het sync-filter vallen blijven
-- per refresh uit D365 komen. Alleen de oude default (leeg of 500 / 200) wordt
-- overschreven; een bewust ander getal blijft staan.
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'app_settings' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  MERGE dbo.app_settings AS target
  USING (VALUES
    (N'PO_SYNC_RETAINED_MAX_AUTO', N'2000', N'500'),
    (N'PO_SYNC_RETAINED_FETCH_BUDGET', N'2000', N'500'),
    (N'PO_SYNC_RETAINED_WARN_AT', N'800', N'200'),
    (N'PO_SYNC_RETAINED_CRITICAL_AT', N'1800', N'500')
  ) AS src(setting_key, new_value, old_default)
    ON target.setting_key = src.setting_key
  WHEN MATCHED AND (
      target.setting_value IS NULL
      OR LTRIM(RTRIM(target.setting_value)) = N''
      OR LTRIM(RTRIM(target.setting_value)) = src.old_default
    )
    THEN UPDATE SET setting_value = src.new_value, updated_at = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (setting_key, setting_value, updated_at)
    VALUES (src.setting_key, src.new_value, SYSUTCDATETIME());
END
