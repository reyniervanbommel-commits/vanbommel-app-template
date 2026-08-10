# TypeScript-migratie — fase 1+2 (getypeerd API-contract) (DevOps)

**Doel:** Zet de TypeScript-tooling aan (`checkJs`) en typ het gedeelde API-contract tussen frontend en backend, zodat contractfouten vóór runtime worden gevangen — zonder de volledige codebase te migreren.
**Referentie in repo:** [.cursor/plans/dev_2026-08-09-typescript-migratie-fase1-2.plan.md](../../../.cursor/plans/dev_2026-08-09-typescript-migratie-fase1-2.plan.md) (globale Cursor-plans map)
**Tags:** typescript; type-safety; tooling; tech-debt
**Work item:** User Story #AB:237, child van Feature #AB:142 (Architectuur- & tech-debt-verbeteringen)

---

## User story

**Als** developer op dit team
**wil ik** dat de gedeelde API-datacontracten (board, columns, rows, auth) en de basis-typecheck zijn ingericht
**zodat** contractfouten tussen frontend en backend vóór runtime worden gevangen door `npm run typecheck`.

---

## Acceptatiecriteria (definitie van "klaar")

1. `@types/react`, `@types/react-dom` (frontend) en `@types/express`, `@types/express-session`, `@types/cors`, `@types/compression`, `@types/multer`, `@types/bcrypt`, `@types/qrcode` (backend) zijn geïnstalleerd als devDependency.
2. `checkJs: true` staat in `tsconfig.frontend.json` en `tsconfig.backend.json`; `npm run typecheck` draait zonder crash. Het aantal resterende errors (indien >0) staat gedocumenteerd in de PR-beschrijving als bekend startpunt.
3. `src/types/` bestaat met minstens `TableRow`, `ColumnDefinition`, `BoardPayload`, `ApiResponse<T>`, `UserSession`, `AuthUser`.
4. `apiRequest` in `src/utils/api.js` is omgezet naar `apiRequest<T>(path, options): Promise<T>` en minstens 3 bestaande call-sites gebruiken een expliciet type-argument.
5. ESLint-config bevat `@typescript-eslint`-parser/plugin.
6. CI voert `npm run typecheck` uit (nieuw toegevoegd als het nog ontbrak).

**Niet van toepassing:** SQL-migratie (geen schemawijziging), browser-test (geen UI-effect — verificatie via `npm run typecheck` + `npm test`), versie-ophoging/devTestItem (niet user-facing).

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| tsconfig-scaffold (base/frontend/backend), `strict: true` op base-niveau | [tsconfig.base.json](../../tsconfig.base.json), [tsconfig.frontend.json](../../tsconfig.frontend.json), [tsconfig.backend.json](../../tsconfig.backend.json) |
| `typecheck`-scripts | [package.json](../../package.json) (`typecheck`, `typecheck:frontend`, `typecheck:backend`) |
| `typescript` devDependency (`^5.9.2`) | [package.json](../../package.json) |

---

## Expliciet buiten scope

Volledige migratie van alle 448 bestanden naar `.ts`/`.tsx` (de bredere fase 3-5 uit de oorspronkelijke analyse) is **bewust niet gepland** als vervolgstory:
- Er is geen concreet incident of bug die door het ontbreken van types is veroorzaakt.
- Een langlopende bestandssweep conflicteert continu met actieve feature/perf-branches die dezelfde bestanden aanraken (o.a. de PO-board-hooks en `TableDataService.js`).

**Alternatief, opportunistisch (geen aparte story):** nieuwe bestanden worden voortaan als `.ts`/`.tsx` aangemaakt; bestaande bestanden migreren alleen als ze toch al door een feature/refactor-story worden aangeraakt.

**Los, later traject:** het splitsen van `usePurchaseOrdersPage.js` (1317 regels) en `TableDataService.js` (4888 regels) naar bestanden ≤300 regels — via de `refactor-opdracht`-skill, pas na afronding van het actieve perf-backlog (BL-004/BL-005/BL-006) om conflicten te vermijden. Geen onderdeel van deze story.

---

## Backlog — tasks

- [ ] `@types/*`-pakketten installeren (frontend + backend, zie lijst hierboven)
- [ ] `@typescript-eslint`-parser/plugin toevoegen aan de ESLint-config
- [ ] `checkJs: true` zetten in `tsconfig.frontend.json` + `tsconfig.backend.json`; typecheck-foutenaantal documenteren (override `noImplicitAny: false` toegestaan als tussenstap, expliciet benoemd als bekende schuld)
- [ ] CI-stap toevoegen/verifiëren die `npm run typecheck` afdwingt
- [ ] `src/types/` aanmaken met `TableRow`, `ColumnDefinition`, `BoardPayload`, `ApiResponse<T>`, `UserSession`, `AuthUser`
- [ ] `apiRequest<T>()` typen in `src/utils/api.js` + minstens 3 call-sites bijwerken met expliciet type-argument

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-08-09-typescript-migratie-fase1-2.plan.md](../../../.cursor/plans/dev_2026-08-09-typescript-migratie-fase1-2.plan.md); wijzig dit bestand bij nieuwe afspraken.

Repo-document: `docs/devops/237-typescript-migratie-fase1-2.md`
