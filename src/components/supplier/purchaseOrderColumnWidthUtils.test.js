import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HEADER_COLUMN_WIDTH,
  DEFAULT_LINE_COLUMN_WIDTH,
  fillHeaderColumnWidths,
  resolveHeaderColumnWidth,
  resolveLineColumnWidth,
} from './purchaseOrderColumnWidthUtils';

describe('resolveLineColumnWidth', () => {
  it('uses the stored width when present', () => {
    expect(resolveLineColumnWidth({ qty: 220 }, 'qty')).toBe(220);
  });

  it('falls back to the line default when missing', () => {
    expect(resolveLineColumnWidth({}, 'qty')).toBe(DEFAULT_LINE_COLUMN_WIDTH);
  });
});

describe('resolveHeaderColumnWidth', () => {
  it('keeps a width saved in the view', () => {
    expect(resolveHeaderColumnWidth({ status: 240 }, 'status')).toBe(240);
  });

  it('uses a stable default when the view has no width for that column', () => {
    expect(resolveHeaderColumnWidth({}, 'status')).toBe(DEFAULT_HEADER_COLUMN_WIDTH);
  });
});

describe('fillHeaderColumnWidths', () => {
  it('fills missing columns without overwriting saved view widths', () => {
    const filled = fillHeaderColumnWidths(
      [{ key: 'status' }, { key: 'vendor' }],
      { status: 240 }
    );
    expect(filled).toEqual({
      status: 240,
      vendor: DEFAULT_HEADER_COLUMN_WIDTH,
    });
  });

  it('does not mutate the stored view widths object', () => {
    const stored = { status: 240 };
    fillHeaderColumnWidths([{ key: 'status' }, { key: 'vendor' }], stored);
    expect(stored).toEqual({ status: 240 });
  });

  it('keeps the product image column on its own default instead of the header default', () => {
    const filled = fillHeaderColumnWidths(
      [{ key: '__productImage' }, { key: 'status' }],
      {}
    );
    expect(filled.__productImage).toBe(52);
    expect(filled.status).toBe(DEFAULT_HEADER_COLUMN_WIDTH);
  });
});
