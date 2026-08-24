# Live history-hoekje na celwijziging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Na een geslaagde celwijziging op het PO-board verschijnt het bestaande history-hoekje meteen, zonder page refresh of extra netwerkcall.

**Architecture:** Optimistic patch van `historyByColumnId` in dezelfde state-update als de nieuwe celwaarde. Nieuwe pure helper `withHistoryFlag` (zelfde patroon als `withRightmostMarkRed`). Rollback van waarde én vlag via de bestaande `previousOrders` / `previousLines`. UI, popover, server en auth blijven ongewijzigd.

**Tech Stack:** React 18, Vitest, bestaande `saveValue` / `correctField` in `usePurchaseOrdersPage.js`.

**Spec:** `docs/specs/2026-08-24-live-cell-history-fold-design.md`

**Work item:** #AB:267

## Global Constraints

- Geen extra `apiRequest`, geen board-herlaad, geen history-API na save.
- Geen wijziging aan `CellHistoryPopover`, board-read, `saveCustomValue` / `correctField` op de server, auth of write-back-rechten.
- Key-vorm: `String(columnId)`, gelijk aan `buildHistoryByCell` in `server/services/TableDataService.js`.
- Muteer de input-map niet. Als de vlag al `true` is: dezelfde map-referentie terug.
- UI-teksten Engels; helper zelf heeft geen UI-strings.
- Footer PATCH +1 in `src/config/version.js` (nu `v1.51.45` → `v1.51.46`).
- Geen migratie, geen nieuw endpoint.
- `usePurchaseOrdersPage.js` is al >300 regels; helper gaat naar `src/utils/` zodat de hook niet groeit met testduplicatie. Geen splitsing van de hook in deze feature.

---

### Task 1: Pure helper `withHistoryFlag` + unit tests

**Files:**
- Create: `src/utils/withHistoryFlag.js`
- Create: `src/utils/withHistoryFlag.test.js`

**Interfaces:**
- Consumes: niets (pure functie)
- Produces: `withHistoryFlag(existing, columnId) → Record<string, boolean>`
  - `existing`: `Record<string, boolean> | null | undefined`
  - `columnId`: `string | number`
  - Zet `String(columnId)` op `true`
  - Ontbrekende/lege map → nieuw object `{ [colKey]: true }`
  - Bestaande andere kolommen blijven staan
  - Als `existing[colKey] === true`: dezelfde referentie terug (geen nieuwe map)

- [ ] **Step 1: Write the failing tests**

```js
import { describe, expect, it } from 'vitest';
import { withHistoryFlag } from './withHistoryFlag';

describe('withHistoryFlag', () => {
  it('zet de kolomvlag op true bij een ontbrekende map', () => {
    expect(withHistoryFlag(undefined, 11)).toEqual({ 11: true });
    expect(withHistoryFlag(null, '11')).toEqual({ 11: true });
  });

  it('behoudt bestaande andere kolommen', () => {
    const existing = { 11: true };
    expect(withHistoryFlag(existing, 12)).toEqual({ 11: true, 12: true });
    expect(existing).toEqual({ 11: true });
  });

  it('geeft dezelfde referentie terug als de vlag al true is', () => {
    const existing = { 11: true, 12: true };
    expect(withHistoryFlag(existing, 11)).toBe(existing);
    expect(withHistoryFlag(existing, '11')).toBe(existing);
  });

  it('normaliseert number- en string-ids naar dezelfde sleutel', () => {
    expect(withHistoryFlag({}, 21)).toEqual({ 21: true });
    expect(withHistoryFlag({}, '21')).toEqual({ 21: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/withHistoryFlag.test.js`
Expected: FAIL — module `./withHistoryFlag` not found

- [ ] **Step 3: Write minimal implementation**

