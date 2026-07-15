import { describe, expect, it } from 'vitest';
import {
  createDefaultStatusOptions,
  getContrastTextColor,
  getStatusOptionByValue,
  normalizeStatusOptions,
  resolveStatusCellColor,
} from './statusColumnUtils';

describe('statusColumnUtils', () => {
  it('creates default status labels with colors', () => {
    const options = createDefaultStatusOptions();
    expect(options).toHaveLength(3);
    expect(options[0]).toMatchObject({ label: 'New', color: '#e2445c' });
  });

  it('normalizes legacy string options', () => {
    const options = normalizeStatusOptions(['Open', 'Closed']);
    expect(options).toHaveLength(2);
    expect(options[0].label).toBe('Open');
    expect(options[0].color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('resolves cell color from selected label', () => {
    const options = [{ id: 'new', label: 'New', color: '#e2445c' }];
    expect(resolveStatusCellColor('New', options)).toBe('#e2445c');
    expect(resolveStatusCellColor('', options)).toBe('#c4c4c4');
  });

  it('finds option by label', () => {
    const options = [{ id: 'done', label: 'Done', color: '#00c875' }];
    expect(getStatusOptionByValue('Done', options)?.color).toBe('#00c875');
  });

  it('picks readable text color for backgrounds', () => {
    expect(getContrastTextColor('#e2445c')).toBe('#ffffff');
    expect(getContrastTextColor('#ffcb00')).toBe('#323130');
  });
});
