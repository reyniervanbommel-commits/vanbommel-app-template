'use strict';

const { accumulateChunkFetchProgress } = require('./refreshProgress');

describe('accumulateChunkFetchProgress', () => {
  it('telt chunk-progress op bij al opgehaalde rijen en houdt de cap als totaal', () => {
    expect(accumulateChunkFetchProgress(1600, { fetched: 120, pagesFetched: 2 }, 2500)).toEqual({
      fetched: 1720,
      totalToFetch: 2500,
      sourceTotal: null,
      pagesFetched: 2,
      truncated: false,
    });
  });

  it('laat fetched niet boven de cap uitkomen', () => {
    expect(accumulateChunkFetchProgress(2400, { fetched: 400 }, 2500).fetched).toBe(2500);
  });
});
