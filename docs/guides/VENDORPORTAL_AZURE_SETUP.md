# Azure Setup — Vendor Portal

Documentatie van de Azure-infrastructuur die is opgezet voor de Vendor Portal app.
Aangemaakt op: 26 juni 2026.

---

## Resource group

| Eigenschap | Waarde |
|------------|--------|
| Naam | `vanbommel_vendorsapp` |
| Locatie | `westeurope` |

Alle resources voor deze app staan in deze resource group.

---

## Azure SQL Database

| Eigenschap | Waarde |
|------------|--------|
| Server naam | `vanbommel-vendorportal-sql` |
| FQDN | `vanbommel-vendorportal-sql.database.windows.net` |
| Database naam | `vanbommel-vendorportal-db` |
| Tier | Basic (5 DTU, 2 GB) |
| Admin login | `sqladmin` |
| Locatie | `westeurope` |

### Firewall rules

| Naam | IP-range | Doel |
|------|----------|------|
| `AllowAzureServices` | `0.0.0.0` | Azure Container Apps / pipelines |
| `AllowDevMachine` | `213.125.220.138` | Lokale ontwikkelmachine |

> Als je IP wijzigt, voeg een nieuwe rule toe via:
> ```bash
> az sql server firewall-rule create \
>   --resource-group vanbommel_vendorsapp \
>   --server vanbommel-vendorportal-sql \
>   --name AllowMijnIP \
>   --start-ip-address <jouw-ip> \
>   --end-ip-address <jouw-ip>
> ```

### Migraties uitvoeren

```bash
npm run migrate:db
```

De migratie-runner (`scripts/db/run-migrations.js`) voert alle `.sql`-bestanden in `scripts/db/migrations/` uit in alfabetische volgorde. `${VAR_NAME}` placeholders in SQL-bestanden worden vervangen door de bijbehorende env var.

---

## Azure Communication Services (e-mail)

| Eigenschap | Waarde |
|------------|--------|
| ACS resource naam | `vanbommel-vendorsapp-acs` |
| Email service naam | `vanbommel-vendorsapp-email` |
| Endpoint | `vanbommel-vendorsapp-acs.europe.communication.azure.com` |
| Datalocatie | `europe` |
| Email domein | `AzureManagedDomain` (Azure-beheerd, `azurecomm.net`) |
| Afzenderadres | `DoNotReply@ef819aaa-ab0d-4ad5-9f2e-aecf228b595f.azurecomm.net` |

> **Custom domein:** wil je e-mails versturen vanaf `@vanbommel.nl`, dan moet je een custom domein koppelen via Azure Portal → Email Communication Services → Add domain → Custom domain, en DNS-records instellen bij je domeinbeheerder.

### Connection string ophalen

```bash
az communication list-key \
  --name vanbommel-vendorsapp-acs \
  --resource-group vanbommel_vendorsapp \
  --query primaryConnectionString -o tsv
```

---

## Lokale .env configuratie

Minimale `.env` voor lokale ontwikkeling (zie ook `.env.example`):

```env
# Database
SQL_CONNECTION_STRING=Server=vanbommel-vendorportal-sql.database.windows.net;Database=vanbommel-vendorportal-db;User Id=sqladmin;Password=<wachtwoord>;Encrypt=true;TrustServerCertificate=false;

# Session
SESSION_SECRET=<64-hex-tekens>
SESSION_TTL_HOURS=8
SESSION_COOKIE_NAME=vanbommel.sid

# Encryptie (TOTP)
ENCRYPTION_KEY=<64-hex-tekens>

# Azure Communication Services
ACS_CONNECTION_STRING=endpoint=https://vanbommel-vendorsapp-acs.europe.communication.azure.com/;accesskey=<key>
ACS_FROM_EMAIL=DoNotReply@ef819aaa-ab0d-4ad5-9f2e-aecf228b595f.azurecomm.net

# Bootstrap admin
BOOTSTRAP_ADMIN_EMAIL=<admin-email>
BOOTSTRAP_ADMIN_DISPLAY_NAME=<naam>
BOOTSTRAP_ADMIN_PASSWORD=<tijdelijk-wachtwoord>

# App URL
APP_BASE_URL=http://localhost:5178
```

---

## Bootstrap admin — eerste keer inloggen

Bij een nieuwe database:

1. Zorg dat `.env` gevuld is (zie boven)
2. Draai migraties: `npm run migrate:db`
3. Start de app: `npm run dev:all`
4. Ga naar `http://localhost:5178/login`
5. Log in met `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD`
6. Je wordt doorgestuurd naar `/set-password` — stel hier je definitieve wachtwoord in

---

## Azure CLI quick-reference

```bash
# Inloggen
az login

# Overzicht resources in de app resource group
az resource list --resource-group vanbommel_vendorsapp -o table

# SQL Server info
az sql server show --name vanbommel-vendorportal-sql --resource-group vanbommel_vendorsapp

# ACS connection string
az communication list-key --name vanbommel-vendorsapp-acs --resource-group vanbommel_vendorsapp --query primaryConnectionString -o tsv

# Firewall rule toevoegen voor nieuw IP
az sql server firewall-rule create --resource-group vanbommel_vendorsapp --server vanbommel-vendorportal-sql --name AllowMijnIP --start-ip-address <ip> --end-ip-address <ip>
```
