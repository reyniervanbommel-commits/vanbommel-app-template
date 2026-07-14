'use strict';

const sql = require('mssql');
const { mapColumnRow } = require('./TableRegistryService');

const REMARKS_COLUMN = Object.freeze({
  scope: 'master',
  key: 'remarks',
  label: 'Remarks',
  source: 'custom',
  dataType: 'remarks',
});

function invalidRemarksColumn(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function validateRemarksColumnRequest({ scope, options, formulaExpr }) {
  if (scope !== REMARKS_COLUMN.scope) {
    throw invalidRemarksColumn('Remarks is alleen toegestaan op master-niveau');
  }
  if (options !== undefined && options !== null) {
    throw invalidRemarksColumn('Remarks ondersteunt geen opties of imagepad');
  }
  if (String(formulaExpr || '').trim()) {
    throw invalidRemarksColumn('Remarks ondersteunt geen formule');
  }
  return REMARKS_COLUMN;
}

async function ensureRemarksColumn({ pool, tableId, userId }) {
  const result = await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .input('userId', sql.Int, userId || null)
    .query(`
      DECLARE @remarksId BIGINT = (
        SELECT TOP (1) id
        FROM dbo.tb_columns WITH (UPDLOCK, HOLDLOCK)
        WHERE table_id = @tableId
          AND scope = 'master'
          AND (data_type = 'remarks' OR [key] = 'remarks')
        ORDER BY CASE WHEN data_type = 'remarks' THEN 0 ELSE 1 END, id
      );

      IF @remarksId IS NOT NULL
      BEGIN
        UPDATE dbo.tb_columns
        SET [key] = 'remarks', label = 'Remarks', source = 'custom', source_field = NULL,
            data_type = 'remarks', options_json = NULL, formula_expr = NULL,
            writable = 0, write_mechanism = NULL, is_default_visible = 1,
            filterable = 0, sortable = 0, is_active = 1,
            updated_by = @userId, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.id, INSERTED.table_id, INSERTED.scope, INSERTED.[key], INSERTED.label,
               INSERTED.source, INSERTED.source_field, INSERTED.data_type, INSERTED.options_json,
               INSERTED.writable, INSERTED.write_mechanism, INSERTED.is_default_visible,
               INSERTED.filterable, INSERTED.sortable, INSERTED.is_active, INSERTED.sort_order,
               INSERTED.visible_at_delete, INSERTED.formula_expr
        WHERE id = @remarksId;
      END
      ELSE
      BEGIN
        INSERT INTO dbo.tb_columns
          (table_id, scope, [key], label, source, source_field, data_type, options_json,
           formula_expr, writable, write_mechanism, is_default_visible, filterable, sortable,
           is_active, sort_order, created_by, updated_by)
        OUTPUT INSERTED.id, INSERTED.table_id, INSERTED.scope, INSERTED.[key], INSERTED.label,
               INSERTED.source, INSERTED.source_field, INSERTED.data_type, INSERTED.options_json,
               INSERTED.writable, INSERTED.write_mechanism, INSERTED.is_default_visible,
               INSERTED.filterable, INSERTED.sortable, INSERTED.is_active, INSERTED.sort_order,
               INSERTED.visible_at_delete, INSERTED.formula_expr
        SELECT @tableId, 'master', 'remarks', 'Remarks', 'custom', NULL, 'remarks', NULL,
               NULL, 0, NULL, 1, 0, 0, 1, ISNULL(MAX(sort_order), 0) + 10, @userId, @userId
        FROM dbo.tb_columns
        WHERE table_id = @tableId AND scope = 'master';
      END;
    `);
  return mapColumnRow(result.recordset[0]);
}

module.exports = {
  REMARKS_COLUMN,
  ensureRemarksColumn,
  validateRemarksColumnRequest,
};
