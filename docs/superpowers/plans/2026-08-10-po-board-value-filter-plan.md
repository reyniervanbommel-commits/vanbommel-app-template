# PO-board waarde-filter (equals/oneOf combobox) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vervang de vrije tekstvelden voor de `equals` ("is exactly") en `oneOf` ("is one of")
kolomfilters op het PO-board door een combobox met typeahead-suggesties uit de al geladen
boarddata, met D365 F&O-stijl plakken-als-lijst voor `oneOf`.

**Architecture:** Puur client-side. `oneOf` gaat van kommagescheiden string naar array in het
filter-datamodel (`src/utils/tableViewFilterUtils.js`), met backward-compat voor bestaande
opgeslagen views. Unieke-waarden/suggesties worden lazy berekend (alleen als de popover van die
kolom open is) over de al in-memory geladen `items`, gefilterd door alle *andere* actieve
kolomfilters (cascading). Eén nieuwe presentational component
(`PurchaseOrderColumnFilterValuePicker`) rendert zowel de single-value combobox (`equals`) als de
multi-value chip/paste-input (`oneOf`).

**Tech Stack:** React 18, Fluent UI v9 (`@fluentui/react-components`, `@fluentui/react-icons`),
Vitest + @testing-library/react.

## Global Constraints

- Geldt alleen voor kolommen die vandaag al de generieke tekst-operatoren tonen (niet-date,
  niet-number → text/status/select/etc.) **plus** number-kolommen; date-kolommen blijven
  volledig ongewijzigd.
- Suggestielijst: maximaal **100** matches getoond; bij meer toont de UI een afkap-hint.
- Cascading: suggesties/unieke waarden worden berekend over items gefilterd door alle *andere*
  actieve kolomfilters (kleurfilters `colorIs` tellen daarbij niet mee — expliciete
  scope-beperking, zie Task 3).
- Geen backend-wijziging; geen nieuwe API-calls. Alles blijft binnen het bestaande client-side
  filterpad van `usePurchaseOrderTableView`.
- Engelse UI-teksten (labels, hints, aria-labels) — conform `.cursor/rules/app-taal.mdc`.
- Spec: `docs/superpowers/specs/2026-08-10-po-board-value-filter-design.md`.

---

## Task 1: Array-based `oneOf`-waarde + backward compat (tekstkolommen)

**Files:**
- Modify: `src/utils/tableViewFilterUtils.js:90-137` (`resolveFilterModel`, `hasActiveFilter`), `:182-196` (`textMatchesFilter`)
- Test: `src/utils/tableViewFilterUtils.test.js`

**Interfaces:**
- Produces: `resolveFilterModel(column, filter, datePeriodDisplayModes)` — voor `filter.operator === 'oneOf'` retourneert `{ operator: 'oneOf', value: string[], secondaryValue: '' }` (array, nooit meer string). Leest zowel een array als een legacy kommagescheiden string in `filter.value`.
- Produces: `hasActiveFilter(column, filter, datePeriodDisplayModes)` — voor `oneOf` actief zodra `Array.isArray(filter.value) && filter.value.length > 0`.
- Produces: `textMatchesFilter(rawValue, filter)` — `oneOf`-tak matcht tegen een array i.p.v. een kommagescheiden string.

- [ ] **Step 1: Write the failing tests**

Voeg toe aan `src/utils/tableViewFilterUtils.test.js` (nieuwe `describe`-blok onderaan het bestand):

```js
import {
  hasActiveFilter,
  resolveFilterModel,
  textMatchesFilter,
} from './tableViewFilterUtils';

describe('oneOf filter — array-based waarde + backward compat', () => {
  const textColumn = { key: 'vendor', dataType: 'text' };

  it('resolveFilterModel normaliseert een array-waarde ongewijzigd', () => {
    const model = resolveFilterModel(textColumn, { operator: 'oneOf', value: ['Acme', 'Beta'] });
    expect(model).toEqual({ operator: 'oneOf', value: ['Acme', 'Beta'], secondaryValue: '' });
  });

  it('resolveFilterModel zet een legacy kommagescheiden string om naar een array', () => {
    const model = resolveFilterModel(textColumn, { operator: 'oneOf', value: 'Acme, Inc.,Beta' });
    expect(model).toEqual({ operator: 'oneOf', value: ['Acme, Inc.', 'Beta'], secondaryValue: '' });
  });

  it('resolveFilterModel geeft een lege array zonder bestaand filter', () => {
    const model = resolveFilterModel(textColumn, { operator: 'oneOf' });
    expect(model.value).toEqual([]);
  });

  it('hasActiveFilter is alleen actief met een niet-lege oneOf-array', () => {
    expect(hasActiveFilter(textColumn, { operator: 'oneOf', value: [] })).toBe(false);
    expect(hasActiveFilter(textColumn, { operator: 'oneOf', value: ['Acme'] })).toBe(true);
  });

  it('textMatchesFilter matcht case-insensitive tegen de oneOf-array', () => {
    const filter = { operator: 'oneOf', value: ['Acme, Inc.', 'Beta'] };
    expect(textMatchesFilter('acme, inc.', filter)).toBe(true);
    expect(textMatchesFilter('Gamma', filter)).toBe(false);
  });

  it('textMatchesFilter valt terug op een legacy string-waarde', () => {
    const filter = { operator: 'oneOf', value: 'Acme,Beta' };
    expect(textMatchesFilter('beta', filter)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tableViewFilterUtils`
Expected: FAIL — `resolveFilterModel` geeft nu nog een string terug voor `oneOf`, `hasActiveFilter`
mist de array-tak, `textMatchesFilter` splitst nog altijd op komma's.

- [ ] **Step 3: Implementeer `resolveFilterModel`, `hasActiveFilter`, `textMatchesFilter`**

In `src/utils/tableViewFilterUtils.js`, voeg vlak vóór `resolveFilterModel` een privé helper toe:

```js
// Zet een legacy kommagescheiden 'oneOf'-string om naar een array met behoud van originele
// casing/spelling (voor weergave als chips) — matching normaliseert apart via normalizeText.
function splitLegacyOneOfString(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeOneOfValue(rawValue) {
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue === 'string' && rawValue) return splitLegacyOneOfString(rawValue);
  return [];
}
```

Pas `resolveFilterModel` aan door direct na de `COLOR_FILTER_OPERATOR`-tak een `oneOf`-tak toe te
voegen (vóór de `isDateColumn`-check, want `oneOf` heeft dezelfde array-vorm ongeacht kolomtype):

```js
export function resolveFilterModel(column, filter, datePeriodDisplayModes = {}) {
  if (filter?.operator === COLOR_FILTER_OPERATOR) {
    return {
      operator: COLOR_FILTER_OPERATOR,
      colors: Array.isArray(filter.colors) ? filter.colors.filter(Boolean) : [],
      value: '',
      secondaryValue: '',
    };
  }
  if (filter?.operator === 'oneOf') {
    return {
      operator: 'oneOf',
      value: normalizeOneOfValue(filter.value),
      secondaryValue: '',
    };
  }
  if (isDateColumn(column)) {
    return {
      operator: filter?.operator || 'before',
      value: filter?.value || '',
      secondaryValue: filter?.secondaryValue || '',
    };
  }
  if (columnUsesNumberSemantics(column, datePeriodDisplayModes)) {
    return {
      operator: filter?.operator || 'equals',
      value: filter?.value || '',
      secondaryValue: filter?.secondaryValue || '',
    };
  }
  return {
    operator: filter?.operator || 'contains',
    value: filter?.value || '',
    secondaryValue: '',
  };
}
```

