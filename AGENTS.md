# AGENTS.md

## OTAP local-first (standaard)

Geldt voor **Cursor, Claude Code en Codex** tenzij `develop-from-devops` actief is.

| Laag | Omgeving |
|------|----------|
| ACC | `localhost` (`npm run dev:all`) — default ontwikkelen/testen |
| DEV | `develop` in git → Azure DEV — **alleen** na expliciet "push naar dev" |
| PROD | `main` → productie-deploy |

**Ad-hoc (geen feature-branch/worktree, geen DevOps-workflow):** geen `git push`, geen commit zonder expliciet verzoek. Test op localhost.

**DevOps OTAP:** skill `develop-from-devops` → feature-branch + preview-URL (overschrijft local-first).

Volledige regel: `.cursor/rules/otap-local-first.mdc`.

## Kwaliteitspoort — UI, snelheid, security (elke wijziging)

Geldt voor **elke agent** (Cursor, Claude Code, Codex) bij **elke feature en elke snelle fix** in
`src/` of `server/` — niet alleen wanneer er expliciet om gevraagd wordt. Doorloop vóór het
klaarmelden van het werk:

1. **UI/Fluent** — toets tegen `docs/guides/UI_DESIGN_STANDARDS.md` en `.cursor/rules/fluentui-valkuilen.mdc`.
   Daarna `final-check-feature` (die `ui-design-review` aanroept).
2. **Snelheid** — geen onnodige extra `apiRequest`-calls, queries/berekeningen in loops, of
   ontbrekende `useMemo`/`useCallback`. Kies bij twijfel de oplossing die de **ervaren** snelheid
   ten goede komt (caching, optimistic UI, memoization). `final-check-feature` roept `perf-review`
   aan (geen extra snelheid-skill).
3. **Security** — input-validatie, geen secrets in code, `requireSession`/`requireRole` op nieuwe
   routes, SQL via parameters. `final-check-feature` roept `security-review` aan op de diff.

Volledige regel: `.cursor/rules/kwaliteitspoort.mdc`.

Ná feature of bugfix: skill `final-check-feature` — die roept `ui-design-review`,
`perf-review`, `security-review` en `browser-feature-test` aan (geen extra
snelheid-skill; meten = `perf-review`).

## Cursor Cloud specific instructions

### Node / npm (cloud agents)

| Onderdeel | Waarde / actie |
|-----------|----------------|
| Node.js | **22.x** (zie `Dockerfile`: `node:22-alpine`) |
| Package manager | **npm** — gebruik altijd `package-lock.json` |
| Installatie | `npm ci` (niet `npm install` in CI/cloud) |
| Peer-deps | `.npmrc` bevat `legacy-peer-deps=true` (Fluent UI v9 conflict) |
| VM update script | `npm ci` — draait bij elke cloud-agent sessie na `git pull` |

**Lockfile-regel:** wijzig je `package.json`, commit altijd de bijgewerkte `package-lock.json` in dezelfde commit. Zonder lockfile-sync faalt `npm ci` en werken build/test niet direct.

**Verwachte checks na installatie (zonder handmatige fixes):**

```bash
npm ci
npm test
npm run build
```

`jsdom` staat in `devDependencies` + lockfile (vereist voor Vitest/jsdom-environment).

### Vereiste services (lokaal)

| Service | Poort | Opmerking |
|---------|-------|-----------|
| SQL Server | 1433 | Geen `docker-compose` in repo; start handmatig via Docker |
| Express backend | 3008 | `npm run dev:backend` |
| Vite frontend | 5178 | `npm run dev:frontend` of `npm run dev:all` |

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

### Azure DevOps MCP (cloud agents)

De DevOps MCP staat in `.cursor/mcp.json` (server `Devops`). Cloud agents hebben **non-interactive** auth nodig.

| Secret (Cursor Dashboard) | Beschrijving |
|---------------------------|--------------|
| `ADO_MCP_AUTH_TOKEN` | Azure DevOps PAT of bearer token — **verplicht** voor cloud agents |

**Setup:**

1. Voeg `ADO_MCP_AUTH_TOKEN` toe via [Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents).
2. Gebruik een PAT met scopes Work Items (Read & Write) en Project (Read).
3. Herstart de cloud agent na het toevoegen van het secret.

Lokaal: `.\refresh-ado-mcp-token.ps1 -PersistToUserEnv` (Azure CLI) of PAT handmatig zetten.

Zie `docs/guides/MCP_DEVOPS_CURSOR_SETUP.md` voor volledige instructies.
