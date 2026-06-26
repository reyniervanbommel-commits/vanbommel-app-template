# CLAUDE.md — Van Bommel App Template

## Tech stack

- React 18 + Vite + Fluent UI v9 (`@fluentui/react-components`)
- Express + MSSQL (`mssql`) met session-based custom auth
- Azure Container Apps OTAP (dev / acc / prod)
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
