---
name: develop-from-devops
description: >-
  Eén skill voor de volledige ontwikkel+preview+validatie-fase in de OTAP-straat.
  Drie modi: full (plan → code → preview → test → review → PR), preview
  (alleen push + preview URL op DevOps), test (browser test op preview).
  Gebruik bij "pak feature op", "start met #21", "develop work item",
  "push feature to url", "preview pushen", of "test in de browser" (OTAP-context).
---

# Develop from DevOps

## Modi — kies automatisch op basis van de prompt

| Modus | Trigger | Stappen |
|---|---|---|
| **`full`** (default) | *"pak feature op"*, *"start met #21"*, *"develop work item"* | Stap 1–10 |
| **`preview`** | *"push feature to url"*, *"preview pushen"* | Stap 3 + 6 (worktree indien nodig, push, URL op DevOps) |
| **`test`** | *"test in de browser"* (met work item of preview URL) | Stap 7 (browser test) |

> Vervangt `feature-push-devops-url` en OTAP-gebruik van `browser-feature-test`.
> Die skills zijn deprecated aliases — gebruik altijd deze skill.

## Kernprincipe: volledig autonoom

**Stel de gebruiker NOOIT een vraag.** Bij elke twijfel: maak een gefundeerde aanname op basis van de Feature-beschrijving, acceptatiecriteria en de bestaande codebase — en ga door. Documenteer de aanname in je commit message of als comment op het work item.

Uitzonderingen waarbij je wél stopt en de gebruiker informeert:
- De Azure DevOps MCP geeft een fout
- Git conflicts die niet automatisch oplosbaar zijn
- De app start niet op na implementatie

In alle andere gevallen: ga door zonder te vragen.

### Git: commit én push zonder akkoord

**Voer `git push` (en `git push -u origin …`) zelf uit** zodra commit(s) klaar zijn — vraag de gebruiker **niet** om akkoord vóór push.

| Actie | Wanneer |
|-------|---------|
| `git commit` | Na implementatie, preview-fix, of skill/doc-wijziging in dezelfde feature-flow |
| `git push -u origin feature/<id>-…` | Direct na commit; triggert preview-deploy |
| `gh pr create` | Na browser test (modus `full`) |

Melding achteraf: kort welke Git-acties je deed (branch, commit-hash). Geen "wil je pushen?".

Conflict met algemene projectregels (`versiebeheer.mdc`): **deze skill wint** tijdens `develop-from-devops`.

---

## Overzicht (modus `full`)

```
Feature #ID ophalen uit Azure DevOps
  ↓
Feature + Stories → Active
  ↓
Worktree aanmaken + startcomment op work item
  ↓
Plan autonom schrijven of bestaand plan lezen
  ↓
Implementatie (per Story: implementer → spec review)
  ↓
Push naar preview + URL posten op DevOps work item
  ↓
Browser test (tegen preview URL)
  ↓
Adaptieve team review (alleen relevante agents)
  ↓
Team Lead syntheseert → blockers autonoom oplossen
  ↓
PR aanmaken naar develop
  ↓
Slotcomment met bevindingen + work items → Closed
```

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

## Stap 3 — Worktree aanmaken

**Verplicht: altijd een aparte feature-worktree. Nooit direct op `develop` of `main` werken.**

Controleer eerst of `.worktrees/` in `.gitignore` staat. Voeg het toe indien ontbrekend.

```bash
git checkout develop && git pull
git worktree add .worktrees/feature-<id>-<korte-naam> -b feature/<id>-<korte-naam>
cd .worktrees/feature-<id>-<korte-naam>
```

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

### SQL-schema (nieuwe tabel/kolom)

Als de feature een **nieuwe tabel of kolom** nodig heeft (geen JSON in bestaande layout/settings-kolommen):

1. Voeg `scripts/db/migrations/00N_beschrijving.sql` toe (idempotent)
2. Zelfde commit/PR als de code die het veld gebruikt
3. Na push naar `feature/*` draait `preview.yml` migraties op de DEV-database
4. PROD krijgt het schema pas bij merge naar `main` (`deploy-prod.yml`)

Checklist en uitzonderingen: `docs/guides/AZURE_INRICHTING_OTAP.md` → **SQL: schema vs data**. Regel: `.cursor/rules/database-migraties.mdc`.

**Subagenten stellen GEEN vragen aan de gebruiker.** Ze maken gefundeerde aannames op basis van de codebase en documenteren die in hun commit message. Als context ontbreekt: analyseer de bestaande code voor het antwoord.

**Per Story: 2 agents (niet 3)**

| Agent | Taak | Altijd? |
|-------|------|---------|
| Implementer | Code schrijven | ✅ Altijd |
| Spec reviewer | Voldoet aan acceptatiecriteria? | ✅ Altijd |
| Code quality reviewer | Volgt code de kwaliteitsregels? | ⚠️ Alleen bij >3 bestanden of complexe refactoring |

**Model selectie:**
- 1-2 bestanden, heldere spec → goedkoop model
- Multi-file integratie → standaard model
- Architectuurbeslissingen → meest capabele model

