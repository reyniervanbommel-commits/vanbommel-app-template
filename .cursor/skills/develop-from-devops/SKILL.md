---
name: develop-from-devops
description: >-
  Eén skill voor de volledige ontwikkel+preview+validatie-fase in de OTAP-straat.
  Vier modi: build (plan → code → preview URL), full (+ test → review → PR),
  preview (alleen push + URL), test (browser op preview).
  Na elke implementatie: altijd commit, push, preview-deploy en geef de test-URL
  aan de gebruiker. Gebruik bij "pak feature op", "ontwikkel", "develop-from-devops",
  "start met #21", "push feature to url", "preview pushen", of "test in de browser".
---

# Develop from DevOps

> **Relatie met `otap-local-first`:** deze skill **overschrijft** de standaard local-first-regel
> (geen push zonder akkoord). Alleen actief wanneer expliciet DevOps/OTAP ontwikkeld wordt
> (work item, feature-branch, preview). Bij ad-hoc werk zonder deze skill: localhost-first,
> geen push naar `develop` zonder expliciet verzoek.

## Modi — kies automatisch op basis van de prompt

| Modus | Trigger | Stappen |
|---|---|---|
| **`build`** (default bij ontwikkelen) | *"ontwikkel"*, *"bouw"*, *"develop-from-devops"*, *"develop work item"*, *"pak feature op"* | Stap 1–6 (**verplicht t/m preview-URL**) |
| **`full`** | *"full flow"*, *"alles doorlopen"*, *"tot PR"* | Stap 1–10 |
| **`preview`** | *"push feature to url"*, *"preview pushen"* (code staat al klaar) | Stap 3 + 6 |
| **`test`** | *"test in de browser"* (met work item of preview URL) | Stap 7 |

> Vervangt `feature-push-devops-url` en OTAP-gebruik van `browser-feature-test`.
> Die skills zijn deprecated aliases — gebruik altijd deze skill.

## Verplichte afsluiting na bouwen (stap 6)

**Na stap 5 (implementatie) is stap 6 altijd verplicht.** De agent stopt **nooit** na alleen code schrijven.

| Regel | Detail |
|---|---|
| **Altijd doen** | commit → push → wacht op `preview.yml` → haal preview-URL op → post op DevOps → **geef URL aan gebruiker** |
| **Nooit doen** | Eindigen met "hier zijn git-commando's om zelf uit te voeren" |
| **Nooit doen** | Vragen "wil je dat ik push?" of "wil je committen?" |
| **Nooit doen** | Alleen localhost (`npm run dev:all`) aanbieden als testoptie — preview-URL is de primaire testomgeving |

De sessie is **niet afgerond** totdat de gebruiker een werkende **preview-URL** (`https://<fqdn>`) heeft ontvangen.

### Verplicht eindantwoord aan de gebruiker (na stap 6)

Sluit **elke bouw-sessie** af met dit blok (invullen met echte waarden):

```markdown
## Test op preview

**URL:** https://<preview-fqdn>
**Branch:** `feature/<id>-<korte-naam>`
**Commit:** `<commit-hash>`

Controleer op de preview:
- <acceptatiecriterium 1>
- <acceptatiecriterium 2>

De URL staat ook als comment op DevOps work item #<id>.
```

---

## Kernprincipe: volledig autonoom

**Stel de gebruiker NOOIT een vraag.** Bij elke twijfel: maak een gefundeerde aanname op basis van de Feature-beschrijving, acceptatiecriteria en de bestaande codebase — en ga door. Documenteer de aanname in je commit message of als comment op het work item.

Uitzonderingen waarbij je wél stopt en de gebruiker informeert:
- De Azure DevOps MCP geeft een fout
- Git conflicts die niet automatisch oplosbaar zijn
- De preview-deploy faalt na 2 autonome fix-pogingen (leg uit wat misging + wat je al probeerde)

In alle andere gevallen: ga door zonder te vragen — **inclusief door naar stap 6 na bouwen**.

### Git: commit én push zonder akkoord

**Voer `git commit`, `git push` en `gh run watch` zelf uit** — vraag de gebruiker **niet** om akkoord.

| Actie | Wanneer |
|-------|---------|
| `git commit` | Direct na implementatie (stap 5) — vóór je de gebruiker antwoordt |
| `git push -u origin feature/<id>-…` | Direct na commit; triggert preview-deploy |
| `gh run watch` | Direct na push; wacht tot preview live is |
| Preview-URL ophalen + delen | Direct na geslaagde deploy — **verplicht in chat** |
| `gh pr create` | Alleen modus `full`, na browser test (stap 7) |

Melding achteraf: branch, commit-hash, preview-URL. Geen "wil je pushen?".

