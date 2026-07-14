-- Migratie 023: beveiligde row remarks, reactions en singleton Remarks-kolom (#AB:209).
-- Idempotent en non-destructief: remarks worden uitsluitend soft-deleted.

IF OBJECT_ID('dbo.tb_columns', 'U') IS NOT NULL
BEGIN
  IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = 'CK_tb_columns_data_type'
      AND parent_object_id = OBJECT_ID('dbo.tb_columns')
  )
    ALTER TABLE dbo.tb_columns DROP CONSTRAINT CK_tb_columns_data_type;

  ALTER TABLE dbo.tb_columns WITH CHECK
    ADD CONSTRAINT CK_tb_columns_data_type
    CHECK (data_type IN ('text','number','date','boolean','select','image','remarks'));
END;

IF OBJECT_ID('dbo.tb_row_remarks', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tb_row_remarks (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    table_id BIGINT NOT NULL,
    partition_key NVARCHAR(32) NOT NULL,
    record_key NVARCHAR(128) NOT NULL,
    detail_key INT NOT NULL CONSTRAINT DF_tb_row_remarks_detail DEFAULT -1,
    column_id BIGINT NULL,
    body NVARCHAR(2000) NOT NULL,
    created_by INT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_tb_row_remarks_created DEFAULT SYSUTCDATETIME(),
    is_deleted BIT NOT NULL CONSTRAINT DF_tb_row_remarks_deleted DEFAULT 0,
    deleted_by INT NULL,
    deleted_at DATETIME2 NULL,
    CONSTRAINT CK_tb_row_remarks_master CHECK (detail_key = -1),
    CONSTRAINT CK_tb_row_remarks_delete_state CHECK (
      (is_deleted = 0 AND deleted_by IS NULL AND deleted_at IS NULL)
      OR (is_deleted = 1 AND deleted_at IS NOT NULL)
    ),
    CONSTRAINT FK_tb_row_remarks_table FOREIGN KEY (table_id) REFERENCES dbo.tb_tables(id),
    CONSTRAINT FK_tb_row_remarks_column FOREIGN KEY (column_id)
      REFERENCES dbo.tb_columns(id) ON DELETE SET NULL,
    CONSTRAINT FK_tb_row_remarks_created_by FOREIGN KEY (created_by)
      REFERENCES dbo.users(id) ON DELETE SET NULL,
    -- NO ACTION voorkomt SQL Server multiple-cascade-paths naast created_by; gebruikers worden soft-deleted.
    CONSTRAINT FK_tb_row_remarks_deleted_by FOREIGN KEY (deleted_by)
      REFERENCES dbo.users(id)
  );
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.tb_row_remarks')
    AND [name] = 'IX_tb_row_remarks_row'
)
  CREATE INDEX IX_tb_row_remarks_row
    ON dbo.tb_row_remarks
      (table_id, partition_key, record_key, detail_key, is_deleted, created_at DESC, id DESC);

IF OBJECT_ID('dbo.tb_row_remark_reactions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tb_row_remark_reactions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    remark_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    emoji NVARCHAR(16) NOT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_tb_row_remark_reactions_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_tb_row_remark_reactions_remark FOREIGN KEY (remark_id)
      REFERENCES dbo.tb_row_remarks(id) ON DELETE CASCADE,
    CONSTRAINT FK_tb_row_remark_reactions_user FOREIGN KEY (user_id)
      REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT CK_tb_row_remark_reactions_emoji
      CHECK (emoji IN (N'👍', N'😊', N'🎉', N'❤️', N'😂', N'😮')),
    CONSTRAINT UQ_tb_row_remark_reactions UNIQUE (remark_id, user_id, emoji)
  );
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.tb_row_remark_reactions')
    AND [name] = 'IX_tb_row_remark_reactions_remark'
)
  CREATE INDEX IX_tb_row_remark_reactions_remark
    ON dbo.tb_row_remark_reactions (remark_id);

IF OBJECT_ID('dbo.tb_cell_history', 'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM sys.indexes
     WHERE object_id = OBJECT_ID('dbo.tb_cell_history')
       AND [name] = 'IX_tb_cell_history_row_activity'
   )
  CREATE INDEX IX_tb_cell_history_row_activity
    ON dbo.tb_cell_history
      (table_id, partition_key, record_key, detail_key, changed_at DESC, id DESC)
    INCLUDE (column_id);

IF OBJECT_ID('dbo.tb_field_corrections', 'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM sys.indexes
     WHERE object_id = OBJECT_ID('dbo.tb_field_corrections')
       AND [name] = 'IX_tb_field_corrections_row_activity'
   )
  CREATE INDEX IX_tb_field_corrections_row_activity
    ON dbo.tb_field_corrections
      (table_id, partition_key, record_key, detail_key, created_at DESC, id DESC)
    INCLUDE (column_id, [status]);

DECLARE @remarksTableId BIGINT = (
  SELECT id FROM dbo.tb_tables WHERE [key] = 'purchase-orders'
);

IF @remarksTableId IS NOT NULL
BEGIN
  DECLARE @remarksColumnId BIGINT = (
    SELECT TOP (1) id
    FROM dbo.tb_columns
    WHERE table_id = @remarksTableId
      AND scope = 'master'
      AND (data_type = 'remarks' OR [key] = 'remarks')
    ORDER BY CASE WHEN data_type = 'remarks' THEN 0 ELSE 1 END, id
  );

  IF @remarksColumnId IS NULL
  BEGIN
    INSERT INTO dbo.tb_columns
      (table_id, scope, [key], label, source, source_field, data_type, options_json,
       writable, write_mechanism, is_default_visible, filterable, sortable, is_active,
       sort_order, formula_expr)
    SELECT @remarksTableId, 'master', 'remarks', 'Remarks', 'custom', NULL, 'remarks', NULL,
           0, NULL, 1, 0, 0, 1, ISNULL(MAX(sort_order), 0) + 10, NULL
    FROM dbo.tb_columns
    WHERE table_id = @remarksTableId AND scope = 'master';
  END
  ELSE
  BEGIN
    UPDATE dbo.tb_columns
    SET [key] = 'remarks',
        label = 'Remarks',
        source = 'custom',
        source_field = NULL,
        data_type = 'remarks',
        options_json = NULL,
        writable = 0,
        write_mechanism = NULL,
        is_default_visible = 1,
        filterable = 0,
        sortable = 0,
        is_active = 1,
        formula_expr = NULL,
        updated_at = SYSUTCDATETIME()
    WHERE id = @remarksColumnId;
  END;
END;

IF OBJECT_ID('dbo.tb_columns', 'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM sys.indexes
     WHERE object_id = OBJECT_ID('dbo.tb_columns')
       AND [name] = 'UX_tb_columns_singleton_remarks'
   )
  CREATE UNIQUE INDEX UX_tb_columns_singleton_remarks
    ON dbo.tb_columns (table_id, scope, data_type)
    WHERE data_type = 'remarks';
