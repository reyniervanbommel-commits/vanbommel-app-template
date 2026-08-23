---
name: push-feature-to-dev
description: >-
  Use when merging a tested feature branch into the integration branch (often
  `develop`) — any repo with that flow. Triggers: "push feature to DEV",
  "feature is akkoord", "merge naar dev", "push-feature-to-dev". Azure preview
  cleanup and DevOps comments only if this repo has that street.
---

# Push Feature Preview to DEV

Merget een goedgekeurde `feature/*` naar de **integratiebranch** (meestal
`develop`).

**Niet** `grill-me` / `brainstorming`. Dit is afronden, geen ontwerp.

## Project-detectie

| Iets in de repo | Dan |
|-----------------|-----|
| Branch `develop` | PR-base = `develop` |
| Alleen `main` | Vraag of ze naar `main` willen; geen stille prod-deploy |
| `deploy-dev.yml` | Na merge: `gh run watch` op die workflow |
| `preview.yml` | Check of preview-app is opgeruimd |
| `src/config/devTestItems.js` | Stap 2 uitvoeren; anders overslaan |
| Azure DevOps MCP / work item-id in branch | Comment + Closed |
| Geen ADO | Alleen PR + (optioneel) `gh issue comment` |

Concrete Azure-namen: uit workflows/docs van *deze* repo, niet hardcoden.

---

## Workflow

```
Stap 1 — Controleer de huidige staat
Stap 2 — Feature toevoegen aan devTestItems.js (+ commit)
Stap 3 — PR aanmaken naar develop
Stap 4 — Wacht op merge en GitHub Actions + worktree opruimen
Stap 5 — Verifieer DEV deploy
Stap 6 — Controleer en ruim preview Container App op (fallback)
Stap 7 — Post comment op DevOps work item
Stap 8 — Zet DevOps work item op Closed
```

---

## Stap 1 — Controleer de huidige staat

```bash
git branch --show-current
git status --short
```

- Zit je op een `feature/*` branch? → ga verder
- Zijn er uncommitted wijzigingen? → commit eerst:

```bash
git add .
git commit -m "feat: <omschrijving> #AB:<id>"
git push
```

---

## Stap 2 — Feature toevoegen aan devTestItems.js

Vóór het aanmaken van de PR: voeg de nieuwe feature toe aan de testchecklist zodat testers op DEV weten wat er getest moet worden.

### 2a — Bepaal de versie en feature-omschrijving

Lees de huidige versie uit `package.json`:

```bash
node -e "console.log(require('./package.json').version)"
```

Bepaal een korte test-omschrijving op basis van:
- De feature branch naam (bijv. `feature/142-login-flow` → "Login flow werkt correct")
- De DevOps work item titel (als beschikbaar)
- De commit messages van deze branch

### 2b — Voeg item toe aan `src/config/devTestItems.js`

Open `src/config/devTestItems.js` en voeg onderaan een nieuw item toe. Op DEV verschijnen alle `checks` automatisch als afvinkbare vakjes rechtsonder via `DevFeatureChecklist`.

```js
{
  id: 'feature-<id>-<slug>-v<app-versie>',   // bijv. 'feature-207-row-remarks-v1-14-142'
  title: 'Feature <id> - <korte titel> (v<app-versie>)',
  checks: [
    'Eerste controlepunt voor testers',
    'Tweede controlepunt voor testers',
  ],
},
```

Gebruik de app-versie uit `src/config/version.js` (footer), niet alleen `package.json`.

Meerdere items zijn toegestaan als de feature uit meerdere onderdelen bestaat.

### 2c — Commit de testchecklist update

```bash
git add src/config/devTestItems.js
git commit -m "feat: testitem(s) toegevoegd voor v<versie> #AB:<id>"
git push
```

---

## Stap 3 — PR aanmaken naar develop

```bash
gh pr create \
  --base develop \
  --title "<feature-omschrijving>" \
  --body "Feature getest op preview. Klaar voor DEV."
```

> Noteer het PR-nummer voor de DevOps comment.

---

## Stap 4 — Wacht op merge en GitHub Actions

Na het aanmaken van de PR:

1. Merge de PR (handmatig of via `gh pr merge <nr> --merge`)
2. GitHub Actions start automatisch twee jobs:
   - `cleanup-preview` (preview.yml): verwijdert de preview Container App
   - `build-and-deploy` (deploy-dev.yml): deployt naar `<dev-container-app-naam>`

Volg de voortgang:

```bash
gh run list --workflow deploy-dev.yml --limit 1
gh run watch <run-id>
```

### 4b — Worktree opruimen

Na een succesvolle merge: verwijder de worktree lokaal.

```bash
# Ga terug naar de repo root als je nog in de worktree zit
cd <repo-root>

git worktree remove .worktrees/feature-<id>-<korte-naam>
git branch -d feature/<id>-<korte-naam>
```

> De worktree is nu verwijderd. De branch op de remote is al opgeruimd door GitHub Actions.

---

## Stap 5 — Verifieer DEV deploy

Controleer of de app bereikbaar is:

```bash
az containerapp show \
  --name <dev-container-app-naam> \
  --resource-group <resource-group-naam> \
  --query "properties.configuration.ingress.fqdn" -o tsv
```

Open de URL in de browser en controleer of de blauwe DEV-banner zichtbaar is.

---

## Stap 6 — Controleer en ruim preview Container App op (fallback)

De `preview.yml` cleanup-job zou de preview automatisch moeten verwijderen. **Verifieer altijd** of dit ook echt is gebeurd:

```bash
az containerapp list \
  --resource-group <resource-group-naam> \
  --query "[?starts_with(name,'preview-')].name" -o tsv
```

Als de preview Container App van deze feature **nog bestaat**, verwijder hem handmatig:

```bash
az containerapp delete \
  --name <preview-app-naam> \
  --resource-group <resource-group-naam> \
  --yes
```

> Dit voorkomt onnodige kosten en voorkomt dat testers een verouderde preview-URL blijven gebruiken.

---

## Stap 7 — Post comment op DevOps work item

Bepaal het work item ID (uit branchnaam of conversatie) en post via de DevOps REST API of MCP tool `wit_add_comment`:

```
Work item: #<id>
Comment:

## ✅ Feature staat op DEV

**DEV URL:** https://<dev-fqdn>
**Branch:** `<branchnaam>` → gemerged naar `develop`
**Preview:** opgeruimd (Container App verwijderd)
**Datum:** <datum>
```

Als de Azure DevOps MCP niet beschikbaar is, gebruik dan de REST API via PowerShell:

```powershell
$token = az account get-access-token --resource "499b84ac-1321-427f-aa17-267ca6975798" --query accessToken -o tsv 2>$null
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$body = @{ text = "<comment tekst>" } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "https://dev.azure.com/<organisatie>/<project>/_apis/wit/workItems/<id>/comments?api-version=7.1-preview.3" `
  -Headers $headers -Body $body
```

---

## Stap 8 — Zet DevOps work item op Closed

Sluit het work item af via de REST API:

```powershell
$token = az account get-access-token --resource "499b84ac-1321-427f-aa17-267ca6975798" --query accessToken -o tsv 2>$null
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json-patch+json" }
$body = '[{"op":"add","path":"/fields/System.State","value":"Closed"}]'
$result = Invoke-RestMethod -Method Patch `
  -Uri "https://dev.azure.com/<organisatie>/<project>/_apis/wit/workItems/<id>?api-version=7.1" `
  -Headers $headers -Body $body
Write-Host "State: $($result.fields.'System.State')"
```

> Geldige states voor Feature-items: `New`, `Active`, `Resolved`, `Closed`, `Removed`.

---

## Controle vóór merge naar develop

Als de feature **SQL-schema** wijzigde (nieuwe tabel/kolom):

- [ ] Migratiebestand staat in `scripts/db/migrations/` op de feature branch
- [ ] Preview of DEV draait zonder SQL-fouten (`Invalid column name`, enz.)
- [ ] Geen schema alleen handmatig in Azure op DEV gezet — alleen via migratie in Git

Zie `docs/guides/AZURE_INRICHTING_OTAP.md` → **SQL: schema vs data**.

## Wat GitHub Actions automatisch doet bij merge

| Actie | Workflow | Resultaat |
|---|---|---|
| Preview Container App verwijderen | `preview.yml` cleanup job | `preview-<slug>` niet meer bereikbaar |
| Deploy naar DEV | `deploy-dev.yml` | `<dev-container-app-naam>` bijgewerkt |
| DB migraties uitvoeren | `preview.yml` + `deploy-dev.yml` | DEV-database up-to-date (zelfde DB) |

---

## Vereisten

- Azure CLI ingelogd (`az login`)
- GitHub CLI ingelogd (`gh auth status`)
- Azure DevOps MCP actief
- Feature branch is getest en goedgekeurd via preview URL
