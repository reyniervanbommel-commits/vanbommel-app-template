import { describe, expect, it } from 'vitest';
import { buildPoHeaderHoverModel } from './poHeaderHoverModel';

const vendorColumn = { key: 'vendor', label: 'Vendor account', dataType: 'text', source: 'd365' };

function rowMap(model) {
  return Object.fromEntries((model?.rows || []).map((row) => [row.label, row.value]));
}

describe('buildPoHeaderHoverModel', () => {
  it('returns null without a column', () => {
    expect(buildPoHeaderHoverModel({})).toBe(null);
  });

  it('always includes title, type, source and filter', () => {
    const model = buildPoHeaderHoverModel({ column: vendorColumn });
    expect(model.title).toBe('Vendor account');
    expect(rowMap(model)).toMatchObject({
      Type: 'Text',
      Source: 'Dynamics 365',
      Filter: 'None',
    });
  });

  it('summarizes an active text filter with a readable operator', () => {
    const model = buildPoHeaderHoverModel({
      column: vendorColumn,
      filter: { operator: 'contains', value: 'Acme' },
    });
    expect(rowMap(model).Filter).toBe('contains Acme');
  });

  it('summarizes oneOf and between filters', () => {
    expect(rowMap(buildPoHeaderHoverModel({
      column: vendorColumn,
      filter: { operator: 'oneOf', value: ['Acme', 'Beta'] },
    })).Filter).toBe('is one of Acme, Beta');

    expect(rowMap(buildPoHeaderHoverModel({
      column: { key: 'qty', label: 'Qty', dataType: 'number' },
      filter: { operator: 'between', value: '10', secondaryValue: '20' },
    })).Filter).toBe('is between 10 and 20');
  });

  it('summarizes color filters without scanning rows', () => {
    const model = buildPoHeaderHoverModel({
      column: { key: 'status', label: 'Status', dataType: 'status' },
      filter: { operator: 'colorIs', colors: ['#c02f64', '#6161ff'] },
    });
    expect(rowMap(model).Filter).toBe('2 colors');
  });

  it('adds sort, grouping, formatting and write-back only when active', () => {
    const model = buildPoHeaderHoverModel({
      column: { ...vendorColumn, writableToD365: true },
      sortState: { columnKey: 'vendor', direction: 'desc' },
      groupingColumnKey: 'vendor',
      isGroupSummaryColumn: true,
      formatRuleSet: { target: 'cell', rules: [{ op: '=', value: 'Open', color: '#c02f64' }] },
    });
    expect(rowMap(model)).toMatchObject({
      Sort: 'Descending',
      Grouping: 'Active',
      'Group total': 'Shown in group header',
      Formatting: '1 rule',
      'Write-back': 'Enabled',
    });
  });

  it('omits sort when it belongs to another column', () => {
    const model = buildPoHeaderHoverModel({
      column: vendorColumn,
      sortState: { columnKey: 'status', direction: 'asc' },
    });
    expect(rowMap(model).Sort).toBeUndefined();
  });

  it('adds connected targets, sticky pin and date display', () => {
    const model = buildPoHeaderHoverModel({
      column: {
        key: 'week',
        label: 'Conf. week',
        dataType: 'date_period',
        source: 'custom',
      },
      connectionTargets: ['Subitem column "Qty" (total)'],
      isConnected: true,
      isSticky: true,
      datePeriodDisplayMode: 'month',
    });
    expect(rowMap(model)).toMatchObject({
      Source: 'Connected',
      'Connected to': 'Subitem column "Qty" (total)',
      Pin: 'Sticky',
      'Date display': 'Month',
    });
  });
});
