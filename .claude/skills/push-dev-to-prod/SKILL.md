---
name: push-dev-to-prod
description: >-
  Merge develop naar main en deployt naar productie via GitHub Actions.
  Maakt een PR aan van develop naar main, wacht op de deploy en verifieert
  de PROD Container App. Post een comment op het DevOps work item.
  Gebruik wanneer de gebruiker zegt "push DEV to PROD", "deploy naar prod",
  "zet op productie" of "develop naar main".
---

# Push DEV to PROD

Merget `develop` naar `main`. GitHub Actions deployt daarna automatisch naar `<prod-container-app-naam>`.

---

## Workflow

```
Stap 1 — Controleer de DEV staat
Stap 2 — devTestItems.js leegmaken (+ commit op develop)
Stap 3 — Maak een PR aan van develop naar main
Stap 4 — Wacht op merge en GitHub Actions deploy
Stap 5 — Verifieer PROD deploy
Stap 6 — Post comment op DevOps work item
```

---

## Stap 1 — Controleer de DEV staat

```bash
git checkout develop
git pull
git log --oneline -5
```

Controleer dat alle gewenste features op `develop` staan en dat de DEV-omgeving stabiel is.

---

## Stap 2 — devTestItems.js leegmaken

De test-items zijn na een succesvolle PROD deploy niet meer relevant. Maak de lijst leeg vóór de PR zodat DEV na de volgende sprint weer een schone lei heeft.

### 2a — Leeg de array in `src/config/devTestItems.js`

Open het bestand en vervang de inhoud van `DEV_TEST_ITEMS` door een lege array:

```js
export const DEV_TEST_ITEMS = [];
```

Laat de commentaarblock en de beschrijving bovenin staan, zodat toekomstige items duidelijk weten wat het format is.

### 2b — Commit op develop

```bash
git checkout develop
git add src/config/devTestItems.js
git commit -m "chore: devTestItems geleegd na PROD deploy v<versie>"
git push
```

> De volgende keer dat een feature naar DEV gaat, voegt `push-feature-to-dev` automatisch nieuwe items toe.

---

## Stap 3 — PR aanmaken van develop naar main

```bash
gh pr create \
  --base main \
  --head develop \
  --title "Deploy naar PROD: <sprint of omschrijving>" \
  --body "DEV getest en akkoord. Klaar voor productie."
```

> Het PR-guard script blokkeert directe pushes naar main — gebruik altijd een PR.

---

## Stap 4 — Wacht op merge en GitHub Actions deploy

Na het aanmaken:

1. Merge de PR: `gh pr merge <nr> --merge`
2. GitHub Actions `deploy-prod.yml` start automatisch:
   - Docker image bouwen met PROD-configuratie
   - DB migraties uitvoeren op PROD database
   - `<prod-container-app-naam>` bijwerken

Volg de voortgang:

```bash
gh run list --workflow deploy-prod.yml --limit 1
gh run watch <run-id>
```

> ⚠️ De PROD workflow voert DB migraties uit op de echte productiedatabase.
> Zorg dat alle migratiescripts idempotent zijn (`IF NOT EXISTS`).

### Controle vóór merge naar main

Als er sinds de laatste PROD-deploy **nieuwe** bestanden in `scripts/db/migrations/` op `develop` staan:

- [ ] Die migraties zijn al succesvol op **DEV** gedraaid (preview en/of `deploy-dev.yml`)
- [ ] `deploy-prod.yml` zal ze op PROD uitvoeren — geen handmatige PROD-schema-wijziging buiten Git om
- [ ] Geen code op `main` die kolommen gebruikt die nog niet in een migratiebestand zitten

Volledige checklist: `docs/guides/AZURE_INRICHTING_OTAP.md` → **SQL: schema vs data**.

---

## Stap 5 — Verifieer PROD deploy

```bash
az containerapp show \
  --name <prod-container-app-naam> \
  --resource-group <resource-group-naam> \
  --query "properties.configuration.ingress.fqdn" -o tsv
```

Open de URL en controleer:
- App laadt zonder fouten
- Login via Microsoft werkt
- Data is afkomstig van PROD database (geen DEV-banner zichtbaar)

---

## Stap 6 — Post comment op DevOps work item

Bepaal het work item ID en post via `wit_add_comment`:

```
Work item: #<id>
Comment:

## 🚀 Productie-deploy uitgevoerd

**PROD URL:** https://<prod-fqdn>
**Branch:** `develop` → gemerged naar `main`
**Deploy:** GitHub Actions `deploy-prod.yml` — succesvol
**Datum:** <datum>
```

---

## Wat GitHub Actions automatisch doet

| Actie | Workflow | Resultaat |
|---|---|---|
| Docker image bouwen (PROD config) | `deploy-prod.yml` | Image getagd als `prod-<sha>` |
| DB migraties op PROD | `deploy-prod.yml` | PROD database up-to-date |
| Container App bijwerken | `deploy-prod.yml` | `<prod-container-app-naam>` draait nieuwe versie |

---

## Rollback (indien nodig)

Bij een probleem na deploy: de oude App Service (`<legacy-appservice-naam>`) draait nog zolang DevOps #29 niet is uitgevoerd. Dat is de noodrem.

---

## Vereisten

- Azure CLI ingelogd (`az login`)
- GitHub CLI ingelogd (`gh auth status`)
- Azure DevOps MCP actief
- DEV-omgeving stabiel en getest
