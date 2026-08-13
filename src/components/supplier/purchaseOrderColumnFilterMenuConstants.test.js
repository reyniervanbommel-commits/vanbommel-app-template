import { describe, expect, it } from 'vitest';
import { getDraftFromFilter, isColumnFilterActive } from './purchaseOrderColumnFilterMenuConstants';

describe('purchaseOrderColumnFilterMenuConstants — oneOf', () => {
  const textColumn = { key: 'vendor', dataType: 'text' };

  it('getDraftFromFilter geeft een lege array voor een nieuw oneOf-filter', () => {
    const draft = getDraftFromFilter(textColumn, { operator: 'oneOf' });
    expect(draft.value).toEqual([]);
  });

  it('getDraftFromFilter geeft de bestaande oneOf-array door', () => {
    const draft = getDraftFromFilter(textColumn, { operator: 'oneOf', value: ['Acme', 'Beta'] });
    expect(draft.value).toEqual(['Acme', 'Beta']);
  });

  it('getDraftFromFilter zonder filter gebruikt de kolom-default (contains) met string-waarde', () => {
    const draft = getDraftFromFilter(textColumn, null);
    expect(draft).toEqual({ operator: 'contains', value: '', secondaryValue: '' });
  });

  it('isColumnFilterActive is alleen actief met een niet-lege oneOf-array', () => {
    expect(isColumnFilterActive(textColumn, { operator: 'oneOf', value: [] })).toBe(false);
    expect(isColumnFilterActive(textColumn, { operator: 'oneOf', value: ['Acme'] })).toBe(true);
  });
});