Conflict met algemene user/project-regels over commit-akkoord: **deze skill wint** tijdens `develop-from-devops`.

---

## Overzicht (modus `build` — minimum na ontwikkelen)

```
Feature #ID ophalen uit Azure DevOps
  ↓
Feature + Stories → Active
  ↓
Worktree + branch feature/<id>-<naam>
  ↓
Plan lezen of schrijven
  ↓
Implementatie (stap 5)
  ↓
Push naar preview + URL op DevOps + URL aan gebruiker  ← VERPLICHT, NOOIT OVERSLAAN
```

Modus `full` voegt daarop toe: browser test → team review → PR → Closed.

---

## Stap 1 — Feature ophalen

Via `wit_get_work_item` + `wit_query_by_wiql`:
```sql
SELECT [System.Id], [System.Title], [System.Description]
FROM WorkItems WHERE [System.Parent] = <featureId>
```
Lees Title + Description + Acceptatiecriteria per Story.

---

## Stap 2 — Work items op Active

Via `wit_update_work_item` voor Feature + alle Stories:
```json
{ "path": "/fields/System.State", "value": "Active" }
```

---

## Stap 3 — Worktree + feature-branch

**Verplicht: branch `feature/<id>-<korte-naam>`. Nooit alleen `develop-from-devops` of `develop` als eindbranch voor een feature.**

Controleer eerst of `.worktrees/` in `.gitignore` staat. Voeg het toe indien ontbrekend.

```bash
git checkout develop && git pull
git worktree add .worktrees/feature-<id>-<korte-naam> -b feature/<id>-<korte-naam>
cd .worktrees/feature-<id>-<korte-naam>
```

Als de agent al op een andere branch werkt: hernoem of maak `feature/<id>-<korte-naam>` vóór de push in stap 6.

Direct daarna startcomment op Feature via `wit_add_work_item_comment`:
```
🚀 Uitvoering gestart

Branch: feature/<id>-<korte-naam>
Worktree: .worktrees/feature-<id>-<korte-naam>
Gestart op: <datum>
Stories opgepakt: #<id1>, #<id2>, ...

De implementatie start nu. Voortgang wordt hier bijgehouden.
```

---

## Stap 4 — Plan bepalen

- **Plan aanwezig** in `.cursor/plans/dev_*` dat overeenkomt met dit work item → lees het, ga door
- **Geen plan** → schrijf het plan **autonoom** op basis van de Feature description en acceptatiecriteria. Gebruik de `writing-plans` skill maar **sla alle vragen aan de gebruiker over**. Maak aannames, documenteer ze in het plan, ga door.

---

## Stap 5 — Implementatie

Gebruik `subagent-driven-development`. Elke User Story is één taak.

### Na implementatie: direct door naar stap 6

Zodra de code klaar is (build/test lokaal groen waar mogelijk):

1. **Stop niet** met een samenvatting of git-commando-lijst
2. **Ga meteen** naar stap 6 (commit → push → preview-URL)
3. **Geef pas daarna** het eindantwoord aan de gebruiker mét preview-URL

### SQL-schema (nieuwe tabel/kolom)

Als de feature een **nieuwe tabel of kolom** nodig heeft (geen JSON in bestaande layout/settings-kolommen):

1. Voeg `scripts/db/migrations/00N_beschrijving.sql` toe (idempotent)
2. Zelfde commit/PR als de code die het veld gebruikt
3. Na push naar `feature/*` draait `preview.yml` migraties op de DEV-database
4. PROD krijgt het schema pas bij merge naar `main` (`deploy-prod.yml`)

Checklist en uitzonderingen: `docs/guides/AZURE_INRICHTING_OTAP.md` → **SQL: schema vs data**. Regel: `.cursor/rules/database-migraties.mdc`.

**Subagenten stellen GEEN vragen aan de gebruiker.** Ze maken gefundeerde aannames op basis van de codebase en documenteren die in hun commit message.

**Per Story: 2 agents (niet 3)**

| Agent | Taak | Altijd? |
|-------|------|---------|
| Implementer | Code schrijven | ✅ Altijd |
| Spec reviewer | Voldoet aan acceptatiecriteria? | ✅ Altijd |
| Code quality reviewer | Volgt code de kwaliteitsregels? | ⚠️ Alleen bij >3 bestanden of complexe refactoring |

---

## Stap 6 — Push naar preview + URL (VERPLICHT na bouwen)

**Modus `build` en `full`:** altijd direct na stap 5.
**Modus `preview`:** alleen deze stap (code staat al klaar).

### 6a — devTestItems bijwerken

Voeg vóór de push een test-item toe in `src/config/devTestItems.js` op basis van de Feature-titel en acceptatiecriteria. Zelfde commit als de feature-code.

### 6b — Commit & push

