# Story A - Secrets matrix (DEV/PROD)

## Doel

Eenduidig overzicht van verplichte secrets voor deploys en runtime.

## GitHub Secrets

| Secret | DEV | PROD | Toelichting |
|---|---|---|---|
| `AZURE_CREDENTIALS` | verplicht | verplicht | Service principal JSON voor `azure/login` |
| `ACR_NAME` | verplicht | verplicht | Naam van Azure Container Registry |
| `ACR_LOGIN_SERVER` | verplicht | verplicht | Login server van ACR |
| `ACA_RESOURCE_GROUP` | verplicht | verplicht | Resource group met Container Apps |
| `KEY_VAULT_NAME_DEV` | verplicht | n.v.t. | Key Vault naam voor DEV references |
| `KEY_VAULT_NAME_PROD` | n.v.t. | verplicht | Key Vault naam voor PROD references |
| `SQL_CONNECTION_STRING_DEV` | verplicht | n.v.t. | Voor migratiestap in DEV workflow |
| `SQL_CONNECTION_STRING_PROD` | n.v.t. | verplicht | Voor migratiestap in PROD workflow |

## Key Vault secrets (runtime)

| Secret naam in Key Vault | DEV | PROD | Gebruik |
|---|---|---|---|
| `sql-connection-string` | verplicht | verplicht | Runtime SQL connectie in Container App |
| `session-secret` | verplicht | verplicht | Sessiesleutel voor backend |

## Mapping naar Container App secrets

Deploy-workflows zetten de volgende secretrefs:

- `sql-connection-string` → `SQL_CONNECTION_STRING=secretref:sql-connection-string`
- `session-secret` → `SESSION_SECRET=secretref:session-secret`
