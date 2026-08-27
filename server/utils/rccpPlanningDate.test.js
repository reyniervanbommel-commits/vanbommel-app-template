'use strict';

const { parsePlanningDate } = require('./rccpPlanningDate');

describe('parsePlanningDate', () => {
  it('defaults empty to requested', () => {
    expect(parsePlanningDate('', { confirmedDateColumnKey: 'x' })).toBe('requested');
  });
  it('rejects invalid values', () => {
    expect(() => parsePlanningDate('maybe', { confirmedDateColumnKey: 'x' })).toThrow(/planningDate/);
  });
  it('rejects confirmed without a column', () => {
    expect(() => parsePlanningDate('confirmed', { confirmedDateColumnKey: '' })).toThrow(/planningDate/);
  });
});
