import { describe, expect, it } from 'vitest';
import {
  createPersistQueue,
  mergeBoardSettingsPatch,
  mergeIncomingPatches,
  pickPartialBoardSettings,
  snapshotFromLocalSettings,
} from './boardSettingsPersist';

const LINKS = [{ lineColumnKey: 'receiptDate', headerColumnKey: 'receipt_date_values' }];

function snapshot(overrides = {}) {
  return {
    visibleColumns: ['status'],
    columnOrder: ['status'],
    lineColumnOrder: ['qty'],
    headerColumnWidths: { status: 120 },
    lineColumnWidths: {},
    headerColumnTextStyles: {},
    headerColumnFormatRules: {},
    lineColumnTextStyles: {},
    lineColumnFormatRules: {},
    lineTotalColumns: [],
    lineTotalHeaderLinks: [],
    lineValueHeaderLinks: LINKS,
    collapsedHeaderColumnKeys: [],
    collapsedLineColumnKeys: [],
    productImageColumnVisible: true,
    ...overrides,
  };
}

describe('mergeBoardSettingsPatch', () => {
  it('keeps existing lineValueHeaderLinks when a later persist only changes column width', () => {
    const merged = mergeBoardSettingsPatch(snapshot(), {
      nextHeaderWidths: { status: 180 },
    });

    expect(merged.lineValueHeaderLinks).toEqual(LINKS);
    expect(merged.headerColumnWidths).toEqual({ status: 180 });
  });

  it('clears lineValueHeaderLinks when the patch explicitly sets an empty array', () => {
    const merged = mergeBoardSettingsPatch(snapshot(), {
      nextLineValueHeaderLinks: [],
    });

    expect(merged.lineValueHeaderLinks).toEqual([]);
  });
});

describe('pickPartialBoardSettings', () => {
  it('omits unpatched fields so a width PATCH cannot overwrite stored links', () => {
    const patch = { nextHeaderWidths: { status: 180 } };
    const merged = mergeBoardSettingsPatch(snapshot(), patch);
    const body = pickPartialBoardSettings(merged, patch);

    expect(body).toEqual({ headerColumnWidths: { status: 180 } });
    expect(body).not.toHaveProperty('lineValueHeaderLinks');
  });

  it('includes an explicit empty lineValueHeaderLinks array so clearing still works', () => {
    const patch = { nextLineValueHeaderLinks: [] };
    const merged = mergeBoardSettingsPatch(snapshot(), patch);
    const body = pickPartialBoardSettings(merged, patch);

    expect(body).toEqual({ lineValueHeaderLinks: [] });
  });
});

describe('mergeIncomingPatches', () => {
  it('flushes a pending text-style patch into a later links persist without dropping either', () => {
    const combined = mergeIncomingPatches(
      { nextHeaderTextStyles: { status: { bold: true } } },
      { nextLineValueHeaderLinks: LINKS },
    );

    expect(combined).toEqual({
      nextHeaderTextStyles: { status: { bold: true } },
      nextLineValueHeaderLinks: LINKS,
    });
  });
});

describe('createPersistQueue', () => {
  it('runs a second persist only after the first in-flight PATCH resolves', async () => {
    const order = [];
    let releaseFirst;
    const queued = createPersistQueue();

    const first = queued(async () => {
      order.push('start-links');
      await new Promise((resolve) => {
        releaseFirst = resolve;
      });
      order.push('end-links');
    });
    const second = queued(async () => {
      order.push('start-width');
      order.push('end-width');
    });

    await Promise.resolve();
    expect(order).toEqual(['start-links']);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(['start-links', 'end-links', 'start-width', 'end-width']);
  });
});

describe('snapshotFromLocalSettings', () => {
  it('maps visibleColumnKeys from hook state onto visibleColumns', () => {
    expect(snapshotFromLocalSettings({
      visibleColumnKeys: ['status'],
      lineValueHeaderLinks: LINKS,
    }).visibleColumns).toEqual(['status']);
    expect(snapshotFromLocalSettings({
      visibleColumns: ['qty'],
      visibleColumnKeys: ['status'],
    }).visibleColumns).toEqual(['qty']);
  });
});
