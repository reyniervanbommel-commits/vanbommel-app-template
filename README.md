# [APP_NAME]

> Aangemaakt vanuit [vanbommel-app-template](https://github.com/reyniervanbommel-commits/vanbommel-app-template)

## Stack

- **Frontend:** React 18 + Vite + Fluent UI v9
- **Backend:** Express + MSSQL (session-based custom auth)
- **Infra:** Azure Container Apps (OTAP: dev / acc / prod)
- **Auth:** Custom session-auth met bcrypt, rate limiting, account lockout

## Lokale setup (5 stappen)

```bash
# 1. Kloon de repo
git clone https://github.com/reyniervanbommel-commits/[app-naam].git
cd [app-naam]

# 2. Vul .env in
cp .env.example .env
# Bewerk .env: SQL_CONNECTION_STRING, SESSION_SECRET, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD

# 3. Installeer dependencies
npm ci --legacy-peer-deps

# 4. Voer database-migraties uit
npm run migrate:db

# 5. Start de app
npm run dev:all
```

De app draait op `http://localhost:5178` (frontend) en `http://localhost:3008` (backend).

## Template instellen

Na "Use this template" moet je de volgende placeholders vervangen:

| Placeholder | Beschrijving | Voorbeeld |
|-------------|--------------|-----------|
| `[APP_NAME]` | App-naam in workflows en Container App namen | `vanbommel-portal` |
| `[app-naam]` | App-naam in package.json en cookie-naam | `vanbommel-portal` |
| `[RESOURCE_GROUP]` | Azure resource group | `vanbommel-rg-prod` |
| `[REGISTRY]` | Azure Container Registry naam | `vanbommelacr` |

Vervang ook:
- `index.html`: `<title>[APP_NAME]</title>`
- `.env.example`: `SESSION_COOKIE_NAME=[app-naam].sid`
- `package.json`: `"name": "[app-naam]"`

## GitHub Secrets

Stel deze secrets in via GitHub → Settings → Secrets → Actions:

| Secret | Beschrijving |
|--------|--------------|
| `AZURE_CREDENTIALS` | Service principal JSON voor `az login` |
| `ACR_NAME` | Azure Container Registry naam |
| `ACR_LOGIN_SERVER` | ACR login server (bijv. `myacr.azurecr.io`) |
| `ACR_USERNAME` / `ACR_PASSWORD` | ACR credentials |
| `ACA_RESOURCE_GROUP` | Resource group van Container Apps |
| `ACA_ENVIRONMENT` | Container Apps environment naam |
| `SQL_CONNECTION_STRING_DEV` | DB-connectiestring DEV |
| `SQL_CONNECTION_STRING_ACC` | DB-connectiestring ACC |
| `SQL_CONNECTION_STRING_PROD` | DB-connectiestring PROD |
| `SESSION_SECRET` | Willekeurige string (64+ tekens) |
| `ACS_CONNECTION_STRING` | Azure Communication Services (voor e-mail) |

## Scripts

| Script | Wat |
|--------|-----|
| `npm run dev:all` | Frontend + backend tegelijk starten |
| `npm run build` | Productie-build |
| `npm run migrate:db` | Database-migraties uitvoeren |
| `npm test` | Tests draaien |

## Documentatie

- [Custom Auth Guide](docs/guides/CUSTOM_AUTH_GUIDE.md)
- [Azure Inrichting](docs/guides/AZURE_INRICHTING.md)
- [Infrastructure](docs/guides/INFRASTRUCTURE.md)