Pas `hasActiveFilter` aan door dezelfde vroege `oneOf`-tak toe te voegen (direct na de
`COLOR_FILTER_OPERATOR`-check):

```js
export function hasActiveFilter(column, filter, datePeriodDisplayModes = {}) {
  if (!filter) return false;
  if (filter.operator === COLOR_FILTER_OPERATOR) {
    return Array.isArray(filter.colors) && filter.colors.length > 0;
  }
  if (filter.operator === 'oneOf') {
    return Array.isArray(filter.value) && filter.value.length > 0;
  }
  if (isDateColumn(column)) {
    if (filter.operator === 'nextWeek') return true;
    if (filter.operator === 'between') return Boolean(filter.value && filter.secondaryValue);
    if (filter.operator === 'equals' && filter.value === '') return true;
    return Boolean(filter.value);
  }
  if (columnUsesNumberSemantics(column, datePeriodDisplayModes)) {
    if (filter.operator === 'between') return Boolean(filter.value !== '' && filter.secondaryValue !== '');
    return filter.value !== '' && filter.value !== null && filter.value !== undefined;
  }
  if (filter.operator === 'equals' && filter.value === '') return true;
  return Boolean(filter.value);
}
```

Pas `textMatchesFilter` aan zodat de `oneOf`-tak een array leest (met een defensieve fallback naar
de bestaande `parseOneOfValues`-string-split, voor het geval de functie direct met een
niet-genormaliseerd legacy filterobject wordt aangeroepen):

```js
export function textMatchesFilter(rawValue, filter) {
  const normalized = normalizeText(rawValue);
  if (filter.operator === 'oneOf') {
    const options = (Array.isArray(filter.value) ? filter.value : parseOneOfValues(filter.value))
      .map(normalizeText);
    return options.length ? options.includes(normalized) : true;
  }
  const query = normalizeText(filter.value);
  if (!query && filter.operator !== 'equals') return true;
  if (filter.operator === 'equals') return normalized === query;
  if (filter.operator === 'contains') return normalized.includes(query);
  if (filter.operator === 'notContains') return !normalized.includes(query);
  if (filter.operator === 'startsWith') return normalized.startsWith(query);
  if (filter.operator === 'notStartsWith') return !normalized.startsWith(query);
  return true;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tableViewFilterUtils`
Expected: PASS (alle bestaande + nieuwe tests in dit bestand)

- [ ] **Step 5: Commit**

```bash
git add src/utils/tableViewFilterUtils.js src/utils/tableViewFilterUtils.test.js
git commit -m "feat(po-filter): oneOf-filterwaarde wordt array met backward compat voor komma-string"
```

---

## Task 2: `oneOf`-operator voor number-kolommen

**Files:**
- Modify: `src/utils/tableViewFilterUtils.js:32-39` (`NUMBER_FILTER_OPERATORS`), `:198-217` (`numberMatchesFilter`)
- Test: `src/utils/tableViewFilterUtils.test.js`

**Interfaces:**
- Consumes: `parseNumberValue` (privé helper, al aanwezig in dit bestand).
- Produces: `NUMBER_FILTER_OPERATORS.oneOf === 'is one of'`. `numberMatchesFilter(rawValue, { operator: 'oneOf', value: number[] })` matcht op numerieke gelijkheid met elk element.

- [ ] **Step 1: Write the failing tests**

Voeg toe aan `src/utils/tableViewFilterUtils.test.js`:

```js
import { NUMBER_FILTER_OPERATORS, numberMatchesFilter } from './tableViewFilterUtils';

describe('oneOf filter — number-kolommen', () => {
  it('NUMBER_FILTER_OPERATORS bevat oneOf', () => {
    expect(NUMBER_FILTER_OPERATORS.oneOf).toBe('is one of');
  });

  it('numberMatchesFilter matcht een waarde uit de oneOf-array', () => {
    const filter = { operator: 'oneOf', value: [100, 250] };
    expect(numberMatchesFilter(100, filter)).toBe(true);
    expect(numberMatchesFilter('250', filter)).toBe(true);
    expect(numberMatchesFilter(300, filter)).toBe(false);
  });

  it('numberMatchesFilter met lege oneOf-array matcht alles', () => {
    expect(numberMatchesFilter(42, { operator: 'oneOf', value: [] })).toBe(true);
  });

  it('numberMatchesFilter negeert niet-numerieke rijwaarden', () => {
    expect(numberMatchesFilter('n/a', { operator: 'oneOf', value: [1] })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tableViewFilterUtils`
Expected: FAIL — `oneOf` ontbreekt in `NUMBER_FILTER_OPERATORS` en `numberMatchesFilter` heeft er
geen tak voor (valt terug op de generieke `equals`-tak, die met een array altijd `null` target geeft).

- [ ] **Step 3: Implementeer**

In `src/utils/tableViewFilterUtils.js`, voeg `oneOf` toe aan `NUMBER_FILTER_OPERATORS`:

```js
export const NUMBER_FILTER_OPERATORS = {
  equals: 'is exactly',
  oneOf: 'is one of',
  gt: 'is greater than',
  lt: 'is less than',
  gte: 'is greater than or equal to',
  lte: 'is less than or equal to',
  between: 'is between',
};
```

Voeg een `oneOf`-tak toe vóór de bestaande logica in `numberMatchesFilter`:

```js
export function numberMatchesFilter(rawValue, filter) {
  if (filter.operator === 'oneOf') {
    const targets = (Array.isArray(filter.value) ? filter.value : [])
      .map(parseNumberValue)
      .filter((num) => num !== null);
    if (!targets.length) return true;
    const rowNum = parseNumberValue(rawValue);
    if (rowNum === null) return false;
    return targets.includes(rowNum);
  }
  if (filter.operator === 'between') {
    const from = parseNumberValue(filter.value);
    const to = parseNumberValue(filter.secondaryValue);
    if (from === null || to === null) return true;
    const rowNum = parseNumberValue(rawValue);
    if (rowNum === null) return false;
    return rowNum >= Math.min(from, to) && rowNum <= Math.max(from, to);
  }
  const target = parseNumberValue(filter.value);
  if (target === null) return true;
  const rowNum = parseNumberValue(rawValue);
  if (rowNum === null) return false;
  if (filter.operator === 'equals') return rowNum === target;
  if (filter.operator === 'gt') return rowNum > target;
  if (filter.operator === 'lt') return rowNum < target;
  if (filter.operator === 'gte') return rowNum >= target;
  if (filter.operator === 'lte') return rowNum <= target;
  return true;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tableViewFilterUtils`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/tableViewFilterUtils.js src/utils/tableViewFilterUtils.test.js