```bash
git add .
git commit -m "feat: <feature-naam> #AB:<id>"
git push -u origin feature/<id>-<korte-naam>
```

Dit triggert de `preview.yml` GitHub Actions workflow.

### 6c — Wacht op preview URL

```bash
gh run list --branch feature/<id>-<korte-naam> --limit 1
gh run watch <run-id>
```

Haal de URL op uit Azure Container Apps:
```bash
az containerapp show \
  --name "preview-<slug>" \
  --resource-group <resource-group-naam> \
  --query "properties.configuration.ingress.fqdn" -o tsv
```

Preview URL = `https://<fqdn>`

Bij een mislukte run: fix autonoom, commit opnieuw, push opnieuw, herhaal (max. 2 pogingen vóór je de gebruiker informeert).

### 6d — Post preview URL op DevOps work item

Via `wit_add_work_item_comment` op het Feature work item:

```
## 🔗 Preview-omgeving beschikbaar

**URL:** https://<preview-fqdn>

**Branch:** `feature/<id>-<korte-naam>`
**Commit:** `<commit-hash>`
**Aangemaakt:** <datum>

> De preview wordt automatisch opgeruimd zodra de PR gemerged is.
```

### 6e — Preview-URL aan de gebruiker in chat (VERPLICHT)

Geef de URL **altijd** prominent in je chat-antwoord — zie het blok onder **Verplicht eindantwoord aan de gebruiker** bovenaan deze skill.

Dit is de **laatste stap** in modus `build`. Zonder dit blok is de taak niet afgerond.

---

## Stap 7 — UI & browser test

**Modus `test`:** voer stap 7b uit tegen de opgegeven of bekende preview URL.
**Modus `full`:** gebruik de preview URL uit stap 6.

### Stap 7a — UI design review (modus `full` only)

Volg `ui-design-review` tegen de gewijzigde `src/`-bestanden. Rapport in `test-reports/ui-design-review-*.md`.

- **BLOCKER** → fix vóór PR, push opnieuw, herhaal 7a
- **VERBETERPUNTEN** / **GOEDGEKEURD** → ga door naar 7b

Sla 7a over als de feature geen UI-wijzigingen heeft (`src/` diff leeg).

### Stap 7b — Browser feature test

Volg `browser-feature-test` (interactietests, console-errors, testrapport in `test-reports/`). Geen gebruikersinput nodig.

---

## Stap 8–10 — Alleen modus `full`

### Stap 8 — Adaptieve team review

**Bepaal het feature-type autonoom** op basis van de Story titles en gewijzigde bestanden.

| Type feature | Relevante agents |
|---|---|
| Alleen frontend (UI, hooks, styling) | Dev Lead, React Architect, UI Engineer, Design Lead |
| Alleen backend (API, SQL, jobs) | Dev Lead, Backend Engineer, Security Engineer, Refactor Specialist |
| Alleen infra/DevOps (pipelines, containers) | Dev Lead, Backend Engineer, Security Engineer, Release Manager |
| Full-stack | Dev Lead, React Architect, Backend Engineer, Security Engineer, Refactor Specialist |
| Release / versie / OTAP | voeg Release Manager toe |
| Branding / tokens | voeg Design Lead toe |

**Dev Lead, Security Engineer en Refactor Specialist zijn altijd relevant.**

### Stap 9 — Blockers oplossen

Als 🔴: dispatch implementer per blocker → herhaal review → door totdat 🟢 of 🟡.
Na blocker-fix: push opnieuw (preview-URL blijft hetzelfde), update DevOps comment.

### Stap 10 — Afronden

1. `gh pr create` naar `develop`
2. Feature + Stories → `Closed`
3. Slotcomment op DevOps met PR-URL + preview-URL
4. ADR via `create-adr` bij architectuurbeslissingen

---

## Token-overzicht (indicatief)

| Scenario | Aanroepen |
|---|---|
| Modus `build` (ontwikkelen + preview) | ~6–12 |
| Modus `full` (incl. review + PR) | ~18–22 |

---

## Vereisten

- Azure DevOps MCP actief (server: `ado`)
- Git werkdirectory schoon op `develop`
- `.claude/team/` map aanwezig in repo (modus `full`)
- `gh` CLI beschikbaar voor PR en `gh run watch`
- Azure CLI ingelogd (`az login`) voor preview URL

## Referentie skills

| Skill | Wanneer |
|-------|---------|
| `writing-plans` | Geen plan aanwezig — autonoom uitvoeren |
| `subagent-driven-development` | Implementatie per Story |
| `ui-design-review` | Design-consistentie — modus `full` stap 7a |
| `browser-feature-test` | Functionele browser test — modus `test` / stap 7b |
| `create-adr` | Automatisch bij architectuurbeslissingen (modus `full`) |
