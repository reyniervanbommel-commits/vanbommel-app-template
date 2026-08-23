import { describe, expect, it } from 'vitest';
import {
  lookupSampleValue,
  mergeDiscoverySamples,
  mergeSampleByField,
} from './entityConfigTableUtils';

describe('entityConfigTableUtils samples', () => {
  it('vindt een sample case-insensitive op D365-veld of kolomkey', () => {
    expect(lookupSampleValue(
      { ItemNumber: 'ART-1' },
      'itemNumber',
      'ItemNumber',
    )).toBe('ART-1');
  });

  it('vult ontbrekende samples vanuit Discover zonder bestaande waarden te overschrijven', () => {
    const merged = mergeSampleByField(
      { ItemNumber: 'ART-1', SearchName: '—' },
      { SearchName: 'Boot', ProductGroupId: 'FG' },
    );
    expect(merged.ItemNumber).toBe('ART-1');
    expect(merged.SearchName).toBe('Boot');
    expect(merged.ProductGroupId).toBe('FG');
  });

  it('zet Discover-samples in de preview-tabellen', () => {
    const preview = mergeDiscoverySamples(
      {
        header: { sampleByField: { ItemNumber: '—' } },
        line: { sampleByField: {} },
      },
      { header: { ItemNumber: 'ART-2' }, line: {} },
    );
    expect(preview.header.sampleByField.ItemNumber).toBe('ART-2');
  });
});