---

## Stap 6 — Push naar preview + URL op DevOps

**Modus `preview`:** voer alleen deze stap uit (na stap 3 indien branch nog niet bestaat).
**Modus `full`:** direct na implementatie, vóór browser test.

### 6a — devTestItems bijwerken

Voeg vóór de push een test-item toe in `src/config/devTestItems.js` op basis van de Feature-titel en acceptatiecriteria. Commit met `#AB:<featureId>`.

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

Bij een mislukte run: fix autonoom, commit opnieuw, push opnieuw, herhaal.

### 6d — Redirect URI registreren

Registreer de preview URL lokaal in Entra ID via `az rest` (bestaande URIs + nieuwe preview URL). Voer direct uit — geen bevestiging nodig. Zie `docs/guides/AZURE_INRICHTING_OTAP.md` voor app IDs.

### 6e — Post preview URL op DevOps work item

Via `wit_add_work_item_comment` op het Feature work item:

```
## 🔗 Preview-omgeving beschikbaar

**URL:** https://<preview-fqdn>

**Branch:** `feature/<id>-<korte-naam>`
**Commit:** `<commit-hash>`
**Aangemaakt:** <datum>

> De preview wordt automatisch opgeruimd zodra de PR gemerged is.
```

Bewaar de preview URL — gebruik die in stap 7 voor de browser test.

---

## Stap 7 — Browser test

**Modus `test`:** voer alleen deze stap uit tegen de opgegeven of bekende preview URL.
**Modus `full`:** gebruik de preview URL uit stap 6.

Volg de workflow uit `browser-feature-test` (visuele controles, interactietests, console-errors, testrapport in `test-reports/`). Geen gebruikersinput nodig.

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

Dispatch de geselecteerde agents parallel. Instructie per agent:
```
Lees .claude/team/<agent>.md voor je persona.
Lees de gewijzigde bestanden op branch feature/<id>-naam.
Geef je review in het formaat uit je persona-bestand.
Stel geen vragen — geef je review op basis van wat je ziet.
```

**Daarna: Team Lead synthese**
Dispatch één Team Lead subagent met output van alle ingezette agents:
- Leest `.claude/team/team-lead.md`
- Geeft eindoordeel: 🟢 GOEDGEKEURD / 🟡 CONDITIONEEL / 🔴 GEBLOKKEERD

---

## Stap 9 — Blockers oplossen

Als 🔴: dispatch implementer per blocker → herhaal review alleen bij de agents die de blocker vonden → door totdat 🟢 of 🟡.

Na blocker-fix: push opnieuw naar de feature branch (preview URL blijft hetzelfde), update DevOps comment indien nodig.

Geen gebruikersinteractie nodig. Blockers worden autonoom opgelost.

---

## Stap 10 — Afronden

**Geen opties vragen.** Voer altijd uit in deze volgorde:

1. Maak automatisch een PR aan naar `develop`:
   ```bash
   gh pr create --title "feat: <feature-naam> #AB:<id>" \
     --body "Closes #<id>. Zie docs/devops/<id>-*.md voor bevindingen." \
     --base develop
   ```
2. Zet Feature + alle Stories op `Closed` via `wit_update_work_item`
3. Post slotcomment op Feature via `wit_add_work_item_comment`:

```
✅ Feature afgerond — Team Review Bevindingen

Branch: feature/<id>-naam
Preview: https://<preview-fqdn>
PR: <PR url>
Gemerged op: <datum>

## Eindoordeel
<🟢 / 🟡 / 🔴 + toelichting Team Lead>

## Samenvatting per teamlid
<tabel uit Team Lead rapport>

## Opgeloste blockers
<lijst, of "Geen blockers">

## Verbeterpunten (uitgesteld)
<lijst van aanbevelingen die bewust niet zijn meegenomen>

## Gewijzigde bestanden
<lijst van de belangrijkste gewijzigde bestanden>
```

4. Als er architectuurbeslissingen zijn genomen: maak automatisch een ADR aan via `create-adr` skill. Geen bevestiging nodig.

---

## Token-overzicht (indicatief)

| Scenario | Aanroepen |
|---|---|
| 1 Story, frontend | ~8 |
| 7 Stories, full-stack | ~22 |

---

## Vereisten

- Azure DevOps MCP actief (server: `ado`)
- Git werkdirectory schoon op `develop`
- `.claude/team/` map aanwezig in repo
- `gh` CLI beschikbaar voor PR aanmaken
- Azure CLI ingelogd (`az login`) voor preview URL en redirect URI

## Referentie skills

| Skill | Wanneer |
|-------|---------|
| `writing-plans` | Geen plan aanwezig — autonoom uitvoeren (modus `full`) |
| `subagent-driven-development` | Implementatie per Story (modus `full`) |
| `browser-feature-test` | Gedetailleerde testworkflow — modus `test` roept dit aan |
| `create-adr` | Automatisch bij architectuurbeslissingen (modus `full`) |

