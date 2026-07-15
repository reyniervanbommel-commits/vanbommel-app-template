-- Migratie 023: datatype 'status' toestaan in po_columns en tb_columns.
-- Idempotent: alleen bijwerken als status nog niet in de CHECK staat.
-- Gebruikt NOCHECK zodat bestaande afwijkende rijen geen deploy blokkeren.

DECLARE @allowedTypes TABLE (data_type NVARCHAR(16));
INSERT INTO @allowedTypes (data_type)
VALUES ('text'), ('number'), ('date'), ('boolean'), ('select'), ('image'), ('status'), ('remarks'), ('date_period');

IF OBJECT_ID('dbo.po_columns', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints cc
    WHERE cc.[name] = 'CK_po_columns_data_type'
      AND cc.parent_object_id = OBJECT_ID('dbo.po_columns')
      AND cc.definition LIKE '%status%'
      AND cc.definition LIKE '%date_period%'
  )
  BEGIN
    UPDATE dbo.po_columns
    SET data_type = 'text'
    WHERE data_type IS NULL
       OR LTRIM(RTRIM(data_type)) = ''
       OR data_type NOT IN (SELECT data_type FROM @allowedTypes);

    IF EXISTS (
      SELECT 1
      FROM sys.check_constraints
      WHERE [name] = 'CK_po_columns_data_type'
        AND parent_object_id = OBJECT_ID('dbo.po_columns')
    )
      ALTER TABLE dbo.po_columns DROP CONSTRAINT CK_po_columns_data_type;

    ALTER TABLE dbo.po_columns WITH NOCHECK
      ADD CONSTRAINT CK_po_columns_data_type
      CHECK (data_type IN ('text','number','date','boolean','select','image','status','remarks','date_period'));
  END;
END;

IF OBJECT_ID('dbo.tb_columns', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints cc
    WHERE cc.[name] = 'CK_tb_columns_data_type'
      AND cc.parent_object_id = OBJECT_ID('dbo.tb_columns')
      AND cc.definition LIKE '%status%'
      AND cc.definition LIKE '%date_period%'
  )
  BEGIN
    UPDATE dbo.tb_columns
    SET data_type = 'text'
    WHERE data_type IS NULL
       OR LTRIM(RTRIM(data_type)) = ''
       OR data_type NOT IN (SELECT data_type FROM @allowedTypes);

    IF EXISTS (
      SELECT 1
      FROM sys.check_constraints
      WHERE [name] = 'CK_tb_columns_data_type'
        AND parent_object_id = OBJECT_ID('dbo.tb_columns')
    )
      ALTER TABLE dbo.tb_columns DROP CONSTRAINT CK_tb_columns_data_type;

    ALTER TABLE dbo.tb_columns WITH NOCHECK
      ADD CONSTRAINT CK_tb_columns_data_type
      CHECK (data_type IN ('text','number','date','boolean','select','image','status','remarks','date_period'));
  END;
END;
