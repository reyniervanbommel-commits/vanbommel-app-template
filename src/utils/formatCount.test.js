import { describe, expect, it } from 'vitest';
import { formatCount, formatVisibleTotal } from './formatCount';

describe('formatCount', () => {
  it('zet een punt als duizendtalseparator', () => {
    expect(formatCount(2500)).toBe('2.500');
    expect(formatCount(1600)).toBe('1.600');
    expect(formatCount(12)).toBe('12');
  });

  it('toont zichtbare rijen naast het totaal', () => {
    expect(formatVisibleTotal(1234, 2500)).toBe('1.234 / 2.500');
    expect(formatVisibleTotal(12, 12)).toBe('12 / 12');
  });
});
