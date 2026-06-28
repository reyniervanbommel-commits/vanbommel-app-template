---
name: repo-cleanup-guardrails
description: Use when the user asks to clean up the repository, reorganize files, move plans, check for stray files, or keep the QA-QC module repo tidy. Also use when creating new files to determine where they should go.
---

# Repo Cleanup Guardrails — QA-QC Module

## Doel

Bewaar de QA-QC module repository overzichtelijk door elke sessie dezelfde mappenstructuur te hanteren en nieuwe bestanden direct op de juiste plek te zetten.

---

## Vastgestelde mappenstructuur

```
QA-QC_module/
├── .claude/          ← Claude team-rollen, commando's en hooks
├── .cursor/
│   ├── plans/        ← ALLE implementatieplannen (van Cursor én superpowers)
│   ├── rules/        ← Cursor rules
│   └── skills/       ← Project skills
├── .github/          ← CI/CD workflows
├── .githooks/        ← Git hooks
├── .vscode/          ← Editor instellingen
│
├── config/           ← Server-side config (mondayClient etc.)
├── controllers/      ← Express controllers, gegroepeerd per feature
├── middleware/       ← Express middleware
├── repositories/     ← Data access layer
├── routes/           ← Express routes
├── services/         ← Business logic services
├── utils/            ← Server-side utilities (cache, dbHelpers, etc.)
│
├── src/              ← Frontend React app
│   ├── components/   ← Gegroepeerd per feature (canvas, grids, settings, etc.)
│   ├── config/       ← Frontend config (msalConfig, version)
│   ├── context/      ← React context providers
│   ├── hooks/        ← Custom hooks (algemeen in root, utils/ voor helpers)
│   ├── services/     ← Frontend services (canvas, storage)
│   ├── styles/       ← Design tokens, brand styles
│   ├── theme/        ← Fluent UI theme
│   └── utils/        ← Frontend utilities
│
├── scripts/
│   ├── db/           ← SQL-migraties + bijbehorende JS runners
│   ├── dev/          ← Debug/check scripts voor ontwikkelaars
│   ├── utils/        ← Hulpscripts (logo, auto-commit, ship)
│   └── setup-dev.sh  ← Dev setup (blijft in root van scripts/)
│
├── docs/
│   ├── specs/        ← Specificaties en ontwerpdocumenten
│   ├── guides/       ← Integratiegidsen, infra-docs, brandbook
│   ├── chat-logs/    ← Sessiesamenvattingen (datum in bestandsnaam)
│   └── GEBRUIKSAANWIJZING.md
│
├── dist/             ← Build output (niet handmatig bewerken)
├── public/           ← Statische assets
└── [root]            ← server.js, package.json, vite.config.mjs, etc.
```

---

## Regels per bestandstype

| Bestandstype | Hoort in |
|---|---|
| `.plan.md` of plan-document | `.cursor/plans/` |
| Specificatie / ontwerp | `docs/specs/` |
| Integratiegids, infra, brandbook | `docs/guides/` |
| SQL-migratiebestand | `scripts/db/` |
| JS runner voor een migratie | `scripts/db/` |
| Check/debug/clear script | `scripts/dev/` |
| Hulpscript (logo, commit, ship) | `scripts/utils/` |
| Debug logbestand (`*.log`) | **Nooit committen** — in `.gitignore` |
| Fix-rapport (eenmalig) | Niet bewaren na afronding |
| Legacy component (geen imports) | Verwijderen |

---

## Cleanup checklist

Voer dit periodiek (per sprint of bij opruimverzoek) uit:

```
- [ ] Scan .cursor/ op .log bestanden → verwijderen
- [ ] Scan root op losse .md bestanden → verplaatsen naar docs/
- [ ] Scan .cursor/plans/ op planbestanden op verkeerde locatie → verplaatsen
- [ ] Scan scripts/ op bestanden in root die in db/, dev/ of utils/ horen
- [ ] Controleer of package.json scripts nog kloppen na verplaatsing
- [ ] Controleer src/components/ op lege legacy/ mappen
- [ ] Verwijder lege mappen na opruiming
- [ ] Commit met prefix: chore: opruimen en herstructureren
```

---

## Snelle scan-commando's (PowerShell)

```powershell
# Losse .md bestanden in root
Get-ChildItem -Path "." -MaxDepth 1 -Filter "*.md" | Where-Object { $_.Name -ne "README.md" }

# .log bestanden buiten node_modules
Get-ChildItem -Recurse -Filter "*.log" | Where-Object { $_.FullName -notlike "*\node_modules\*" }

# Planbestanden buiten .cursor/plans/
Get-ChildItem -Recurse -Filter "*.plan.md" | Where-Object { $_.FullName -notlike "*\.cursor\plans\*" }

# Lege mappen buiten node_modules
Get-ChildItem -Directory -Recurse | Where-Object {
  $_.FullName -notlike "*\node_modules\*" -and
  (Get-ChildItem $_.FullName -Force -Recurse | Where-Object { !$_.PSIsContainer }).Count -eq 0
}
```

---

## Wat NIET te doen

- Geen planbestanden opslaan in `docs/plans/` — gebruik altijd `.cursor/plans/`
- Geen debug logs committen
- Geen eenmalige fix-rapporten in de root laten staan
- Geen SQL-scripts in de root van `scripts/` — altijd in `scripts/db/`
- Geen legacy components bewaren als ze nergens worden geïmporteerd