git commit -m "feat(po-filter): voeg oneOf-operator toe aan number-kolommen"
```

---

## Task 3: Cascading filter-helper `filterItemsByColumnFilters`

**Files:**
- Modify: `src/utils/tableViewFilterUtils.js` (nieuwe export, plaats na `columnValueMatchesFilter`)
- Test: `src/utils/tableViewFilterUtils.test.js`

**Interfaces:**
- Consumes: `resolveFilterModel`, `hasActiveFilter`, `columnValueMatchesFilter`, `COLOR_FILTER_OPERATOR` (alle al in dit bestand).
- Produces: `filterItemsByColumnFilters(items, columns, filterByColumn, datePeriodDisplayModes, excludeColumnKey)` → gefilterde array van `items`, op basis van alle actieve *waarde*-filters (kleurfilters `colorIs` expliciet uitgesloten) op kolommen ≠ `excludeColumnKey`. Dit wordt in Task 5 gebruikt voor de cascading unieke-waardenlijst; de bestaande `processedItems`-hotpath in `usePurchaseOrderTableView.js` blijft ongewijzigd (geen refactor-risico op dat perf-gevoelige pad).

- [ ] **Step 1: Write the failing tests**

Voeg toe aan `src/utils/tableViewFilterUtils.test.js`:

```js
import { filterItemsByColumnFilters } from './tableViewFilterUtils';

