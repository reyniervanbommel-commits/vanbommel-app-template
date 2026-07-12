import { describe, expect, it, vi } from 'vitest';
import {
  buildFilterFromCellValue,
  copyCellValueToClipboard,
  isCellContextMenuDisabled,
  serializeRawValueForFilter,
} from './tableViewFilterUtils';

describe('tableViewFilterUtils', () => {
  it('serializes text values as strings', () => {
    expect(serializeRawValueForFilter({ dataType: 'text' }, 42)).toBe('42');
    expect(serializeRawValueForFilter({ dataType: 'text' }, null)).toBe('');
  });

  it('serializes date values as yyyy-mm-dd', () => {
    expect(serializeRawValueForFilter({ dataType: 'date' }, '2026-03-15T10:00:00Z')).toBe('2026-03-15');
  });

  it('builds equals filter from raw cell value', () => {
    expect(buildFilterFromCellValue({ dataType: 'text' }, 'Open')).toEqual({
      operator: 'equals',
      value: 'Open',
      secondaryValue: '',
    });
    expect(buildFilterFromCellValue({ dataType: 'text' }, null)).toEqual({
      operator: 'equals',
      value: '',
      secondaryValue: '',
    });
  });

  it('disables context menu only for image columns', () => {
    expect(isCellContextMenuDisabled({ key: 'photo', dataType: 'image' })).toBe(true);
    expect(isCellContextMenuDisabled(
      { key: 'total', dataType: 'number' },
      { linkedLineTotalKeys: { total: 'qty' } }
    )).toBe(false);
    expect(isCellContextMenuDisabled(
      { key: 'values', dataType: 'text' },
      { linkedLineValueKeys: { values: { lineColumnKey: 'desc' } } }
    )).toBe(false);
    expect(isCellContextMenuDisabled({ key: 'status', dataType: 'text' })).toBe(false);
  });

  it('copies raw value to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await copyCellValueToClipboard({ dataType: 'text' }, 'PO-1001');
    expect(writeText).toHaveBeenCalledWith('PO-1001');
  });
});
