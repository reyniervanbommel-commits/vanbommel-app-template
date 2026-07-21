# perf-board-actions — reference

## priorityScore

```
J7: (filterApplyMs − targetFilterMs) × poBoardWeight
J8: (textStyleApplyMs − targetStyleMs) × poBoardWeight
```

Default targets: 30% reductie t.o.v. baseline (policy `boardActionTargets`).

## Backlog IDs

| ID | Journey |
|----|---------|
| BL-005 | J7 — column filter Apply |
| BL-006 | J8 — text style Bold toggle |

## Stabiliteit detectie (Playwright)

Na actie: poll tot 2 s — geen `[perf] longframe` met `blocking >= 50` in laatste 300 ms.

## Admin vereist

J8 vereist `canSetColumnTextStyle` — gebruik admin-account (`TEST_LOGIN_EMAIL`).

## schema journey enum

J7, J8 toegevoegd in `test-reports/schemas/perf-backlog.schema.json`.
