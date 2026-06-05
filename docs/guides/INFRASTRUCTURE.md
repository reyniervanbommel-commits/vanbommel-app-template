# Infrastructure

## Overzicht

Deze template gebruikt Azure Container Apps voor alle OTAP-omgevingen.

## Container build

Multi-stage Dockerfile:
1. **Stage 1 (frontend-build):** `npm ci --legacy-peer-deps` + `npm run build`
2. **Stage 2 (production):** Alleen `server/`, `dist/`, productie `node_modules`

> **Tech debt:** `--legacy-peer-deps` is vereist vanwege een peer-dep conflict in Fluent UI v9. Volg de Fluent UI releases voor wanneer dit opgelost is.

## Healthcheck

`GET /api/health` → `{ status: 'ok' }` (geen auth vereist)

Container App healthcheck: `wget -qO- http://localhost:3000/api/health`

## Scaling

- Min replicas: 0 (scale-to-zero op dev/preview)
- Max replicas: 2 (dev/preview), 5+ (acc/prod afhankelijk van load)

## Secrets in Container Apps

Secrets worden als Container App secrets opgeslagen, niet als plain env vars:
```bash
az containerapp update \
  --name [APP_NAME]-dev \
  --resource-group [RESOURCE_GROUP] \
  --set-env-vars SQL_CONNECTION_STRING=secretref:sql-connection-string
```

## Preview omgevingen

- Aangemaakt per `feature/*` branch via `preview.yml`
- Naam: `preview-<branch-slug>` (max 32 tekens incl. prefix)
- Branch-slug berekend via `sed 's|feature/||'` + normalisatie
- Opgeruimd na PR merge via `cleanup-preview` job

## Monitoring

Container Apps logs bekijken:
```bash
az containerapp logs show \
  --name [APP_NAME]-dev \
  --resource-group [RESOURCE_GROUP] \
  --follow
```
