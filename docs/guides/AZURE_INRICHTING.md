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
develop branch → push → deploy-dev.yml → [APP_NAME]-dev
main branch → workflow_dispatch → deploy-prod.yml → [APP_NAME]-prod
```
