import { describe, expect, it } from 'vitest';
import { buildLinkedLineValueByHeaderKey } from './linkedLineValueMeta';

describe('buildLinkedLineValueByHeaderKey', () => {
  it('marks writable only for staff + d365 writable line column', () => {
    const lineColumns = [
      { id: 44, key: 'color', label: 'Color', dataType: 'text', writableToD365: true, d365Field: 'Color' },
    ];
    const map = buildLinkedLineValueByHeaderKey(
      [{ headerColumnKey: 'colorValues', lineColumnKey: 'color' }],
      lineColumns,
      { isStaff: true },
    );
    expect(map.colorValues).toMatchObject({
      lineColumnKey: 'color',
      lineColumnId: 44,
      lineDataType: 'text',
      lineColumnLabel: 'Color',
      writableToD365: true,
    });
    expect(map.colorValues.lineColumn).toBe(lineColumns[0]);
  });

  it('forces writable false for non-staff', () => {
    const map = buildLinkedLineValueByHeaderKey(
      [{ headerColumnKey: 'colorValues', lineColumnKey: 'color' }],
      [{ id: 44, key: 'color', writableToD365: true, d365Field: 'Color' }],
      { isStaff: false },
    );
    expect(map.colorValues.writableToD365).toBe(false);
  });
});
