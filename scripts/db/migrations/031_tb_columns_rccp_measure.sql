-- Migratie 031: kolom mag als RCCP-waardekolom gekozen worden (admin-keuze i.p.v. hardcoded regel).
-- Idempotent: kolom wordt alleen toegevoegd als hij nog niet bestaat.
--
-- De seed staat in dynamische SQL omdat de hele migratie als één batch wordt uitgevoerd: zonder
-- EXEC compileert SQL Server de UPDATE al voordat ALTER TABLE de kolom heeft toegevoegd.

IF OBJECT_ID('dbo.tb_columns', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE [name] = 'rccp_measure'
      AND object_id = OBJECT_ID('dbo.tb_columns')
  )
  BEGIN
    ALTER TABLE dbo.tb_columns
      ADD rccp_measure BIT NOT NULL CONSTRAINT DF_tb_columns_rccp_measure DEFAULT 0;

    -- Seed alleen bij het aanmaken van de kolom: 'quantity' op de purchase-orders-regels is de
    -- kolom waar RCCP nu op draait, dus zonder seed zou de bestaande config ongeldig worden.
    -- Bewust binnen dit blok: de runner draait elke migratie bij iedere deploy opnieuw, en buiten
    -- dit blok zou de seed een later door de admin uitgezette kolom telkens weer aanzetten.
    EXEC sp_executesql N'
      UPDATE c
      SET c.rccp_measure = 1
      FROM dbo.tb_columns c
      INNER JOIN dbo.tb_tables t ON t.id = c.table_id
      WHERE t.[key] = ''purchase-orders''
        AND c.[key] = ''quantity''
        AND c.scope = ''detail'';';
  END;
END;
