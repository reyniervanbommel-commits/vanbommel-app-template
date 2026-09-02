'use strict';

const { valuesEqualForConcurrency } = require('./odataValueEquals');

describe('valuesEqualForConcurrency', () => {
  it('treats date-only ISO and date-only as equal', () => {
    expect(valuesEqualForConcurrency('2026-08-25T00:00:00.000Z', '2026-08-25', 'date')).toBe(true);
  });
  it('treats different text as not equal', () => {
    expect(valuesEqualForConcurrency('Red', 'Blue', 'text')).toBe(false);
  });
});
