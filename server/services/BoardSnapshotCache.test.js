'use strict';

const { readBoardSnapshot, readRccpPoRows } = require('./BoardSnapshotCache');
// BoardSnapshotCache.js gebruikt het gedeelde dataService-object (niet gedestructureerd),
// dus getRevision/read direct op dat object vervangen is genoeg — geen module-reset nodig.
const dataService = require('./TableDataService');

const originalGetRevision = dataService.getRevision;
const originalRead = dataService.read;

afterEach(() => {
  dataService.getRevision = originalGetRevision;
  dataService.read = originalRead;
  vi.restoreAllMocks();
});

function mockDataService({ revision = 1, parts = { syncedAt: 't1' }, rows = [{ id: 1 }], columns = [{ key: 'status' }] } = {}) {
  dataService.getRevision = vi.fn().mockResolvedValue({ revision, parts });
  dataService.read = vi.fn().mockResolvedValue({ meta: { columns: { master: columns } }, rows });
}

describe('readBoardSnapshot', () => {
  it('leest het volledige board bij een cache-miss en geeft rows/columns/revision terug', async () => {
    mockDataService();

    const result = await readBoardSnapshot({ tableKey: 'snapshot-test-1' });

    expect(dataService.read).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ rows: [{ id: 1 }], columns: [{ key: 'status' }], revision: 1 });
  });

  it('hergebruikt het snapshot bij een ongewijzigde content-signatuur — geen tweede read()', async () => {
    mockDataService({ parts: { syncedAt: 'same' } });

    await readBoardSnapshot({ tableKey: 'snapshot-test-2' });
    await readBoardSnapshot({ tableKey: 'snapshot-test-2' });

    expect(dataService.getRevision).toHaveBeenCalledTimes(2);
    expect(dataService.read).toHaveBeenCalledTimes(1);
  });

  it('doet een verse read() zodra de content-signatuur wijzigt (bv. na een sync)', async () => {
    mockDataService({ parts: { syncedAt: 'before' } });
    await readBoardSnapshot({ tableKey: 'snapshot-test-3' });

    mockDataService({ parts: { syncedAt: 'after' } });
    await readBoardSnapshot({ tableKey: 'snapshot-test-3' });

    expect(dataService.read).toHaveBeenCalledTimes(1);
  });

  it('gebruikt een apart snapshot per supplierAccount — geen datalek tussen suppliers', async () => {
    mockDataService({ parts: { syncedAt: 'same' } });

    await readBoardSnapshot({ tableKey: 'snapshot-test-4', supplierAccount: 'V000583' });
    await readBoardSnapshot({ tableKey: 'snapshot-test-4', supplierAccount: 'V000696' });

    expect(dataService.read).toHaveBeenCalledTimes(2);
  });

  it('doet een verse read() zodra de TTL (5 min) verstreken is, ook bij een ongewijzigde signatuur', async () => {
    vi.useFakeTimers();
    mockDataService({ parts: { syncedAt: 'same' } });

    await readBoardSnapshot({ tableKey: 'snapshot-test-5' });
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    await readBoardSnapshot({ tableKey: 'snapshot-test-5' });

    expect(dataService.read).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('readRccpPoRows', () => {
  it('leest zonder change-decoraties en hergebruikt de kpi-cache', async () => {
    mockDataService({ parts: { syncedAt: 'kpi-same' }, rows: [{ recordKey: 'PO-1' }] });

    const first = await readRccpPoRows({ tableKey: 'kpi-test-1' });
    const second = await readRccpPoRows({ tableKey: 'kpi-test-1' });

    expect(dataService.read).toHaveBeenCalledTimes(1);
    expect(dataService.read).toHaveBeenCalledWith({
      tableKey: 'kpi-test-1',
      supplierAccount: null,
      includeChangeDecorations: false,
    });
    expect(first.rows).toEqual([{ recordKey: 'PO-1' }]);
    expect(second.rows).toBe(first.rows);
  });

  it('hergebruikt een warm board-snapshot zonder tweede read()', async () => {
    mockDataService({ parts: { syncedAt: 'shared-snap' }, rows: [{ recordKey: 'PO-SNAP' }] });
    await readBoardSnapshot({ tableKey: 'kpi-reuse-snap' });
    dataService.read.mockClear();
    dataService.getRevision.mockClear();

    const kpi = await readRccpPoRows({ tableKey: 'kpi-reuse-snap' });

    expect(dataService.read).not.toHaveBeenCalled();
    expect(kpi.rows).toEqual([{ recordKey: 'PO-SNAP' }]);
  });

  it('slaat getRevision over wanneer revision en parts al bekend zijn', async () => {
    mockDataService({ parts: { syncedAt: 'known' }, rows: [{ recordKey: 'PO-2' }] });

    await readRccpPoRows({
      tableKey: 'kpi-known-rev',
      revision: 9,
      parts: { syncedAt: 'known' },
    });

    expect(dataService.getRevision).not.toHaveBeenCalled();
    expect(dataService.read).toHaveBeenCalledTimes(1);
  });
});
