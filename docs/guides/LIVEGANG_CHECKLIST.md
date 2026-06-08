# Livegang Checklist

Dit document beschrijft wat nog nodig is om deze template-app productie-klaar ("live") te maken.

## 1) Template placeholders vervangen

Vervang overal in de repo:

- `[APP_NAME]` (workflows, docs, app-namen)
- `[app-naam]` (package name, session cookie)
- `[RESOURCE_GROUP]` (Azure resource group)
- `[REGISTRY]` (Azure Container Registry naam)

Controleer in ieder geval:

- `README.md`
- `package.json`
- `.env.example`
- `.github/workflows/*.yml`
- `index.html`

## 2) Dependency/install-pad stabiel maken

Huidige situatie: er ontbreekt een `package-lock.json` terwijl scripts/workflows `npm ci` gebruiken.

Nog te doen:

- `package-lock.json` genereren en committen
- Beslissen op standaard install-strategie:
  - óf overal `npm ci` gebruiken (aanbevolen voor CI, vereist lockfile)
  - óf workflows aanpassen naar `npm install` (minder reproduceerbaar)
- Build lokaal verifiëren na dependency-fix

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

## 4) Azure basis inrichten (OTAP)

Per omgeving (dev/acc/prod):

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
- `SQL_CONNECTION_STRING_ACC`
- `SQL_CONNECTION_STRING_PROD`
- `SESSION_SECRET`
- `ACS_CONNECTION_STRING` (als e-mail actief is)

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
- Health endpoint: `GET /api/health`

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
- `main` push -> ACC deploy
- `workflow_dispatch` -> PROD deploy

Controleer daarna:

- App laadt
- Inloggen werkt
- Sessies blijven actief
- DB-operaties en migraties zijn correct toegepast

## 10) Go/No-Go voor livegang

Ga pas live als onderstaande klaar is:

- Placeholders volledig vervangen
- Lockfile + install/build stabiel
- OTAP resources bestaan en zijn bereikbaar
- Secrets volledig en correct gezet
- Deploy workflows succesvol groen
- Basis security checks akkoord
- End-to-end functionele smoke test geslaagd

## Aanbevolen vervolgstap

Werk deze checklist sequentieel af en houd per punt status bij (`todo`, `doing`, `done`) voor voorspelbare livegang.
