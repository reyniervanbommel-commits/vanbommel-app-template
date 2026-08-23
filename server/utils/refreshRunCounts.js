'use strict';

function countMergeActions(rows) {
  let inserted = 0;
  let updated = 0;
  for (const row of rows || []) {
    const action = String(row.merge_action || '').toUpperCase();
    if (action === 'INSERT') {
      inserted += 1;
      continue;
    }
    if (action === 'UPDATE' && row.next_hash !== row.prev_hash) {
      updated += 1;
    }
  }
  return { inserted, updated };
}

function countSoftDeleted(rows, retainedKeys = null) {
  let deleted = 0;
  for (const row of rows || []) {
    if (Number(row.previous_removed) === 1 || !Number(row.removed_at_source)) continue;
    const rowKey = `${row.partition_key}|${row.record_key}`;
    if (retainedKeys && retainedKeys.has(rowKey)) continue;
    deleted += 1;
  }
  return deleted;
}

module.exports = { countMergeActions, countSoftDeleted };
