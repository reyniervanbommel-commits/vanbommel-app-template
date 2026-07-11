# Implementatieplan — Test suite + skills (integraal) (DevOps)

**Doel:** Na elke feature reproduceerbaar testen via vier lagen (Vitest, API golden paths, Playwright E2E, devTestItems + testrapport), CI-gates op PR's, en bijgewerkte skills gekoppeld aan develop-from-devops.
**Referentie in repo:** [.cursor/plans/dev_2026-07-11-test-suite-en-skills.plan.md](../../.cursor/plans/dev_2026-07-11-test-suite-en-skills.plan.md)
**Tags:** testing; CI; playwright; vitest; skills; develop-from-devops

---

## User story

**Als** ontwikkelaar of agent die features bouwt in de Vendor-App
**wil ik** een vast testraamwerk (unit, API, E2E, acceptatie) met CI-gates en skills
**zodat** elke toekomstige feature automatisch de juiste test-artefacten oplevert en broken code niet naar develop kan

---

## Acceptatiecriteria (definitie van "klaar")

1. Elke PR naar `develop` triggert `npm test` + `npm run build` in CI (`ci.yml`).
2. `npm run test:e2e:smoke` bestaat en draait lokaal en tegen preview/DEV.
3. Template + skills voor feature-specs bestaan (`run-feature-tests`, `create-feature-test-spec`).
4. `develop-from-devops` vereist test-stappen (5b, 5c, 7) vóór PR.
5. `devTestItems.js` + testrapport blijven onderdeel van OTAP.
6. `docs/guides/TESTING.md` beschrijft de volledige flow.
7. Minimaal 3 bestaande features hebben een Playwright feature-spec (backfill).
8. Geen nieuwe `playwright/live-*.js` voor nieuwe features.

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| Vitest-basis (160 tests) | `**/*.test.js` |
| Browser-test skill | `.cursor/skills/browser-feature-test/` |
| DEV-checklist | `src/config/devTestItems.js` |
| OTAP-flow | `.cursor/skills/develop-from-devops/` |
| Integraal plan | `.cursor/plans/dev_2026-07-11-test-suite-en-skills.plan.md` |
| Ad-hoc Playwright script | `playwright/live-conditional-formatting.js` |

---

## Architectuur (samenvatting)

| Laag | Inhoud | Tool |
|------|--------|------|
| L1 | Unit + API golden paths | Vitest + supertest |
| L2 | CI-gate op PR | `ci.yml` |
| L3 | Smoke + feature-specs | Playwright |
| L4 | devTestItems + testrapport | Handmatig + agent |

---

## Backlog — child User Stories

### Story A: Fase A — Fundament (CI + skills + rule)

**Beschrijving:** Hoogste ROI: CI-gate, testing rule, nieuwe skills skeleton, develop-from-devops update, TESTING.md skeleton.
**Acceptatiecriteria:**
1. `.github/workflows/ci.yml` draait `npm ci`, `npm test`, `npm run build` op PR naar develop/main.
2. `.cursor/rules/testing.mdc` beschrijft merge-regel test-artefacten.
3. Skills `run-feature-tests` en `create-feature-test-spec` bestaan in `.cursor/skills/` en `.claude/skills/`.
4. `develop-from-devops` beschrijft stap 5b (tests schrijven) en 5c (lokaal verifiëren).
5. `docs/guides/TESTING.md` skeleton bestaat.

### Story B: Fase B — Playwright E2E

**Beschrijving:** Formele Playwright-suite met config, auth-fixture, smoke specs en feature-template.
**Acceptatiecriteria:**
1. `@playwright/test` geïnstalleerd; scripts `test:e2e`, `test:e2e:smoke`, `test:e2e:feature` in package.json.
2. `playwright/playwright.config.js` + `fixtures/auth.js` werkend.
3. Vier smoke specs in `playwright/smoke/` (app-loads, board-read, admin-datamodel, health).
4. `playwright/features/_template.spec.js` bestaat.
5. `live-conditional-formatting.js` gemigreerd naar `features/conditional-formatting.spec.js`.
6. `browser-feature-test` en `playwright-testopslag.mdc` bijgewerkt.

### Story C: Fase C — API-integratie + testdata

**Beschrijving:** supertest golden paths en reproduceerbare test-DB seed.
**Acceptatiecriteria:**
1. `supertest` als devDependency; `tests/integration/` met minimaal 5 golden paths.
2. Golden paths: health, login, read PO, exclude, sync-filters (refresh gemockt).
3. `scripts/db/seed-test-data.sql` + `scripts/db/seed-test.js` bestaan.
4. `review-plan-for-devops` bevat test-lens checklist per story.

### Story D: Fase D — OTAP smoke in pipelines

**Beschrijving:** Optionele Playwright smoke na preview- en DEV-deploy; branch protection.
**Acceptatiecriteria:**
1. `preview.yml` draait smoke na deploy (`continue-on-error: true`).
2. `deploy-dev.yml` draait smoke na health-check (`continue-on-error: true`).
3. GitHub branch protection op `develop` vereist CI-status.
4. `push-feature-to-dev` en `push-dev-to-prod` vermelden CI + smoke in DevOps-comment.

### Story E: Fase E — Backfill bestaande features

**Beschrijving:** Playwright feature-specs voor recente features zonder formele E2E.
**Acceptatiecriteria:**
1. `cell-context-menu.spec.js` bestaat met tag `@feature-cell-context-menu`.
2. `sync-retained-orders.spec.js` bestaat met tag `@feature-sync-retained-orders`.
3. Bijbehorende `devTestItems` entries aanwezig (sync-retained bestaat al).
4. Minimaal één testrapport in `test-reports/` per backfill-feature.

### Story F: Skills + documentatie afronden

**Beschrijving:** Alle bestaande skills bijwerken en AGENTS.md / BRANCH_STRATEGY.md syncen.
**Acceptatiecriteria:**
1. `add-dev-test-menu-item` gebruikt huidig formaat (`id`, `title`, `checks[]`).
2. `push-feature-to-dev` en `push-dev-to-prod` verwijzen naar CI + post-deploy smoke.
3. `AGENTS.md` en `BRANCH_STRATEGY.md` vermelden `npm test` gate en `test:e2e:smoke`.
4. Alle skill-wijzigingen gesynchroniseerd in `.cursor/skills/` en `.claude/skills/`.

---

## Risico's

| Risico | Mitigatie |
|--------|-----------|
| Auth in Playwright | Bootstrap-user via API login fixture |
| D365 niet in CI | Mock D365ODataService |
| SQL niet in CI | Fase A zonder integration; Fase C met container |
| Smoke flaky op preview | Retry 2x; allow-fail in preview.yml |
| Agent skipt tests | develop-from-devops + CI gate + testing rule |

---

## Versie document

Aangemaakt op basis van [.cursor/plans/dev_2026-07-11-test-suite-en-skills.plan.md](../../.cursor/plans/dev_2026-07-11-test-suite-en-skills.plan.md); wijzig dit bestand bij nieuwe afspraken.

Plan: .cursor/plans/dev_2026-07-11-test-suite-en-skills.plan.md
