'use strict';

const { mapColumnRow } = require('./TableRegistryService');

describe('TableRegistryService.mapColumnRow', () => {
  it('mapt formula_expr naar formulaExpr', () => {
    const mapped = mapColumnRow({
      id: 10,
      table_id: 5,
      scope: 'master',
      key: 'score',
      label: 'Score',
      source: 'custom',
      source_field: null,
      data_type: 'number',
      options_json: null,
      writable: 0,
      write_mechanism: null,
      is_default_visible: 1,
      filterable: 1,
      sortable: 1,
      is_active: 1,
      visible_at_delete: 1,
      sort_order: 30,
      formula_expr: '(a)+(b)',
    });

    expect(mapped.formulaExpr).toBe('(a)+(b)');
  });

  it('geeft formulaExpr null als veld ontbreekt', () => {
    const mapped = mapColumnRow({
      id: 11,
      table_id: 5,
      scope: 'master',
      key: 'plain',
      label: 'Plain',
      source: 'custom',
      source_field: null,
      data_type: 'text',
      options_json: null,
      writable: 0,
      write_mechanism: null,
      is_default_visible: 1,
      filterable: 1,
      sortable: 1,
      is_active: 1,
      visible_at_delete: 1,
      sort_order: 40,
      formula_expr: null,
    });

    expect(mapped.formulaExpr).toBeNull();
  });
});
