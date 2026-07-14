'use strict';

const {
  createDefaultStatusOptions,
  normalizeStatusOptions,
  getAllowedStatusLabels,
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
});
