# Livegang Checklist

Dit document beschrijft wat nog nodig is om deze app productie-klaar ("live") te maken.

> Laatst geverifieerd: **2026-07-19**. De secties 1 en 2 stonden nog op de generieke template-tekst;
> beide punten bleken al afgerond en zijn hieronder gecorrigeerd.

## 1) Template placeholders vervangen — ✅ afgerond voor code en config

Geverifieerd 2026-07-19: `[APP_NAME]`, `[app-naam]`, `[RESOURCE_GROUP]` en `[REGISTRY]` komen
**niet meer voor** in `.github/workflows/*.yml`, `package.json` of `index.html`.

Resteert alleen in documentatie (geen livegang-blokkade):
`README.md`, `CLAUDE.md`, `docs/guides/INFRASTRUCTURE.md`, `docs/guides/AZURE_INRICHTING.md`.

## 2) Dependency/install-pad stabiel maken — ✅ afgerond

Geverifieerd 2026-07-19: `package-lock.json` bestaat en is gecommit; workflows gebruiken
`npm ci --legacy-peer-deps`. De eerdere waarschuwing dat de lockfile ontbrak was verouderd.

## 3) Lokale runtime gereed maken

Nog te doen:

- `.env` aanmaken vanuit `.env.example`
- Minimaal invullen:
  - `SQL_CONNECTION_STRING`
  - `SESSION_SECRET` (sterk, 64+ chars)
  - `ENCRYPTION_KEY` (64 hex chars)
  - `BOOTSTRAP_ADMIN_EMAIL`
  - `BOOTSTRAP_ADMIN_PASSWORD`
  - `APP_BASE_URL`
- Database migraties draaien: `npm run migrate:db`
- Applicatie starten: `npm run dev:all`

## 4) Azure basis inrichten (DEV/PROD)

Per omgeving (dev/prod):

- Azure SQL Database
- Azure Container App (of preview app voor feature branches)
- Koppeling met Container Apps Environment

Gedeeld:

- Azure Container Registry (ACR)
- Eventueel Azure Communication Services (voor e-mailflows)

## 5) GitHub Actions secrets configureren

Verplicht in GitHub repository secrets:

- `AZURE_CREDENTIALS`
- `ACR_NAME`
- `ACR_LOGIN_SERVER`
- `ACR_USERNAME`
- `ACR_PASSWORD`
- `ACA_RESOURCE_GROUP`
- `ACA_ENVIRONMENT`
- `SQL_CONNECTION_STRING_DEV`
- `SQL_CONNECTION_STRING_PROD`
- `SESSION_SECRET`
- `ACS_CONNECTION_STRING` (als e-mail actief is)
- `KEY_VAULT_NAME_DEV` / `KEY_VAULT_NAME_PROD`

D365-instellingen lopen **niet** via GitHub secrets maar via Key Vault → Container App
env vars (zie sectie 5b).

## 5b) D365 F&O-koppeling (LIVE)

Volledige uitwerking: `.cursor/plans/dev_2026-07-19-d365-live-golive.plan.md`.

### Key Vault (`kv-vp-ne-20260628`)
Per omgeving een set secrets; PROD is aangemaakt op 2026-07-19:

- `D365-ODATA-PROD-BASE-URL` — `https://vanbommel.operations.dynamics.com/`
- `D365-ODATA-PROD-TENANT-ID`
- `D365-ODATA-PROD-CLIENT-ID`
- `D365-ODATA-PROD-CLIENT-SECRET` — met `expires`-attribuut gezet
- `D365-ODATA-PROD-CLIENT-SECRET-EXPIRES-AT` — voedt de verloopwaarschuwing in de app

De Container App leest deze via `identityref:system`. De managed identity heeft
`Key Vault Secrets User` op de vault nodig (RBAC — géén access policies).

### Entra ID
- App-registratie per omgeving (`VBO-OData-VendorApp-DEV` / `-PROD`), single tenant.
- **Geen API-permissies nodig** — de rechten komen volledig uit F&O (zie hieronder).

### D365 F&O
- *System administration → Setup → Microsoft Entra ID applications*: regel met Client Id,
  naam en een `User Id`.
