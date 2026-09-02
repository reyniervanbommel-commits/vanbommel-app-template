import { describe, expect, it } from 'vitest';
import { getUniqueColumnValues, getValueSuggestions, UNIQUE_VALUE_SUGGESTION_LIMIT } from './columnUniqueValues';

describe('getUniqueColumnValues', () => {
  const columns = [
    { key: 'vendor', dataType: 'text' },
    { key: 'status', dataType: 'text' },
  ];
  const items = [
    { values: { vendor: 'Acme', status: 'Open' } },
    { values: { vendor: 'acme', status: 'Closed' } },
    { values: { vendor: 'Beta', status: 'Open' } },
    { values: { vendor: '', status: 'Open' } },
    { values: { vendor: null, status: 'Open' } },
  ];

  it('dedupliceert case-insensitief en negeert lege/null-waarden, alfabetisch gesorteerd', () => {
    const result = getUniqueColumnValues(columns[0], items, columns, {}, {});
    expect(result).toEqual(['Acme', 'Beta']);
  });

  it('is cascading: respecteert filters op andere kolommen, sluit de eigen kolom uit', () => {
    const filterByColumn = { status: { operator: 'equals', value: 'Open' } };
    const result = getUniqueColumnValues(columns[0], items, columns, filterByColumn, {});
    expect(result).toEqual(['Acme', 'Beta']);

    const filterByColumnClosed = { status: { operator: 'equals', value: 'Closed' } };
    const resultClosed = getUniqueColumnValues(columns[0], items, columns, filterByColumnClosed, {});
    expect(resultClosed).toEqual(['acme']);
  });

  it('sorteert numeriek voor number-kolommen', () => {
    const numberColumn = { key: 'amount', dataType: 'number' };
    const numberItems = [
      { values: { amount: 250 } },
      { values: { amount: 100 } },
      { values: { amount: '100' } },
    ];
    const result = getUniqueColumnValues(numberColumn, numberItems, [numberColumn], {}, {});
    expect(result).toEqual([100, 250]);
  });
});

describe('getValueSuggestions', () => {
  it('filtert op substring, case-insensitief', () => {
    const result = getValueSuggestions(['Acme', 'Beta', 'acme Corp'], 'acme');
    expect(result.items).toEqual(['Acme', 'acme Corp']);
    expect(result.totalMatches).toBe(2);
    expect(result.truncated).toBe(false);
  });

  it('kapt af op de limiet en meldt truncated + totalMatches', () => {
    const values = Array.from({ length: 150 }, (_, i) => `Value ${i}`);
    const result = getValueSuggestions(values, '');
    expect(result.items).toHaveLength(UNIQUE_VALUE_SUGGESTION_LIMIT);
    expect(result.totalMatches).toBe(150);
    expect(result.truncated).toBe(true);
  });

  it('matcht ook op een weergavelabel als formatDisplay is meegegeven', () => {
    const formatDisplay = (value) => (value === 'Backorder' ? 'Open order' : String(value));
    const result = getValueSuggestions(['Backorder', 'Invoiced'], 'open', 10, formatDisplay);
    expect(result.items).toEqual(['Backorder']);
  });
});