```js
/**
 * Optimistic history-flag: mark a column as having cell history without mutating input.
 * @param {Record<string, boolean>|null|undefined} existing
 * @param {string|number} columnId
 * @returns {Record<string, boolean>}
 */
export function withHistoryFlag(existing, columnId) {
  const colKey = String(columnId);
  if (existing && existing[colKey] === true) return existing;
  return { ...(existing || {}), [colKey]: true };
}
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `npx vitest run src/utils/withHistoryFlag.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/withHistoryFlag.js src/utils/withHistoryFlag.test.js
git commit -m "feat: add withHistoryFlag helper for live cell-history fold #AB:267"
```

---

### Task 2: Helper inpluggen in de vier optimistic patches

**Files:**
- Modify: `src/hooks/usePurchaseOrdersPage.js` (import + vier patches in `saveValue` en `correctField`)

**Interfaces:**
- Consumes: `withHistoryFlag(existing, columnId)` uit Task 1
- Produces: optimistic rows met `historyByColumnId` gezet in dezelfde objectliteral als `values` en `trackMarksByColumnId`

Vier patches (save line, save header, correct line, correct header). Zelfde plek als `withRightmostMarkRed`. Rollback blijft via `previousOrders` / `previousLines` — geen extra rollback-logica.

- [ ] **Step 1: Add import**

Na de bestaande `clearUnseenChangeFlags`-import:

```js
import { withHistoryFlag } from '../utils/withHistoryFlag';
```

- [ ] **Step 2: Patch saveValue line-branch**

In de `applyLineValues`-callback van `saveValue`, naast `trackMarksByColumnId`:

```js
historyByColumnId: withHistoryFlag(line.historyByColumnId, columnId),
```

- [ ] **Step 3: Patch saveValue header-branch**

In de `setOrders`-map van `saveValue`, naast `trackMarksByColumnId`:

```js
historyByColumnId: withHistoryFlag(order.historyByColumnId, columnId),
```

- [ ] **Step 4: Patch correctField line-branch**

Zelfde regel in de `applyLineValues`-callback van `correctField`.

- [ ] **Step 5: Patch correctField header-branch**

Zelfde regel in de `setOrders`-map van `correctField`.

- [ ] **Step 6: Run helper tests (geen hook-test vereist)**

Run: `npx vitest run src/utils/withHistoryFlag.test.js`
Expected: PASS. Geen extra `apiRequest`. `applyFormulaValuesToOrder` overschrijft alleen `values`; de history-vlag blijft staan.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/usePurchaseOrdersPage.js
git commit -m "feat: show history fold immediately after cell save #AB:267"
```

---

### Task 3: Versie, dev-testchecklist

**Files:**
- Modify: `src/config/version.js` — `v1.51.45` → `v1.51.46`
- Modify: `src/config/devTestItems.js` — checklist-item voor #267

- [ ] **Step 1: Bump version**

```js
export const APP_VERSION = 'v1.51.46';
```

- [ ] **Step 2: Add preview/dev checklist item**

In `devTestItems.js`, vervang de lege array door:

```js
export const devTestItems = [
  {
    id: 267,
    title: 'Live history fold after cell edit',
    checks: [
      'Edit a cell that had no history fold: the fold appears without page refresh',
      'Click the fold: existing history popover opens',
      'Force a failed save: value and fold roll back together',
      'History indicators off: no fold after save',
      'Cell that already had a fold: fold stays visible',
    ],
  },
];
```

- [ ] **Step 3: Run helper tests**

Run: `npx vitest run src/utils/withHistoryFlag.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/config/version.js src/config/devTestItems.js .cursor/plans/2026-08-24-live-cell-history-fold.plan.md
git commit -m "chore: bump version and add #AB:267 preview checks"
```

---

## Self-review

1. Spec coverage: live hoekje (T2), zelfde render als waarde (T2), popover ongewijzigd, rollback via bestaande previous-state (T2), geen extra call (T2), indicators-toggle ongewijzigd (UI leest `showHistoryIndicators`), al-true referentie (T1), helper-tests (T1), versie (T3).
2. Geen placeholders.
3. Signature `withHistoryFlag(existing, columnId)` consistent in T1 en T2.
