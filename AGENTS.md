# AGENTS.md

## Cursor Cloud specific instructions

### Vereiste services (lokaal)

| Service | Poort | Opmerking |
|---------|-------|-----------|
| SQL Server | 1433 | Geen `docker-compose` in repo; start handmatig via Docker |
| Express backend | 3000 | `npm run dev:backend` |
| Vite frontend | 5173 | `npm run dev:frontend` of `npm run dev:all` |

### Eerste setup (eenmalig per VM)

1. **Docker + SQL Server** — Docker is niet standaard aanwezig op de VM. Start `dockerd` met `fuse-overlayfs` storage-driver (zie setup-script in cloud agent). SQL Server container:

   ```bash
   sudo docker run -d --name mssql-dev \
     -e 'ACCEPT_EULA=Y' \
     -e 'MSSQL_SA_PASSWORD=DevPassword123!' \
     -p 1433:1433 \
     mcr.microsoft.com/mssql/server:2022-latest
   ```

2. **`.env`** — Kopieer `.env.example` naar `.env` en vul minimaal `SQL_CONNECTION_STRING`, `SESSION_SECRET`, `BOOTSTRAP_ADMIN_*` in. Maak de database aan vóór migraties (`vanbommel-dev` of naam uit connection string).

3. **Bootstrap-gebruiker** — Migraties seeden geen admin-user. Voeg handmatig een rij toe in `dbo.users` met `must_set_password = 1` en e-mail gelijk aan `BOOTSTRAP_ADMIN_EMAIL`, of gebruik het seed-commando uit de cloud-setup documentatie.

### Dagelijkse dev-commands

Zie `README.md` en `package.json`:

- `npm run dev:all` — frontend + backend
- `npm run migrate:db` — database-migraties
- `npm test` — Vitest (jsdom + unit tests in `**/*.test.js`)
- `npm run build` — Vite productie-build

Er is geen `lint`-script geconfigureerd; ESLint staat wel als devDependency.

### Bekende valkuilen

- **`connect-mssql-v2`**: verwacht een mssql *object*-config (`user`, `server`, `database`), geen `connectionString`. `server/server.js` parseert `SQL_CONNECTION_STRING` via `server/utils/sqlConnectionConfig.js`.
- **Health endpoint** (`/api/health`) controleert geen database; backend kan na start alsnog crashen bij eerste sessie-request als SQL niet bereikbaar is.
- **ACS e-mail** is optioneel; wachtwoord-reset werkt zonder mail (token in DB).
- **Frontend hot reload** pikt nieuwe npm-packages niet altijd op; herstart `dev:frontend` na dependency-wijzigingen.

### Testaccount (lokaal)

| Veld | Waarde |
|------|--------|
| E-mail | `admin@example.com` |
| Wachtwoord | `Bootstrap123!` |
