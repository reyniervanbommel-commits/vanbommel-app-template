// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { hoverCursorX } from './RccpWeekBandCursor';

describe('hoverCursorX', () => {
  it('uses the Recharts band centre so the line sits in the middle of the period', () => {
    expect(hoverCursorX([{ x: 120 }])).toBe(120);
  });

  it('returns null without points', () => {
    expect(hoverCursorX([])).toBeNull();
    expect(hoverCursorX(null)).toBeNull();
  });
});
