# AGENTS.md - Van Bommel App Template

## Project context

- React 18 + Vite + Fluent UI v9 frontend.
- Express + MSSQL backend with session-based custom auth.
- Azure Container Apps OTAP flow for dev, acc and prod.
- Dutch UI labels throughout the app.

## Important commands

| Command | Purpose |
| --- | --- |
| `npm run dev:all` | Run frontend on 5173 and backend on 3000 |
| `npm run build` | Build the Vite production bundle |
| `npm test` | Run Vitest tests |
| `npm run migrate:db` | Run MSSQL migrations |

## Cursor Cloud specific instructions

- Read this file first, then read `CLAUDE.md` for the complete project overview.
- Use `.cursor/rules/*.mdc` as always-on rules for code quality, security, Fluent UI and version control.
- Use `.cursor/skills/*/SKILL.md` for task-specific workflows that were previously only available as `.claude/commands`.
- Keep `.claude/team/*.md` as the source for the Van Bommel review personas.
- For UI changes, run the app with `npm run dev:all` and validate the changed screen manually.
- For non-UI changes, prefer the smallest relevant automated test plus `npm run build` when practical.

## Available Cursor skills

- `review`: run the Van Bommel team review using the personas in `.claude/team/`.
- `ship`: finish a reviewed feature by checking status, committing, pushing and preparing a PR.
- `otap-status`: inspect Azure Container Apps status for dev, acc and prod.
- `promote-to-acc`: promote `develop` to `main` for acc/staging deployment.
- `promote-to-prod`: start the production deployment workflow after approval gates.

## Review personas

The review skill uses these persona files:

- `.claude/team/dev-lead.md`
- `.claude/team/security-engineer.md`
- `.claude/team/refactor-specialist.md`
- `.claude/team/react-architect.md`
- `.claude/team/ui-engineer.md`
- `.claude/team/design-lead.md`
- `.claude/team/backend-engineer.md`
- `.claude/team/release-manager.md`
- `.claude/team/team-lead.md`

## Guardrails

- Do not hardcode secrets; use environment variables.
- Protect secured backend routes with `requireSession` and admin routes with `requireRole('admin')`.
- Keep React components below 300 lines.
- Use Fluent UI `makeStyles` and tokens for component styling.
- Do not use Fluent UI `Tooltip` inside scrollable panels, lists or dynamically visible components.
