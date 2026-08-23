'use strict';

const { countMergeActions, countSoftDeleted } = require('./refreshRunCounts');

describe('countMergeActions', () => {
  it('telt INSERT als inserted en UPDATE alleen bij hash-verschil', () => {
    const counts = countMergeActions([
      { merge_action: 'INSERT', next_hash: 'a', prev_hash: null },
      { merge_action: 'UPDATE', next_hash: 'b', prev_hash: 'a' },
      { merge_action: 'UPDATE', next_hash: 'c', prev_hash: 'c' },
    ]);
    expect(counts).toEqual({ inserted: 1, updated: 1 });
  });
});

describe('countSoftDeleted', () => {
  it('telt alleen nieuwe soft-deletes en slaat retained keys over', () => {
    const deleted = countSoftDeleted([
      { previous_removed: 0, removed_at_source: 1, partition_key: 'nl', record_key: 'PO-1' },
      { previous_removed: 1, removed_at_source: 1, partition_key: 'nl', record_key: 'PO-2' },
      { previous_removed: 0, removed_at_source: 1, partition_key: 'nl', record_key: 'PO-3' },
    ], new Set(['nl|PO-3']));
    expect(deleted).toBe(1);
  });
});
