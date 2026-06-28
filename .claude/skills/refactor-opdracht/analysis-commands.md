# Geautomatiseerde analyse stappen

Voer deze stappen uit voor je begint met refactoren. Elke stap bevat het commando, de verwachte output en hoe je het resultaat interpreteert.

## Stap 1: Bestandsgrootte scan

Vind bestanden die de 300-regels grens overschrijden.

### Commando (PowerShell)
```powershell
Get-ChildItem -Recurse -Include *.js,*.jsx,*.ts,*.tsx -Exclude node_modules | ForEach-Object { $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; if ($lines -gt 200) { [PSCustomObject]@{Lines=$lines; File=$_.FullName} } } | Sort-Object Lines -Descending | Format-Table -AutoSize
```

### Commando (bash/Linux/macOS)
```bash
find src/ \( -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' \) ! -path '*/node_modules/*' | xargs wc -l | sort -rn | head -20
```

### Interpretatie
| Regels | Status | Actie |
|--------|--------|-------|
| < 200 | Ok | Geen actie nodig |
| 200-299 | Waarschuwing | Monitor, plan splitsing |
| 300+ | Kritiek | Splits voor andere wijzigingen |

---

## Stap 2: State-telling per component

Tel het aantal `useState` calls per bestand om hook-extractie kandidaten te vinden.

### Commando
```bash
rg -c "useState" --glob "*.{jsx,tsx,js,ts}" | sort -t: -k2 -rn | head -15
```

### PowerShell alternatief
```powershell
Get-ChildItem -Recurse -Include *.jsx,*.tsx -Exclude node_modules | ForEach-Object { $count = (Select-String -Path $_.FullName -Pattern "useState" | Measure-Object).Count; if ($count -gt 0) { [PSCustomObject]@{Count=$count; File=$_.Name} } } | Sort-Object Count -Descending
```

### Interpretatie
| useState count | Status | Actie |
|----------------|--------|-------|
| 1-4 | Ok | Geen actie nodig |
| 5-9 | Overweeg | Custom hook extractie |
| 10+ | Verplicht | Custom hook, mogelijk component split |

---

## Stap 3: Circulaire dependencies

Detecteer cyclische imports die refactoring bemoeilijken.

### Commando (madge — indien beschikbaar)
```bash
npx madge --circular src/
```

### Fallback (zonder madge)
Als madge niet geïnstalleerd is of faalt, gebruik een handmatige aanpak:
```bash
# Vind alle import-paden en zoek naar wederzijdse imports
rg "from ['\"]\.\.?/" --glob "*.{js,jsx,ts,tsx}" -l
```
Vergelijk de resultaten handmatig op bestanden die elkaar importeren. Noteer verdachte paren en controleer met:
```bash
# Check of bestand A importeert uit bestand B en vice versa
rg "from.*fileA" --glob "fileB.*"
rg "from.*fileB" --glob "fileA.*"
```

### Interpretatie
- **Geen cycles**: dependency-graph is gezond
- **Cycles gevonden**: noteer de betrokken modules en pas het "Break cycles" patroon toe (zie decision-tree.md)
- **Veel cycles**: begin met de kleinste cycle (2 modules) en werk naar buiten

---

## Stap 4: Complexiteit analyse

Vind functies met hoge cyclomatische complexiteit.

### Commando (met eslint)
```bash
npx eslint --rule '{"complexity": ["warn", 10]}' src/ --format compact
```

### Interpretatie
| Complexiteit | Status | Actie |
|--------------|--------|-------|
| 1-10 | Ok | Geen actie nodig |
| 11-20 | Hoog | Splits in subfuncties |
| 20+ | Kritiek | Herstructureer volledig |

---

## Stap 5: Import-analyse

Breng in kaart welke modules het meest geimporteerd worden (high-impact bij wijziging).

### Commando
```bash
rg "from ['\"]([^'\"]+)['\"]" --glob "*.{js,jsx,ts,tsx}" -or '$1' | sort | uniq -c | sort -rn | head -20
```

### PowerShell alternatief
```powershell
Get-ChildItem -Recurse -Include *.js,*.jsx,*.ts,*.tsx -Exclude node_modules | ForEach-Object { Select-String -Path $_.FullName -Pattern "from ['""](.+)['""]" -AllMatches | ForEach-Object { $_.Matches.Groups[1].Value } } | Group-Object | Sort-Object Count -Descending | Select-Object -First 20 Count, Name
```

### Interpretatie
- **Veel imports**: dit is een kernmodule; wees extra voorzichtig bij wijzigingen
- **Weinig imports**: minder impact, veilig om te refactoren
- **Alleen interne imports**: kan veilig hernoemd/verplaatst worden
- **Externe + interne imports**: publieke API, wijzigingen breken consumers

---

