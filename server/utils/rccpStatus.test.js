'use strict';

const { computeRccpStatus, overcapacityStatus } = require('./rccpStatus');

describe('overcapacityStatus', () => {
  it('is green only from +1 surplus', () => {
    expect(overcapacityStatus(1)).toEqual({ color: 'green', label: 'OK' });
    expect(overcapacityStatus(12)).toEqual({ color: 'green', label: 'OK' });
  });

  it('stays grey at zero surplus', () => {
    expect(overcapacityStatus(0)).toEqual({ color: 'grey', label: 'Even' });
  });

  it('is red when short', () => {
    expect(overcapacityStatus(-1)).toEqual({ color: 'red', label: 'Shortage' });
  });
});

describe('computeRccpStatus', () => {
  it('marks unplanned load red when capacity is zero', () => {
    expect(computeRccpStatus(0, 10).color).toBe('red');
  });
});