- ⚠️ **Dat `User Id`-veld is het volledige rechtenmodel.** Elke OData-call draait als die
  gebruiker en erft diens security roles. Gebruik een dedicated, niet-interactieve gebruiker —
  geen medewerker.
- Minimaal leesrechten op: `PurchaseOrderHeadersV2`, `PurchaseOrderLinesV2`, `VendorsV2`,
  `ReleasedProductsV2`.
- Schrijfrechten op `PurchaseOrderLinesV2` pas verlenen ná een geslaagde rooktest —
  write-back kent geen omgevings-guard in de applicatiecode.

### Verifiëren
`GET /api/health/d365` doet een echte entity-read, niet alleen een token-aanvraag. Dat
onderscheid is essentieel: op 2026-07-19 slaagde het token op de LIVE-omgeving terwijl élke
entity-read 403 gaf omdat de gekoppelde F&O-gebruiker geen rechten had. Een token-only check
zou dat als "gezond" hebben gerapporteerd.

De PROD-deploy roept deze endpoint aan en faalt als de koppeling niet werkt.

### Let op bij het eerste gebruik
`dbo.app_settings` heeft **voorrang op env vars** (`SettingsService.get`). Staat er een oude
handmatig ingevoerde waarde in de PROD-database, dan overschrijft die de Key Vault-waarde
stilletjes. Controleer vóór de eerste deploy:

```sql
SELECT [key], CASE WHEN [key] LIKE '%SECRET%' THEN '***' ELSE value END
FROM dbo.app_settings WHERE [key] LIKE 'D365_ODATA%';
```

LIVE (`vanbommel.operations.dynamics.com`) en ACC
(`vanbommel-acc.sandbox.operations.dynamics.com`) verschillen maar in één woord — bij een
visuele check makkelijk te missen.

## 6) Azure toegang en service principal

Nog te doen:

- Service principal met juiste rechten op de resource group
- Controleren dat GitHub Actions met `azure/login` kan aanmelden
- ACR pull/push permissies controleren

## 7) Container App configuratie valideren

Controleer per omgeving:

- Ingress extern aan
- Target port op `3000`
- Secrets via Container App secrets (niet plaintext env vars)
- Schaling passend ingesteld (dev/preview schaalbaar naar 0)
- Health endpoint (liveness): `GET /api/health`
- D365-readiness: `GET /api/health/d365` — bewust géén onderdeel van de liveness-probe,
  zodat een D365-storing geen container-restart uitlokt

## 8) Security en productie-hardening

Nog te doen:

- `SESSION_SECRET` sterk en uniek per omgeving
- `ALLOWED_ORIGINS` per omgeving correct ingevuld (geen wildcard in productie)
- Logging en foutafhandeling valideren
- Admin bootstrap-account na init veilig beheren/roteren

## 9) Deploy-flow testen

Test minimaal:

- `feature/*` push -> preview deployment
- `develop` push -> DEV deploy
- `main` push of `workflow_dispatch` -> PROD deploy

Controleer daarna:

- App laadt
- Inloggen werkt
- Sessies blijven actief
- DB-operaties en migraties zijn correct toegepast

## 10) Go/No-Go voor livegang

Ga pas live als onderstaande klaar is:

- ✅ Placeholders vervangen in code en config
- ✅ Lockfile + install/build stabiel
- OTAP resources bestaan en zijn bereikbaar
- Secrets volledig en correct gezet
- Deploy workflows succesvol groen
- Basis security checks akkoord
- End-to-end functionele smoke test geslaagd

D365-specifiek:

- `GET /api/health/d365` geeft `status: ok` op PROD
- `dbo.app_settings` bevat geen conflicterende D365-waarden (zie 5b)
- F&O-gebruiker heeft leesrechten op de vier vereiste entiteiten
- Write-back bewust wel/niet opengezet, en de keuze vastgelegd
- Vervaldatum client secret ingevuld — de app waarschuwt admins vanaf 30 dagen vooraf

## Aanbevolen vervolgstap

Werk deze checklist sequentieel af en houd per punt status bij (`todo`, `doing`, `done`) voor voorspelbare livegang.
