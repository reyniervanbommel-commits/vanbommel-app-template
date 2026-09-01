-- Migratie 044: D365-datumvelden die als text zijn ontdekt (ISO-strings) terugzetten naar date.
-- RCCP-datumslots (Requested / Confirmed / Receipt) tonen alleen data_type date of date_period.

UPDATE dbo.tb_columns
SET data_type = 'date', updated_at = SYSUTCDATETIME()
WHERE source = 'source'
  AND data_type = 'text'
  AND (
    source_field LIKE '%Date'
    OR source_field LIKE '%DateTime'
    OR source_field LIKE '%DateTimeOffset'
  );
