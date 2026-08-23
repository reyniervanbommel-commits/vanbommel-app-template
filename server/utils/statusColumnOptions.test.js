'use strict';

const {
  createDefaultStatusOptions,
  normalizeStatusOptions,
  getAllowedStatusLabels,
  buildStatusLabelRenames,
  buildRemovedStatusOptions,
} = require('../utils/statusColumnOptions');

describe('statusColumnOptions', () => {
  it('returns default labels when options are missing', () => {
    expect(createDefaultStatusOptions()).toHaveLength(3);
    expect(normalizeStatusOptions(null)).toHaveLength(3);
  });

  it('normalizes object options with colors', () => {
    const normalized = normalizeStatusOptions([
      { label: 'New', color: '#e2445c' },
      { label: 'Done', color: '#00c875' },
    ]);
    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toMatchObject({ label: 'New', color: '#e2445c' });
  });

  it('keeps an 8-digit status color with opacity', () => {
    const normalized = normalizeStatusOptions([
      { label: 'New', color: '#e2445cb3' },
    ]);
    expect(normalized[0].color).toBe('#e2445cb3');
  });

  it('deduplicates labels case-insensitively', () => {
    const normalized = normalizeStatusOptions([
      { label: 'New', color: '#e2445c' },
      { label: 'new', color: '#00c875' },
    ]);
    expect(normalized).toHaveLength(1);
  });

  it('exposes allowed labels for validation', () => {
    expect(getAllowedStatusLabels([{ label: 'Open', color: '#579bfc' }])).toEqual(['Open']);
  });

  it('detects label renames by stable option id', () => {
    const renames = buildStatusLabelRenames(
      [{ id: 'done', label: 'Done', color: '#00c875' }],
      [{ id: 'done', label: 'Completed', color: '#00c875' }],
    );
    expect(renames).toEqual([{ from: 'Done', to: 'Completed' }]);
  });

  it('detects removed labels by stable option id', () => {
    const removed = buildRemovedStatusOptions(
      [
        { id: 'new', label: 'New', color: '#e2445c' },
        { id: 'done', label: 'Done', color: '#00c875' },
      ],
      [{ id: 'new', label: 'New', color: '#e2445c' }],
    );
    expect(removed).toEqual([{ id: 'done', label: 'Done', color: '#00c875' }]);
  });

  it('does not flag a rename as a removal', () => {
    const removed = buildRemovedStatusOptions(
      [{ id: 'done', label: 'Done', color: '#00c875' }],
      [{ id: 'done', label: 'Completed', color: '#00c875' }],
    );
    expect(removed).toEqual([]);
  });

  it('returns an empty array when there is nothing to remove', () => {
    expect(buildRemovedStatusOptions(null, [{ label: 'New', color: '#e2445c' }])).toEqual([]);
    expect(buildRemovedStatusOptions([], [{ label: 'New', color: '#e2445c' }])).toEqual([]);
  });
});
