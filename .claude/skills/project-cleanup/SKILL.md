---
name: project-cleanup
description: >-
  Analyseer en ruim overbodige bestanden op in een project. Vindt verouderde
  documentatie, lege bestanden, eenmalige rapporten, ongebruikte configs en
  tijdelijke artefacten. Gebruik wanneer de gebruiker vraagt om het project op
  te schonen, bestanden op te ruimen, rommel te verwijderen, of een overzicht
  wil van wat weg kan.
---

# Project Cleanup

Systematisch opruimen van overbodige bestanden in een project.
Resultaat: overzichtstabel met suggesties, daarna opruimen na akkoord.

## Workflow

```
Cleanup Progress:
- [ ] Stap 1: Inventarisatie
- [ ] Stap 2: Classificatie
- [ ] Stap 3: Overzicht presenteren
- [ ] Stap 4: Opruimen na akkoord
- [ ] Stap 5: Lege mappen opruimen
- [ ] Stap 6: Git status rapporteren
```

---

## Stap 1 — Inventarisatie

Scan het project op kandidaat-bestanden. Voer parallel uit:

| Scan | Tool | Pattern |
|------|------|---------|
| Documentatie | Glob | `**/*.md` |
| SQL sessies | Glob | `**/*.session.sql` |
| Lege bestanden | Shell | `Get-ChildItem -Recurse -File \| Where-Object { $_.Length -eq 0 }` |
| Tijdelijke rapporten | Glob | `**/test-reports/**`, `**/*-report*` |
| Analyse artefacten | Glob | `**/*-analysis*`, `**/import-analysis*` |
| Ongebruikte configs | Glob | `.claude/**`, `.codex/**` |
| Log bestanden | Glob | `**/*.log` |
| Backup bestanden | Glob | `**/*.bak`, `**/*.backup`, `**/*.old` |

Lees de eerste 15-20 regels van elk gevonden bestand om de inhoud te begrijpen.

---

## Stap 2 — Classificatie

Beoordeel elk bestand op basis van deze criteria:

### Kan weg

- **Leeg bestand** (0 bytes)
- **Eenmalig rapport** — analyse, test, of migratie die is afgerond
- **Sessie-bestanden** — IDE-gegenereerde `.session.sql`, tijdelijke debug-bestanden
- **Verouderde tool-configs** — configs voor tools die niet meer gebruikt worden
- **Gegenereerde artefacten** — JSON/CSV output van eenmalige scripts

### Behouden

- **Actieve documentatie** — deployment guides, security plannen, architectuur docs
- **Configuratie** — `.env.example`, `.gitignore`, `.dockerignore`, `package.json`
- **Database scripts** — create/migrate SQL scripts in `scripts/` of `migrations/`
- **README bestanden** — project of package README's

### Twijfelgevallen

Markeer als "overleg" en laat de gebruiker beslissen. Voorbeelden:
- Documentatie die deels overlappend is met andere bestanden
- Eenmalige setup-instructies die al zijn uitgevoerd
- Scripts die mogelijk nog nuttig zijn

---

## Stap 3 — Overzicht presenteren

Toon een tabel aan de gebruiker:

```markdown
| # | Bestand | Inhoud | Suggestie |
|---|---------|--------|-----------|
| 1 | `pad/bestand.ext` | Korte beschrijving | **Kan weg** / **Behouden** / **Overleg** — reden |
```

Groepeer op suggestie (eerst "Kan weg", dan "Overleg", dan "Behouden").

Wacht op akkoord van de gebruiker voordat je verder gaat.

---

## Stap 4 — Opruimen na akkoord

1. Verwijder alleen bestanden waarvoor de gebruiker akkoord heeft gegeven
2. Gebruik de Delete tool per bestand
3. Houd een lijst bij van wat verwijderd is

---

## Stap 5 — Lege mappen opruimen

Na het verwijderen, controleer of er lege mappen zijn achtergebleven:

```powershell
Get-ChildItem -Directory -Recurse | Where-Object { (Get-ChildItem $_.FullName -Force).Count -eq 0 }
```

Verwijder lege mappen met `Remove-Item -Recurse -Force`.

---

## Stap 6 — Git status rapporteren

1. Toon een samenvatting van wat verwijderd is
2. Geef git commando's om de wijzigingen te committen:

```bash
git add -A
git commit -m "chore: verwijder ongebruikte bestanden en mappen"
```

3. Wacht op akkoord van de gebruiker voordat je commit

---

## Extra controles

### Referenties naar verwijderde bestanden

Zoek na opruiming of er nog verwijzingen bestaan naar verwijderde bestanden:

```
Grep: zoek op bestandsnamen van verwijderde bestanden in de codebase
```

Meld gevonden verwijzingen aan de gebruiker.

### User rules check

Controleer of user rules verwijzen naar bestanden die niet (meer) bestaan.
Meld ontbrekende referenties.