## Stap 6: JSX nesting diepte

Vind componenten met diepe JSX nesting (max 4 niveaus toegestaan).

### Commando
```bash
rg "^\s{20,}<" --glob "*.{jsx,tsx}" -l
```

### PowerShell alternatief
```powershell
Get-ChildItem -Recurse -Include *.jsx,*.tsx -Exclude node_modules | ForEach-Object { $deep = (Select-String -Path $_.FullName -Pattern "^\s{20,}<" | Measure-Object).Count; if ($deep -gt 0) { [PSCustomObject]@{DeepLines=$deep; File=$_.Name} } } | Sort-Object DeepLines -Descending
```

### Interpretatie
| Nesting (inspringing) | Status | Actie |
|---|---|---|
| < 16 spaties (4 niveaus) | Ok | Geen actie nodig |
| 16-24 spaties (4-6 niveaus) | Waarschuwing | Overweeg subcomponent extractie |
| 24+ spaties (6+ niveaus) | Kritiek | Verplicht opsplitsen |

> **Let op**: Dit is een indicatie op basis van inspringing. Controleer handmatig of de nesting daadwerkelijk JSX betreft (en niet bijv. een geneste callback).

---

## Stap 7: Props telling per component

Vind componenten met te veel props (max 10 toegestaan).

### Commando
```bash
# Matcht zowel function declarations als arrow functions met destructured props
rg "(function \w+\(\{|const \w+ = \(\{|export default function\s*\w*\(\{)" --glob "*.{jsx,tsx}" -A 15
```

### PowerShell alternatief
```powershell
Get-ChildItem -Recurse -Include *.jsx,*.tsx -Exclude node_modules | ForEach-Object { $content = Get-Content $_.FullName -Raw; if ($content -match "function \w+\(\{([^}]+)\}") { $props = ($Matches[1] -split ",").Count; if ($props -gt 7) { [PSCustomObject]@{Props=$props; File=$_.Name} } } } | Sort-Object Props -Descending
```

### Interpretatie
| Props count | Status | Actie |
|---|---|---|
| 1-7 | Ok | Geen actie nodig |
| 8-10 | Waarschuwing | Overweeg props-object of component split |
| 10+ | Kritiek | Splits component of gebruik composition pattern |

---

## Stap 8: Duplicate code detectie (optioneel)

Vind gekopieerde patronen die kandidaten zijn voor extractie.

> **Vereist**: `jscpd` (wordt on-the-fly geïnstalleerd via npx). Sla over als het niet beschikbaar is.

### Commando
```bash
npx jscpd src/ --min-lines 5 --min-tokens 50
```

### Interpretatie
- **Clone percentage < 5%**: gezond
- **Clone percentage 5-15%**: identificeer de grootste clones en extraheer
- **Clone percentage > 15%**: systematische duplicatie, prioriteer extractie

---

## Stap 9: Bundle-impact (optioneel, frontend)

Analyseer welke modules het meest bijdragen aan de bundle size.

> **Vereist**: bundel-analyse tooling. Sla over als niet beschikbaar of niet relevant.

### Commando (Vite)
```bash
npx vite-bundle-visualizer
```

### Commando (Webpack)
```bash
npx webpack-bundle-analyzer dist/stats.json
```

### Interpretatie
- Identificeer onverwacht grote modules
- Check of tree-shaking werkt (worden ongebruikte exports verwijderd?)
- Overweeg lazy loading voor grote secties

---

## Samenvatting analyse-rapport

Na alle stappen, vat samen in dit format:

```markdown
## Analyse-rapport

### Bestanden boven streefdoel/hard max
| Bestand | Type | Regels | Streefdoel | Hard max | Actie |
|---------|------|--------|------------|----------|-------|
| [bestand] | [component/hook/util/controller] | [aantal] | [streef] | [max] | [split/hook/monitor] |

### State hotspots
| Component | useState count | Actie |
|-----------|---------------|-------|
| [component] | [aantal] | [hook extractie/split] |

### JSX nesting hotspots
| Component | Diepste nesting | Actie |
|-----------|----------------|-------|
| [component] | [niveaus] | [subcomponent extractie] |

### Props hotspots
| Component | Props count | Actie |
|-----------|------------|-------|
| [component] | [aantal] | [composition/split] |

### Circulaire dependencies
- [module A] <-> [module B]: [oplossingsrichting]

### Complexiteit hotspots
| Functie | Complexiteit | Actie |
|---------|-------------|-------|
| [functie] | [score] | [splits/herstructureer] |

### Prioriteit (gebruik prioriteitsmatrix uit SKILL.md)
1. [P1/P2/P3/P4] [hoogste prioriteit item]
2. [P1/P2/P3/P4] [tweede prioriteit]
3. [P1/P2/P3/P4] [derde prioriteit]
```
