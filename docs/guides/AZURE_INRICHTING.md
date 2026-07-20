# Azure Inrichting

## Vereiste Azure-resources per omgeving

| Resource | Dev | Prod |
|----------|-----|------|
| Azure SQL Database | ✅ | ✅ |
| Azure Container Apps | ✅ | ✅ |
| Azure Container Registry | Gedeeld | Gedeeld |
| Azure Communication Services | Optioneel | ✅ |

## Container App naamgeving

| Omgeving | Naam |
|----------|------|
| Preview | `preview-<branch-slug>` (max 32 tekens) |
| Dev | `[APP_NAME]-dev` |
| Prod | `[APP_NAME]-prod` |

## GitHub Secrets instellen

Via GitHub → Settings → Secrets → Actions:

```bash
# Azure credentials (service principal)
az ad sp create-for-rbac --name "[APP_NAME]-github-actions" \
  --role contributor \
  --scopes /subscriptions/<sub-id>/resourceGroups/[RESOURCE_GROUP] \
  --sdk-auth
```

Kopieer de JSON-output naar `AZURE_CREDENTIALS`.

## Container App aanmaken (eerste keer)

```bash
# Dev
az containerapp create \
  --name [APP_NAME]-dev \
  --resource-group [RESOURCE_GROUP] \
  --environment <env-naam> \
  --image [REGISTRY].azurecr.io/[APP_NAME]:latest \
  --registry-server [REGISTRY].azurecr.io \
  --target-port 3000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 2
```

## Database-migraties

Migraties draaien automatisch als onderdeel van de deploy-workflows.
Lokaal uitvoeren:
```bash
SQL_CONNECTION_STRING="..." npm run migrate:db
```

## OTAP-flow

```
feature/* branch → push → preview.yml → preview-<slug> Container App
develop branch   → push → deploy-dev.yml → [APP_NAME]-dev
main branch      → push → deploy-prod.yml → [APP_NAME]-prod (na handmatige goedkeuring)
```

Handmatige PROD-deploy (noodgeval): GitHub Actions → **Deploy naar Productie** → `workflow_dispatch` met bevestiging `deploy-prod`.

## Deploy-bescherming (PROD)

Drie lagen voorkomen per ongeluk live zetten op productie:

| Laag | Mechanisme | Effect |
|------|------------|--------|
| 1 | Branch protection op `main` | Geen directe push; alleen merge via PR |
| 2 | CI op PRs (`ci.yml`) | `test` + `typecheck` moeten groen zijn vóór merge |
| 3 | GitHub Environment `production` | Deploy-job wacht op expliciete approve in Actions |

`develop` heeft lichtere protection: PR verplicht + dezelfde CI-checks, zonder review-verplichting.

### PROD-deploy goedkeuren

Na merge van `develop` → `main`:

1. GitHub Actions start `deploy-prod.yml`
2. Job **Deploy naar Productie** pauzeert op environment `production`
3. Goedkeurder klikt **Review deployments** → **Approve and deploy**
4. Daarna pas: image build, DB-migraties, Container App update, health/D365-check

### Branch protection instellen (eenmalig)

Als protection ontbreekt, configureer via GitHub → Settings → Branches of:

```bash
# main — PR + CI + 1 review
gh api --method PUT repos/<owner>/<repo>/branches/main/protection --input .github/branch-protection/main.json

# develop — PR + CI
gh api --method PUT repos/<owner>/<repo>/branches/develop/protection --input .github/branch-protection/develop.json
```

Environment `production` met required reviewers:

```bash
gh api --method PUT repos/<owner>/<repo>/environments/production --input .github/environments/production.json
```

Zie `.github/branch-protection/` en `.github/environments/` in de repo voor de canonical JSON-configs.
