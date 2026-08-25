import { describe, expect, it } from 'vitest';
import { assignChartRole, chartRoleForColumn } from './rccpChartRole';

describe('assignChartRole', () => {
  it('zet open en wist received op dezelfde kolom', () => {
    expect(assignChartRole('', 'qty', 'qty', 'open')).toEqual({
      openMeasureKey: 'qty',
      deliveredMeasureKey: '',
    });
  });

  it('zet received en wist open op dezelfde kolom', () => {
    expect(assignChartRole('qty', '', 'qty', 'delivered')).toEqual({
      openMeasureKey: '',
      deliveredMeasureKey: 'qty',
    });
  });

  it('verplaatst open naar een andere kolom', () => {
    expect(assignChartRole('a', 'b', 'c', 'open')).toEqual({
      openMeasureKey: 'c',
      deliveredMeasureKey: 'b',
    });
  });

  it('maakt een rol leeg', () => {
    expect(assignChartRole('a', 'b', 'a', '')).toEqual({
      openMeasureKey: '',
      deliveredMeasureKey: 'b',
    });
  });
});

describe('chartRoleForColumn', () => {
  it('herkent open, received en geen rol', () => {
    expect(chartRoleForColumn('a', 'a', 'b')).toBe('open');
    expect(chartRoleForColumn('b', 'a', 'b')).toBe('delivered');
    expect(chartRoleForColumn('c', 'a', 'b')).toBe('');
  });
});
