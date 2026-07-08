# CLAUDE.md — Van Bommel App Template

## Azure DevOps

- **Bord/project: `Vendor-App`** in org `https://dev.azure.com/reyniervanbommel0745` (klassieke URL: `https://reyniervanbommel0745.visualstudio.com/Vendor-App`).
- ⚠️ Het lokale `az devops`-default staat (verkeerd) op project **`QAQC Module`** — dat is een **andere app**. Filter work-item-queries altijd expliciet op `[System.TeamProject] = 'Vendor-App'` of geef `Vendor-App` in de URL mee.
- Work items van deze app: Feature `#130` (D365 PO) en `#142` (tech-debt) met hun child-stories (`#130`–`#151`).
- Toegang: Azure DevOps REST API met een `az account get-access-token` token (geen MCP in Claude Code).

## Tech stack

- React 18 + Vite + Fluent UI v9 (`@fluentui/react-components`)
- Express + MSSQL (`mssql`) met session-based custom auth
- Azure Container Apps (dev / prod)
- Dutch UI labels throughout

## Belangrijkste scripts

| Script | Wat |
|--------|-----|
| `npm run dev:all` | Frontend (5178) + backend (3008) tegelijk |
| `npm run migrate:db` | MSSQL-migraties uitvoeren |
| `npm run build` | Vite productie-build |
| `npm test` | Vitest tests |

## Auth-patroon

- `requireSession` + `requireRole('admin')` middleware in `server/middleware/auth.js`
- Session opgeslagen in MSSQL via `connect-mssql-v2`
- Cookie-naam via `SESSION_COOKIE_NAME` env var
- Wachtwoord-hash via bcrypt (12 rounds)
- Account vergrendeld na 3 mislukte pogingen (progressieve delay)

## CORS

`ALLOWED_ORIGINS` env var (kommagescheiden). Fallback: `['http://localhost:5173']`.

## Database

Migraties in `scripts/db/migrations/`. Altijd idempotent (`IF NOT EXISTS`).
Tabelnamen: `users`, `sessions`, `password_reset_tokens`, `mfa_backup_codes`, `audit_log`.

## Team review

`.claude/team/` bevat 9 persona-bestanden. Gebruik `/review` om parallel te reviewen.

## Placeholders (vervangen bij "Use this template")

- `[APP_NAME]` — app-naam voor workflows en Container App namen
- `[app-naam]` — app-naam voor package.json en cookie-naam
- `[RESOURCE_GROUP]` — Azure resource group
- `[REGISTRY]` — Azure Container Registry naam

## Cursor rules

`.cursor/rules/` bevat: code-kwaliteit, versiebeheer, data-en-security, fluentui-valkuilen.

## Performance / timing (verplicht bij nieuwe code)

Snelheid is standaard meetbaar via vaste "chokepoints" — houd nieuwe code daarbinnen zodat het **automatisch** getimed wordt:

| Wat je toevoegt | Hoe het getimed wordt | Actie |
|---|---|---|
| Nieuwe backend-route | `Server-Timing: app` (totale request-tijd) via de middleware in `server/server.js` | Niets — automatisch |
| Zware backend-suboperatie (DB-query, externe call, parse) | `time('label', () => ...)` uit `server/utils/timing.js` → aparte Server-Timing-metric (werkt overal, ook diep in een service; request-scoped via AsyncLocalStorage) | Wrap het blok in `time()` |
| Nieuwe frontend backend-call | `apiRequest` (`src/utils/api.js`) logt duur naar console + perf-HUD | **Altijd** `apiRequest`, nooit raw `fetch` (ESLint waarschuwt) |
| Zware client-berekening | `measure('label', () => ...)` uit `src/utils/perf.js` → User Timing + perf-HUD | Wrap het blok in `measure()` |

Zien: DevTools → Network → **Timing** (Server-Timing), de **⚡ perf-HUD** linksonder (dev/preview), of de console. De HUD is dev/preview-only (`VITE_APP_ENV`), nooit in productie. Voorbeeld-instrumentatie: `TableDataService.read()` (het board leest hieruit) → `tb_read_cols` / `tb_read_sql`.
