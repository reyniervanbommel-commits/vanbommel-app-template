'use strict';
const { normalizeSearchQuery } = require('./RowRemarksValidation');

function expectBadRequest(fn, message) {
  try {
    fn();
    throw new Error('expected throw');
  } catch (error) {
    expect(error.status).toBe(400);
    expect(error.message).toBe(message);
  }
}

describe('normalizeSearchQuery', () => {
  it('trims, NFC-normalizes, and accepts 2–200 chars', () => {
    expect(normalizeSearchQuery('  ab  ')).toBe('ab');
  });

  it('rejects non-strings, arrays, too-short, too-long, and control chars', () => {
    expectBadRequest(() => normalizeSearchQuery(['ab']), 'Search text is required');
    expectBadRequest(() => normalizeSearchQuery('a'), 'Search text must contain 2 to 200 valid characters');
    expectBadRequest(() => normalizeSearchQuery('a\nb'), 'Search text must contain 2 to 200 valid characters');
    expectBadRequest(() => normalizeSearchQuery('a'.repeat(201)), 'Search text must contain 2 to 200 valid characters');
  });
});
