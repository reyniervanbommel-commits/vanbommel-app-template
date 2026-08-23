import { describe, expect, it } from 'vitest';
import { entityBarValue, fetchedLabel } from './D365RefreshLivePanel';

describe('D365RefreshLivePanel helpers', () => {
  it('toont live fetched tegen het D365-totaal met duizendtalsstip', () => {
    expect(fetchedLabel({ fetched: 412, totalToFetch: 2500 })).toBe('Fetched from D365 412 / 2.500');
    expect(entityBarValue({ status: 'running', fetched: 500, totalToFetch: 1000 })).toBe(0.5);
  });
});