describe('filterItemsByColumnFilters', () => {
  const columns = [
    { key: 'vendor', dataType: 'text' },
    { key: 'status', dataType: 'text' },
  ];
  const items = [
    { values: { vendor: 'Acme', status: 'Open' } },
    { values: { vendor: 'Acme', status: 'Closed' } },
    { values: { vendor: 'Beta', status: 'Open' } },
  ];

  it('geeft alle items terug zonder actieve filters', () => {
    expect(filterItemsByColumnFilters(items, columns, {}, {}, 'status')).toEqual(items);
  });

  it('past filters van andere kolommen toe, maar niet die van excludeColumnKey', () => {
    const filterByColumn = {
      vendor: { operator: 'equals', value: 'Acme' },
      status: { operator: 'equals', value: 'Open' },
    };
    const result = filterItemsByColumnFilters(items, columns, filterByColumn, {}, 'status');
    // vendor-filter (Acme) blijft actief, status-filter (de kolom zelf) wordt genegeerd
    expect(result).toEqual([
      { values: { vendor: 'Acme', status: 'Open' } },
      { values: { vendor: 'Acme', status: 'Closed' } },
    ]);
  });

  it('negeert kleurfilters (colorIs) op andere kolommen', () => {
    const filterByColumn = {
      vendor: { operator: 'colorIs', colors: ['#ff0000'] },
    };
    expect(filterItemsByColumnFilters(items, columns, filterByColumn, {}, 'status')).toEqual(items);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tableViewFilterUtils`
Expected: FAIL — `filterItemsByColumnFilters` bestaat nog niet (import error).

- [ ] **Step 3: Implementeer**

Voeg toe aan `src/utils/tableViewFilterUtils.js`, direct na `columnValueMatchesFilter`:

```js
/**
 * Filtert items op alle actieve waarde-filters, met uitzondering van het filter op
 * `excludeColumnKey` en van kleurfilters (colorIs — die hebben de volledige rij + format-regels
 * nodig, niet alleen de ruwe celwaarde, en vallen buiten deze cascading-berekening).
 */
export function filterItemsByColumnFilters(items, columns, filterByColumn, datePeriodDisplayModes = {}, excludeColumnKey = null) {
  const activeFilters = columns
    .filter((column) => column.key !== excludeColumnKey)
    .map((column) => [column, resolveFilterModel(column, filterByColumn?.[column.key], datePeriodDisplayModes)])
    .filter(([column, filter]) => (
      filter.operator !== COLOR_FILTER_OPERATOR && hasActiveFilter(column, filter, datePeriodDisplayModes)
    ));
  if (!activeFilters.length) return items;
  return items.filter((item) => activeFilters.every(([column, filter]) => (
    columnValueMatchesFilter(column, item?.values?.[column.key], filter, datePeriodDisplayModes)
  )));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tableViewFilterUtils`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/tableViewFilterUtils.js src/utils/tableViewFilterUtils.test.js
git commit -m "feat(po-filter): voeg filterItemsByColumnFilters toe voor cascading suggesties"
```

---

## Task 4: Array-bewuste `isColumnFilterActive` / `getDraftFromFilter`

**Files:**
- Modify: `src/components/supplier/purchaseOrderColumnFilterMenuConstants.js:71-101`
- Test: `src/components/supplier/purchaseOrderColumnFilterMenuConstants.test.js` (nieuw bestand — dit bestand had nog geen eigen test; de logica werd tot nu toe alleen indirect gedekt)

**Interfaces:**
- Consumes: `hasActiveFilter` uit `src/utils/tableViewFilterUtils.js` (Task 1).
- Produces: `isColumnFilterActive(column, filter, datePeriodDisplayModes)` — delegeert nu volledig naar `hasActiveFilter` (was een losse kopie van dezelfde logica; nu één bron van waarheid voor oneOf-array-gedrag). `getDraftFromFilter(column, filter, datePeriodDisplayModes)` — voor operator `oneOf` is `draft.value` altijd een array (nooit een string).

- [ ] **Step 1: Write the failing tests**

Nieuw bestand `src/components/supplier/purchaseOrderColumnFilterMenuConstants.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- purchaseOrderColumnFilterMenuConstants`
Expected: FAIL — `getDraftFromFilter` geeft nu nog `''` terug voor een lege/nieuwe `oneOf`-waarde
i.p.v. `[]`; `isColumnFilterActive` beschouwt een niet-lege array altijd als actief maar een lege
array óók als actief (`Boolean([])` is `true`).

- [ ] **Step 3: Implementeer**

In `src/components/supplier/purchaseOrderColumnFilterMenuConstants.js`, importeer `hasActiveFilter`
naast de bestaande `COLOR_FILTER_OPERATOR`-import:

```js
import { COLOR_FILTER_OPERATOR, hasActiveFilter } from '../../utils/tableViewFilterUtils';
```

Vervang `getDraftFromFilter`:

```js
export function getDraftFromFilter(column, filter, datePeriodDisplayModes = {}) {
  const operator = filter?.operator && filter.operator !== COLOR_FILTER_OPERATOR
    ? filter.operator
    : getDefaultOperator(column, datePeriodDisplayModes);
  if (operator === 'oneOf') {
    return {
      operator,
      value: filter?.operator === 'oneOf' && Array.isArray(filter.value) ? filter.value : [],
      secondaryValue: '',
    };
  }
  return {
    operator,
    value: filter?.operator === COLOR_FILTER_OPERATOR ? '' : (filter?.value || ''),
    secondaryValue: filter?.operator === COLOR_FILTER_OPERATOR ? '' : (filter?.secondaryValue || ''),
  };
}
```

Vervang `isColumnFilterActive` volledig door een delegatie naar `hasActiveFilter` (identieke logica,
nu één bron van waarheid):

```js
export function isColumnFilterActive(column, filter, datePeriodDisplayModes = {}) {
  return hasActiveFilter(column, filter, datePeriodDisplayModes);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- purchaseOrderColumnFilterMenuConstants`
Expected: PASS

Run ook de volledige suite van dit gebied om regressies uit te sluiten:
Run: `npm test -- PurchaseOrderColumnFilterMenu`
Expected: PASS (bestaande tests ongewijzigd)

- [ ] **Step 5: Commit**

```bash
git add src/components/supplier/purchaseOrderColumnFilterMenuConstants.js src/components/supplier/purchaseOrderColumnFilterMenuConstants.test.js
git commit -m "feat(po-filter): isColumnFilterActive/getDraftFromFilter array-bewust voor oneOf"
```

---

## Task 5: Unieke-waarden + suggestie-utility

**Files:**
- Create: `src/utils/columnUniqueValues.js`
- Test: `src/utils/columnUniqueValues.test.js`

**Interfaces:**
- Consumes: `filterItemsByColumnFilters` (Task 3), `columnUsesNumberSemantics` uit `src/utils/datePeriodColumnUtils.js` (al bestaand, gebruikt in `tableViewFilterUtils.js`).
- Produces:
  - `UNIQUE_VALUE_SUGGESTION_LIMIT = 100`
  - `getUniqueColumnValues(column, items, columns, filterByColumn, datePeriodDisplayModes)` → gesorteerde array van unieke, niet-lege waarden (string[] of number[], al naar gelang kolomtype), cascading t.o.v. andere actieve filters, exclusief de kolom zelf.
  - `getValueSuggestions(uniqueValues, query, limit = UNIQUE_VALUE_SUGGESTION_LIMIT)` → `{ items, totalMatches, truncated }`.

- [ ] **Step 1: Write the failing tests**

Nieuw bestand `src/utils/columnUniqueValues.test.js`:

```js
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
    expect(resultClosed).toEqual(['Acme']);
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
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- columnUniqueValues`
Expected: FAIL — bestand bestaat nog niet.

- [ ] **Step 3: Implementeer**

Nieuw bestand `src/utils/columnUniqueValues.js`:

```js
import { columnUsesNumberSemantics } from './datePeriodColumnUtils';
import { filterItemsByColumnFilters } from './tableViewFilterUtils';

export const UNIQUE_VALUE_SUGGESTION_LIMIT = 100;

/**
 * Berekent de gesorteerde, gededupliceerde unieke waarden voor één kolom, cascading t.o.v. alle
 * andere actieve kolomfilters (zie filterItemsByColumnFilters). Puur client-side over de al
 * geladen `items` — geen backend-call.
 */
export function getUniqueColumnValues(column, items, columns, filterByColumn, datePeriodDisplayModes = {}) {
  const scopedItems = filterItemsByColumnFilters(items, columns, filterByColumn, datePeriodDisplayModes, column?.key);
  const isNumber = columnUsesNumberSemantics(column, datePeriodDisplayModes);
  const seen = new Set();
  const values = [];
  scopedItems.forEach((item) => {
    const raw = item?.values?.[column?.key];
    if (raw === null || raw === undefined || raw === '') return;
    if (isNumber) {
      const num = Number(raw);
      if (!Number.isFinite(num) || seen.has(num)) return;
      seen.add(num);
      values.push(num);
      return;
    }
    const text = String(raw);
    const dedupeKey = text.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    values.push(text);
  });
  values.sort((a, b) => (
    isNumber ? a - b : String(a).localeCompare(String(b), 'nl-NL', { sensitivity: 'base' })
  ));
  return values;
}

/**
 * Filtert een al berekende unieke-waardenlijst op een zoekterm en kapt af op `limit`.
 */
export function getValueSuggestions(uniqueValues, query, limit = UNIQUE_VALUE_SUGGESTION_LIMIT) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const matches = normalizedQuery
    ? uniqueValues.filter((value) => String(value).toLowerCase().includes(normalizedQuery))
    : uniqueValues;
  return {
    items: matches.slice(0, limit),
    totalMatches: matches.length,
    truncated: matches.length > limit,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- columnUniqueValues`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/columnUniqueValues.js src/utils/columnUniqueValues.test.js
git commit -m "feat(po-filter): voeg getUniqueColumnValues/getValueSuggestions toe"
```

---

## Task 6: `handleDraftValueChange` in `usePurchaseOrderSortFilterActions`

**Files:**
- Modify: `src/hooks/usePurchaseOrderSortFilterActions.js`
- Test: `src/hooks/usePurchaseOrderSortFilterActions.test.js` (nieuw bestand — deze hook had nog geen eigen test)

**Interfaces:**
- Produces: `handleDraftValueChange(nextValue)` — zet `draft.value` direct op `nextValue` (string, number, of array), i.p.v. via een DOM `ChangeEvent` zoals `handleValueChange`. Nodig voor de nieuwe picker-component (Task 7), die zelf al de juiste waarde (array voor multi, string voor single) aanlevert i.p.v. een `event`.

- [ ] **Step 1: Write the failing test**

Nieuw bestand `src/hooks/usePurchaseOrderSortFilterActions.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePurchaseOrderSortFilterActions } from './usePurchaseOrderSortFilterActions';

function setup(draft = { operator: 'oneOf', value: [], secondaryValue: '' }) {
  const setDraft = vi.fn((updater) => updater(draft));
  const { result } = renderHook(() => usePurchaseOrderSortFilterActions({
    columnKey: 'vendor',
    draft,
    onSetSortDirection: vi.fn(),
    onSetOperator: vi.fn(),
    onSetValue: vi.fn(),
    onSetSecondaryValue: vi.fn(),
    onApplyFilter: vi.fn(),
    onClearFilter: vi.fn(),
    setDraft,
    setOpen: vi.fn(),
  }));
  return { result, setDraft };
}

describe('usePurchaseOrderSortFilterActions — handleDraftValueChange', () => {
  it('zet draft.value direct op de meegegeven array-waarde', () => {
    const { result, setDraft } = setup();
    act(() => {
      result.current.handleDraftValueChange(['Acme', 'Beta']);
    });
    expect(setDraft).toHaveBeenCalled();
    const updater = setDraft.mock.calls[0][0];
    expect(updater({ operator: 'oneOf', value: [], secondaryValue: '' })).toEqual({
      operator: 'oneOf',
      value: ['Acme', 'Beta'],
      secondaryValue: '',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- usePurchaseOrderSortFilterActions`
Expected: FAIL — `handleDraftValueChange` bestaat niet op het hook-resultaat.

- [ ] **Step 3: Implementeer**

In `src/hooks/usePurchaseOrderSortFilterActions.js`, voeg toe na `handleValueChange`:

```js
  const handleDraftValueChange = useCallback((nextValue) => {
    setDraft((prev) => ({ ...prev, value: nextValue }));
  }, [setDraft]);
```

En voeg toe aan de return-object:

```js
  return {
    setSortAsc,
    setSortDesc,
    clearSort,
    handleOperatorSelect,
    handleValueChange,
    handleDraftValueChange,
    handleSecondaryValueChange,
    handleApplyFilter,
    handleClearFilter,
  };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- usePurchaseOrderSortFilterActions`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePurchaseOrderSortFilterActions.js src/hooks/usePurchaseOrderSortFilterActions.test.js
git commit -m "feat(po-filter): voeg handleDraftValueChange toe voor niet-DOM-event waardes"
```

---

## Task 7: Nieuwe component `PurchaseOrderColumnFilterValuePicker`

**Files:**
- Create: `src/components/supplier/PurchaseOrderColumnFilterValuePicker.jsx`
- Modify: `src/components/supplier/purchaseOrderColumnFilterMenuStyles.js` (nieuwe stijl-keys)
- Test: `src/components/supplier/PurchaseOrderColumnFilterValuePicker.test.jsx`

**Interfaces:**
- Consumes: `getValueSuggestions` (Task 5).
- Produces: default export `PurchaseOrderColumnFilterValuePicker({ styles, mode, value, onChange, uniqueValues, isNumber, columnLabel })`:
  - `mode: 'single' | 'multi'`
  - `value`: `string` (single, `''` = leeg) of `string[]|number[]` (multi)
  - `onChange(nextValue)`: bij `single` een `string`; bij `multi` de volledige nieuwe array
  - `uniqueValues`: array (mag leeg zijn, bv. als de popover nog niet open is geweest)
  - Dit component is puur presentational — geen kennis van `items`/`filterByColumn`.

- [ ] **Step 1: Write the failing tests**

Nieuw bestand `src/components/supplier/PurchaseOrderColumnFilterValuePicker.test.jsx`:

```jsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import PurchaseOrderColumnFilterValuePicker from './PurchaseOrderColumnFilterValuePicker';
import { usePurchaseOrderColumnFilterMenuStyles } from './purchaseOrderColumnFilterMenuStyles';

function Wrapper(props) {
  const styles = usePurchaseOrderColumnFilterMenuStyles();
  return <PurchaseOrderColumnFilterValuePicker styles={styles} columnLabel="Vendor" {...props} />;
}

function renderPicker(props) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <Wrapper {...props} />
    </FluentProvider>
  );
}

describe('PurchaseOrderColumnFilterValuePicker — single mode', () => {
  it('toont de huidige waarde en committeert getypte tekst direct', () => {
    const onChange = vi.fn();
    renderPicker({ mode: 'single', value: '', onChange, uniqueValues: ['Acme', 'Beta'] });
    const input = screen.getByLabelText(/Filter value for Vendor/i);
    fireEvent.change(input, { target: { value: 'Ac' } });
    expect(onChange).toHaveBeenCalledWith('Ac');
  });

  it('toont suggesties die matchen op de getypte tekst en committeert bij klikken', () => {
    const onChange = vi.fn();
    renderPicker({ mode: 'single', value: '', onChange, uniqueValues: ['Acme', 'Beta'] });
    const input = screen.getByLabelText(/Filter value for Vendor/i);
    fireEvent.change(input, { target: { value: 'Ac' } });
    const suggestion = screen.getByRole('option', { name: 'Acme' });
    fireEvent.click(suggestion);
    expect(onChange).toHaveBeenLastCalledWith('Acme');
  });

  it('neemt bij plakken alleen de eerste regel over', () => {
    const onChange = vi.fn();
    renderPicker({ mode: 'single', value: '', onChange, uniqueValues: [] });
    const input = screen.getByLabelText(/Filter value for Vendor/i);
    fireEvent.paste(input, { clipboardData: { getData: () => 'Acme\nBeta\nGamma' } });
    expect(onChange).toHaveBeenCalledWith('Acme');
    expect(screen.getByText(/2 values ignored/i)).toBeTruthy();
  });
});

describe('PurchaseOrderColumnFilterValuePicker — multi mode', () => {
  it('voegt een waarde toe als chip bij Enter en committeert de volledige array', () => {
    const onChange = vi.fn();
    renderPicker({ mode: 'multi', value: ['Acme'], onChange, uniqueValues: [] });
    const input = screen.getByLabelText(/Filter value for Vendor/i);
    fireEvent.change(input, { target: { value: 'Beta' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Acme', 'Beta']);
  });

  it('plakken van een meerregelige lijst voegt in één keer meerdere chips toe', () => {
    const onChange = vi.fn();
    renderPicker({ mode: 'multi', value: [], onChange, uniqueValues: [] });
    const input = screen.getByLabelText(/Filter value for Vendor/i);
    fireEvent.paste(input, { clipboardData: { getData: () => 'Acme\nBeta\n\nAcme' } });
    expect(onChange).toHaveBeenCalledWith(['Acme', 'Beta']);
  });

  it('verwijdert een chip via de x-knop', () => {
    const onChange = vi.fn();
    renderPicker({ mode: 'multi', value: ['Acme', 'Beta'], onChange, uniqueValues: [] });
    const removeButton = screen.getByRole('button', { name: /Remove Acme/i });
    fireEvent.click(removeButton);
    expect(onChange).toHaveBeenCalledWith(['Beta']);
  });

  it('negeert niet-numerieke geplakte regels voor number-kolommen en meldt het aantal', () => {
    const onChange = vi.fn();
    renderPicker({ mode: 'multi', value: [], onChange, uniqueValues: [], isNumber: true });
    const input = screen.getByLabelText(/Filter value for Vendor/i);
    fireEvent.paste(input, { clipboardData: { getData: () => '9226\nn/a\n9227' } });
    expect(onChange).toHaveBeenCalledWith(['9226', '9227']);
    expect(screen.getByText(/1 value ignored/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- PurchaseOrderColumnFilterValuePicker`
Expected: FAIL — bestand bestaat nog niet.

- [ ] **Step 3: Voeg stijlen toe**

In `src/components/supplier/purchaseOrderColumnFilterMenuStyles.js`, voeg toe vlak vóór de
afsluitende `});`:

```js
  pickerWrap: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    width: '100%',
    minWidth: 0,
    position: 'relative',
  },
  pickerChipList: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('4px'),
    width: '100%',
  },
  pickerChip: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    ...shorthands.padding('2px', '4px', '2px', '8px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground2,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    maxWidth: '100%',
  },
  pickerChipLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  pickerChipRemove: {
    minWidth: '14px',
    width: '14px',
    height: '14px',
    ...shorthands.padding('0'),
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  pickerSuggestions: {
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    zIndex: 2,
    maxHeight: '180px',
    overflowY: 'auto',
    boxSizing: 'border-box',
    ...shorthands.padding('4px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow8,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('0'),
  },
  pickerSuggestionOption: {
    justifyContent: 'flex-start',
    minWidth: 'auto',
    width: '100%',
    height: '26px',
    ...shorthands.padding('0', '8px'),
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase300,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  pickerHint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase200,
  },
```

- [ ] **Step 4: Implementeer het component**

Nieuw bestand `src/components/supplier/PurchaseOrderColumnFilterValuePicker.jsx`:

```jsx
import React, { useCallback, useMemo, useState } from 'react';
import { Button, Input, Text } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import { getValueSuggestions } from '../../utils/columnUniqueValues';

function splitPastedLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function dedupeKeyFor(value, isNumber) {
  return isNumber ? String(Number(value)) : String(value).toLowerCase();
}

export default function PurchaseOrderColumnFilterValuePicker({
  styles,
  mode,
  value,
  onChange,
  uniqueValues = [],
  isNumber = false,
  columnLabel,
}) {
  const [inputText, setInputText] = useState('');
  const [ignoredHint, setIgnoredHint] = useState('');
  const isMulti = mode === 'multi';
  const chips = isMulti && Array.isArray(value) ? value : [];

  const suggestions = useMemo(
    () => (inputText.trim() ? getValueSuggestions(uniqueValues, inputText) : { items: [], totalMatches: 0, truncated: false }),
    [uniqueValues, inputText]
  );

  const commitSingleValue = useCallback((nextValue) => {
    setIgnoredHint('');
    onChange(nextValue);
  }, [onChange]);

  const addMultiValues = useCallback((rawCandidates) => {
    let ignoredCount = 0;
    const existingKeys = new Set(chips.map((chip) => dedupeKeyFor(chip, isNumber)));
    const additions = [];
    rawCandidates.forEach((candidate) => {
      if (isNumber && !Number.isFinite(Number(candidate))) {
        ignoredCount += 1;
        return;
      }
      const key = dedupeKeyFor(candidate, isNumber);
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      additions.push(candidate);
    });
    if (additions.length) {
      onChange([...chips, ...additions]);
    }
    setIgnoredHint(ignoredCount > 0 ? `${ignoredCount} value${ignoredCount === 1 ? '' : 's'} ignored — not numeric` : '');
  }, [chips, isNumber, onChange]);

  const handleInputChange = useCallback((event) => {
    const nextText = event.target.value;
    setInputText(nextText);
    if (!isMulti) {
      commitSingleValue(nextText);
    }
  }, [isMulti, commitSingleValue]);

  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (isMulti) {
      if (inputText.trim()) {
        addMultiValues([inputText.trim()]);
        setInputText('');
      }
    }
  }, [addMultiValues, inputText, isMulti]);

  const handlePaste = useCallback((event) => {
    const pastedText = event.clipboardData?.getData('text') || '';
    const lines = splitPastedLines(pastedText);
    if (isMulti) {
      if (lines.length) {
        event.preventDefault();
        addMultiValues(lines);
        setInputText('');
      }
      return;
    }
    if (lines.length > 1) {
      event.preventDefault();
      commitSingleValue(lines[0]);
      setInputText(lines[0]);
      setIgnoredHint(`${lines.length - 1} value${lines.length - 1 === 1 ? '' : 's'} ignored — only the first line is used`);
    }
  }, [addMultiValues, commitSingleValue, isMulti]);

  const handleSuggestionClick = useCallback((suggestionValue) => {
    if (isMulti) {
      addMultiValues([String(suggestionValue)]);
    } else {
      commitSingleValue(String(suggestionValue));
    }
    setInputText('');
  }, [addMultiValues, commitSingleValue, isMulti]);

  const handleRemoveChip = useCallback((index) => {
    onChange(chips.filter((_, chipIndex) => chipIndex !== index));
  }, [chips, onChange]);

  return (
    <div className={styles.pickerWrap}>
      <Input
        className={styles.filterValueField}
        size="small"
        value={isMulti ? inputText : (inputText || value || '')}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={isMulti ? 'Type a value or paste a list' : 'Value'}
        aria-label={`Filter value for ${columnLabel}`}
      />
      {suggestions.items.length ? (
        <div className={styles.pickerSuggestions} role="listbox" aria-label={`Suggestions for ${columnLabel}`}>
          {suggestions.items.map((suggestion) => (
            <Button
              key={String(suggestion)}
              className={styles.pickerSuggestionOption}
              appearance="transparent"
              size="small"
              role="option"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {String(suggestion)}
            </Button>
          ))}
          {suggestions.truncated ? (
            <Text className={styles.pickerHint}>
              {`Showing ${suggestions.items.length} of ${suggestions.totalMatches} — refine your search to see more`}
            </Text>
          ) : null}
        </div>
      ) : null}
      {isMulti && chips.length ? (
        <div className={styles.pickerChipList}>
          {chips.map((chip, index) => (
            <span key={`${dedupeKeyFor(chip, isNumber)}-${index}`} className={styles.pickerChip}>
              <span className={styles.pickerChipLabel}>{String(chip)}</span>
              <Button
                className={styles.pickerChipRemove}
                appearance="transparent"
                size="small"
                icon={<DismissRegular />}
                aria-label={`Remove ${chip}`}
                onClick={() => handleRemoveChip(index)}
              />
            </span>
          ))}
        </div>
      ) : null}
      {ignoredHint ? <Text className={styles.pickerHint}>{ignoredHint}</Text> : null}
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- PurchaseOrderColumnFilterValuePicker`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/supplier/PurchaseOrderColumnFilterValuePicker.jsx src/components/supplier/PurchaseOrderColumnFilterValuePicker.test.jsx src/components/supplier/purchaseOrderColumnFilterMenuStyles.js
git commit -m "feat(po-filter): nieuw PurchaseOrderColumnFilterValuePicker component"
```

---

## Task 8: Data doorgeven — `items`, `allFilters`, unieke waarden lazy berekenen

**Files:**
- Modify: `src/components/supplier/PurchaseOrdersBoardTable.jsx:243-293` (call naar `PurchaseOrdersBoardHeaderRow`)
- Modify: `src/components/supplier/PurchaseOrdersBoardHeaderRow.jsx` (nieuwe props + doorgeven aan `PurchaseOrderColumnFilterMenu`)
- Modify: `src/components/supplier/PurchaseOrderColumnFilterMenu.jsx` (nieuwe props + lazy `useMemo` voor `uniqueColumnValues`)
- Modify: `src/components/supplier/PurchaseOrderColumnFilterMenuPopoverContent.jsx` (doorgeven `uniqueColumnValues`)
- Modify: `src/components/supplier/PurchaseOrderColumnFilterMenuMainPane.jsx` (doorgeven `uniqueColumnValues`)
- Test: `src/components/supplier/PurchaseOrderColumnFilterMenu.test.jsx`

**Interfaces:**
- Consumes: `getUniqueColumnValues` (Task 5).
- Produces: `PurchaseOrderColumnFilterMenuFilterSection` ontvangt een nieuwe prop `uniqueColumnValues: (string|number)[]` — leeg zolang de popover niet open is geweest (lazy).

- [ ] **Step 1: Write the failing test**

Voeg toe aan `src/components/supplier/PurchaseOrderColumnFilterMenu.test.jsx` (nieuw `describe`-blok):

```jsx
describe('PurchaseOrderColumnFilterMenu — unieke waarden', () => {
  it('berekent uniqueColumnValues pas nadat de popover is geopend', async () => {
    const items = [
      { values: { amount: 100 } },
      { values: { amount: 250 } },
      { values: { amount: 100 } },
    ];
    renderMenu({ items, filter: { operator: 'oneOf', value: [] } });
    openColumnMenu();
    const input = await screen.findByLabelText(/Filter value for Amount/i);
    fireEvent.change(input, { target: { value: '1' } });
    const suggestion = await screen.findByRole('option', { name: '100' });
    expect(suggestion).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- PurchaseOrderColumnFilterMenu`
Expected: FAIL — `items` wordt nog niet gebruikt/doorgegeven; het filterveld toont nog het oude
plain-text `Input` zonder suggesties.

- [ ] **Step 3: Implementeer — `PurchaseOrderColumnFilterMenu.jsx`**

Voeg de import toe:

```js
import { getUniqueColumnValues } from '../../utils/columnUniqueValues';
```

Voeg een module-level constante toe (stabiele referentie, voorkomt onnodige re-renders):

```js
const EMPTY_UNIQUE_VALUES = [];
```

Voeg nieuwe props toe aan de destructuring (met defaults, zodat bestaande call-sites/tests zonder
deze props blijven werken):

```js
  items = [],
  allFilters = {},
  allDatePeriodDisplayModes = {},
```

Voeg na de bestaande `operatorEntries`-`useMemo` een nieuwe `useMemo` toe die de unieke waarden
lazy berekent (alleen als de popover open is, en niet voor date-kolommen):

```js
  const uniqueColumnValues = useMemo(() => {
    if (!open || isDate) return EMPTY_UNIQUE_VALUES;
    return getUniqueColumnValues(column, items, referenceColumns, allFilters, allDatePeriodDisplayModes);
  }, [open, isDate, column, items, referenceColumns, allFilters, allDatePeriodDisplayModes]);
```

Geef `uniqueColumnValues` door aan `PurchaseOrderColumnFilterMenuPopoverContent` (in de bestaande
grote prop-lijst, bij de andere filter-gerelateerde props):

```jsx
        isDate={isDate} isNumber={isNumber} draft={draft} operatorLabels={operatorLabels} operatorEntries={operatorEntries} handleOperatorSelect={handleOperatorSelect} handleValueChange={handleValueChange}
        handleDraftValueChange={handleDraftValueChange}
        uniqueColumnValues={uniqueColumnValues}
        handleSecondaryValueChange={handleSecondaryValueChange} handleApplyFilter={handleApplyFilter} handleClearFilter={handleClearFilter} colorFilter={colorFilter} handleAddType={handleAddType}
```

Haal `handleDraftValueChange` mee uit de `usePurchaseOrderSortFilterActions`-destructuring (regel
184 in het huidige bestand):

```js
  const { setSortAsc, setSortDesc, clearSort, handleOperatorSelect, handleValueChange, handleDraftValueChange, handleSecondaryValueChange, handleApplyFilter, handleClearFilter } = usePurchaseOrderSortFilterActions({
```

- [ ] **Step 4: Implementeer — `PurchaseOrderColumnFilterMenuPopoverContent.jsx` en `PurchaseOrderColumnFilterMenuMainPane.jsx`**

In `PurchaseOrderColumnFilterMenuPopoverContent.jsx`: voeg `handleDraftValueChange` en
`uniqueColumnValues` toe aan de props-destructuring, en geef ze door aan `FilterMenuMainPane`
(naast de bestaande `handleValueChange`):

```jsx
        handleValueChange={handleValueChange}
        handleDraftValueChange={handleDraftValueChange}
        uniqueColumnValues={uniqueColumnValues}
```

In `PurchaseOrderColumnFilterMenuMainPane.jsx`: voeg dezelfde twee props toe aan de
props-destructuring en geef ze door aan `PurchaseOrderColumnFilterMenuFilterSection`:

```jsx
            handleValueChange={handleValueChange}
            handleDraftValueChange={handleDraftValueChange}
            uniqueColumnValues={uniqueColumnValues}
```

- [ ] **Step 5: Implementeer — thread `items`/`allFilters`/`allDatePeriodDisplayModes` van board naar menu**

In `src/components/supplier/PurchaseOrdersBoardHeaderRow.jsx`: voeg `items = []` toe aan de
props-destructuring, en geef `items`, `filterByColumn` (al aanwezig als prop) en
`datePeriodDisplayModes` (al aanwezig) door aan `PurchaseOrderColumnFilterMenu` onder de nieuwe
namen:

```jsx
                <PurchaseOrderColumnFilterMenu
                column={column}
                filter={filterByColumn[column.key]}
                items={items}
                allFilters={filterByColumn}
                allDatePeriodDisplayModes={datePeriodDisplayModes}
                sortState={sortState}
```

In `src/components/supplier/PurchaseOrdersBoardTable.jsx`: geef `items` door aan
`PurchaseOrdersBoardHeaderRow` (items is al gedestructureerd uit `data` op regel 24):

```jsx
            <PurchaseOrdersBoardHeaderRow
            styles={styles}
            selection={selection}
            onSetExpansion={handleSetExpansion}
            items={items}
            productImageColumnVisible={productImageColumnVisible}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- PurchaseOrderColumnFilterMenu`
Expected: PASS

Run ook de bredere board-tests om te bevestigen dat de nieuwe props met defaults geen bestaande
renders breken:
Run: `npm test -- PurchaseOrdersBoardTable`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/supplier/PurchaseOrdersBoardTable.jsx src/components/supplier/PurchaseOrdersBoardHeaderRow.jsx src/components/supplier/PurchaseOrderColumnFilterMenu.jsx src/components/supplier/PurchaseOrderColumnFilterMenuPopoverContent.jsx src/components/supplier/PurchaseOrderColumnFilterMenuMainPane.jsx src/components/supplier/PurchaseOrderColumnFilterMenu.test.jsx
git commit -m "feat(po-filter): thread items/filters door naar filtermenu, bereken unieke waarden lazy"
```

---

## Task 9: Picker inzetten in `PurchaseOrderColumnFilterMenuFilterSection`

**Files:**
- Modify: `src/components/supplier/PurchaseOrderColumnFilterMenuFilterSection.jsx`
- Test: `src/components/supplier/PurchaseOrderColumnFilterMenu.test.jsx`

**Interfaces:**
- Consumes: `PurchaseOrderColumnFilterValuePicker` (Task 7), `handleDraftValueChange` en `uniqueColumnValues` (Task 8, al doorgegeven t/m deze component na Task 8 Step 4).
- Produces: voor `operator === 'equals'` of `operator === 'oneOf'` op elke niet-date kolom (text/status/select/number) wordt de picker getoond i.p.v. het plain-text `Input`. Overige operatoren (`contains`, `startsWith`, date-operatoren, `between`, `gt`/`lt`/etc.) blijven ongewijzigd hun bestaande `Input`.

- [ ] **Step 1: Write the failing tests**

Voeg toe aan `src/components/supplier/PurchaseOrderColumnFilterMenu.test.jsx`:

```jsx
describe('PurchaseOrderColumnFilterMenu — value picker wiring', () => {
  it('toont de picker (met chips) voor oneOf op een tekstkolom', async () => {
    renderMenu({
      column: { key: 'vendor', label: 'Vendor', dataType: 'text' },
      filter: { operator: 'oneOf', value: ['Acme'] },
    });
    openColumnMenu();
    expect(await screen.findByText('Acme')).toBeTruthy();
    expect(await screen.findByRole('button', { name: /Remove Acme/i })).toBeTruthy();
  });

  it('toont een plain input voor contains (ongewijzigd)', async () => {
    renderMenu({
      column: { key: 'vendor', label: 'Vendor', dataType: 'text' },
      filter: { operator: 'contains', value: 'Ac' },
    });
    openColumnMenu();
    const input = await screen.findByLabelText(/Filter value for Vendor/i);
    expect(input).toHaveValue('Ac');
  });

  it('toont de single-value picker voor equals op een number-kolom', async () => {
    renderMenu({ filter: { operator: 'equals', value: '100' } });
    openColumnMenu();
    const input = await screen.findByLabelText(/Filter value for Amount/i);
    expect(input).toHaveValue('100');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- PurchaseOrderColumnFilterMenu`
Expected: FAIL — `equals`/`oneOf` renderen nog het oude plain `Input`, dat geen chips/`Remove
Acme`-knop heeft.

- [ ] **Step 3: Implementeer**

In `src/components/supplier/PurchaseOrderColumnFilterMenuFilterSection.jsx`, importeer de nieuwe
picker en voeg de nieuwe props toe aan de destructuring:

```jsx
import PurchaseOrderColumnFilterValuePicker from './PurchaseOrderColumnFilterValuePicker';
```

```jsx
  handleValueChange,
  handleDraftValueChange,
  uniqueColumnValues = [],
  handleSecondaryValueChange,
```

Bereken vlak vóór `showSingleValue` of dit een "picker-operator" is:

```js
  const usesValuePicker = draft.operator === 'equals' || draft.operator === 'oneOf';
```

Vervang het blok dat momenteel de drie los-gebonden `Input`-varianten rendert voor
number/tekst-waarden (de blokken op regel 102-112 en 113-122 in het huidige bestand) door: eerst
de picker-tak, dan de bestaande number-/tekst-Input-blokken alleen nog voor de overige operatoren:

```jsx
        {usesValuePicker ? (
          <PurchaseOrderColumnFilterValuePicker
            styles={styles}
            mode={draft.operator === 'oneOf' ? 'multi' : 'single'}
            value={draft.value}
            onChange={handleDraftValueChange}
            uniqueValues={uniqueColumnValues}
            isNumber={isNumber}
            columnLabel={columnLabel}
          />
        ) : null}
        {!usesValuePicker && showSingleValue && isDate && (draft.operator === 'before' || draft.operator === 'after') ? (
          <Input
            className={styles.filterValueField}
            type="date"
            size="small"
            value={draft.value}
            onChange={handleValueChange}
            aria-label={`Filter value for ${columnLabel}`}
          />
        ) : null}
        {!usesValuePicker && showSingleValue && isDate && (draft.operator === 'inNextWeeks' || draft.operator === 'inNextDays') ? (
          <Input
            className={styles.filterValueField}
            type="number"
            size="small"
            min={1}
            value={draft.value}
            onChange={handleValueChange}
            placeholder="Amount"
            aria-label={`Filter amount for ${columnLabel}`}
          />
        ) : null}
        {!usesValuePicker && showSingleValue && isNumber && draft.operator !== 'between' ? (
          <Input
            className={styles.filterValueField}
            type="number"
            size="small"
            value={draft.value}
            onChange={handleValueChange}
            placeholder="Value"
            aria-label={`Filter value for ${columnLabel}`}
          />
        ) : null}
        {!usesValuePicker && showSingleValue && !isDate && !isNumber ? (
          <Input
            className={styles.filterValueField}
            size="small"
            value={draft.value}
            onChange={handleValueChange}
            placeholder="Value"
            aria-label={`Filter value for ${columnLabel}`}
          />
        ) : null}
```

De `placeholder={draft.operator === 'oneOf' ? 'Value1, Value2' : 'Value'}` op de oude tekst-`Input`
kan vereenvoudigd worden naar altijd `'Value'`, want `oneOf` gaat nooit meer via dit `Input`-pad
(de picker vangt die operator af vóór dit blok).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- PurchaseOrderColumnFilterMenu`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/supplier/PurchaseOrderColumnFilterMenuFilterSection.jsx src/components/supplier/PurchaseOrderColumnFilterMenu.test.jsx
git commit -m "feat(po-filter): zet PurchaseOrderColumnFilterValuePicker in voor equals/oneOf"
```

---

## Task 10: Regressietests + handmatige verificatie + `/check-ui`

**Files:**
- Modify: `src/hooks/usePurchaseOrderTableView.test.js` (nieuw regressiegeval)
- No new source files

**Interfaces:**
- Geen nieuwe interfaces — dit task verifieert de volledige keten end-to-end en sluit de
  kwaliteitspoort-verplichting af (`.cursor/rules/kwaliteitspoort.mdc`: 3+ UI-bestanden gewijzigd
  → escaleer naar `ui-design-review`).

- [ ] **Step 1: Write the failing regression test**

Voeg toe aan `src/hooks/usePurchaseOrderTableView.test.js` (zoek het bestaande `describe`-blok voor
`usePurchaseOrderTableView` en voeg een nieuw geval toe):

```js
it('filtert correct op een legacy oneOf-komma-string uit een opgeslagen view (backward compat)', () => {
  const columns = [{ key: 'vendor', dataType: 'text', label: 'Vendor' }];
  const items = [
    { values: { vendor: 'Acme' } },
    { values: { vendor: 'Beta' } },
    { values: { vendor: 'Gamma' } },
  ];
  const { result } = renderHook(() => usePurchaseOrderTableView({ items, columns }));

  act(() => {
    result.current.applyState({
      filterByColumn: { vendor: { operator: 'oneOf', value: 'Acme,Gamma' } },
    });
  });

  expect(result.current.processedItems.map((item) => item.values.vendor)).toEqual(['Acme', 'Gamma']);
  expect(result.current.filterByColumn.vendor.value).toEqual(['Acme', 'Gamma']);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- usePurchaseOrderTableView`
Expected: FAIL als Task 1 nog niet correct is doorgevoerd in `resolveFilterModel` (die
`applyState` gebruikt) — bevestigt dat de backward-compat-migratie ook via het echte
board-viewpad werkt, niet alleen via de losse util-tests.

- [ ] **Step 3: Run de volledige testsuite**

Run: `npm test`
Expected: PASS — inclusief dit nieuwe geval (geen implementatiewijziging nodig als Task 1-9 correct
zijn uitgevoerd; dit is een end-to-end verificatiestap).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePurchaseOrderTableView.test.js
git commit -m "test(po-filter): regressietest voor legacy oneOf-komma-string via applyState"
```

- [ ] **Step 5: Handmatige verificatie in de browser**

Start de app lokaal (`npm run dev:all`), open het PO-board, en verifieer op minstens één
tekstkolom (bv. leverancier) en één number-kolom (bv. bedrag):
1. "is exactly" → typen toont suggesties, klikken op een suggestie vult het veld, Apply filtert.
2. "is one of" → typen + Enter voegt een chip toe; een kolom met waarden uit Excel plakken (meerdere
   regels) voegt in één keer meerdere chips toe; een chip verwijderen met de x-knop werkt; Apply
   filtert op alle overgebleven chips.
3. Cascading: zet eerst een filter op een andere kolom, open daarna de picker van een tweede kolom
   — de suggesties tonen alleen waarden die nog voorkomen gegeven het eerste filter.
4. Een opgeslagen view met een oude `oneOf`-komma-string (indien beschikbaar) laadt en filtert nog
   correct.

- [ ] **Step 6: UI design review**

Dit werk raakt 3+ UI-bestanden en introduceert een nieuw invoerpatroon (chip/combobox). Volg de
kwaliteitspoort-regel en escaleer naar de `ui-design-review`-skill (`/check-ui`) voordat dit naar
een PR gaat.

---

## Self-review notes

- **Spec coverage**: alle spec-secties (UX equals/oneOf, cascading, limiet 100, numerieke
  validatie bij plakken, array-datamodel + backward compat, geen backend-wijziging, `colorIs`
  ongemoeid, date-kolommen buiten scope) zijn gedekt door Task 1–9; Task 10 sluit af met
  end-to-end-regressie en de verplichte UI-review.
- **Type consistency**: `draft.value` is voor `oneOf` overal een array (`getDraftFromFilter`,
  `resolveFilterModel`, `applyColumnFilter`, de picker-component); voor `equals` overal een string.
  `handleDraftValueChange(nextValue)` is de enige plek die `draft.value` direct zet zonder
  DOM-event, gebruikt door zowel single- als multi-mode van de picker.
- **Bekende, bewuste scope-beperking**: cascading-suggesties respecteren geen `colorIs`-kleurfilters
  op andere kolommen (zie Task 3) — expliciet vermeld in het Global Constraints-blok, niet per
  ongeluk vergeten.
