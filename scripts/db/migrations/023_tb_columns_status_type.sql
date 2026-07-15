-- Migratie 023: datatype 'status' toestaan in po_columns en tb_columns.
-- Idempotent: drop + recreate van de CHECK-constraints met status toegevoegd.

IF OBJECT_ID('dbo.po_columns', 'U') IS NOT NULL
BEGIN
  IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE [name] = 'CK_po_columns_data_type'
      AND parent_object_id = OBJECT_ID('dbo.po_columns')
  )
  BEGIN
    ALTER TABLE dbo.po_columns DROP CONSTRAINT CK_po_columns_data_type;
  END;

  ALTER TABLE dbo.po_columns WITH CHECK
    ADD CONSTRAINT CK_po_columns_data_type
    CHECK (data_type IN ('text','number','date','boolean','select','image','status','remarks','date_period'));
END;

IF OBJECT_ID('dbo.tb_columns', 'U') IS NOT NULL
BEGIN
  IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE [name] = 'CK_tb_columns_data_type'
      AND parent_object_id = OBJECT_ID('dbo.tb_columns')
  )
  BEGIN
    ALTER TABLE dbo.tb_columns DROP CONSTRAINT CK_tb_columns_data_type;
  END;

  ALTER TABLE dbo.tb_columns WITH CHECK
    ADD CONSTRAINT CK_tb_columns_data_type
    CHECK (data_type IN ('text','number','date','boolean','select','image','status','remarks','date_period'));
END;
