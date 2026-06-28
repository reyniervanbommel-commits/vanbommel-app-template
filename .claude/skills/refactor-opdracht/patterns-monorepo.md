# Monorepo refactor-patronen

## Wanneer logica naar een shared package verplaatsen

### Signalen

| Signaal | Actie |
|---------|-------|
| Dezelfde utility in 2+ apps gekopieerd | Verplaats naar `packages/<naam>/` |
| Gedeelde types/interfaces tussen apps | Maak `packages/types/` of `packages/shared/` |
| Auth-logica gebruikt door meerdere apps | Houd in bestaand `packages/auth/` |
| Config/constants gedeeld | Verplaats naar `packages/config/` |

### Beslisregel

Verplaats naar een shared package als:
1. De code door 2+ apps wordt gebruikt, EN
2. De code stabiel genoeg is (niet dagelijks in flux), EN
3. De interface duidelijk is (expliciete input/output)

Verplaats NIET als:
- De code nog sterk in ontwikkeling is (te vroege abstractie)
- De code app-specifieke aannames bevat
- Het alleen een paar regels betreft (kopieer is ok)

---

## Package structuur

### Standaard layout

```
packages/
  shared/
    src/
      index.js          -- barrel export
      utils.js          -- utility functies
      constants.js      -- gedeelde constanten
    package.json        -- naam: @project/shared
```

### package.json voor een shared package

```json
{
  "name": "@project/shared",
  "version": "1.0.0",
  "main": "src/index.js",
  "exports": {
    ".": "./src/index.js"
  }
}
```

### Registratie in root package.json

Voeg het package toe aan de workspaces array:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### Gebruik in een app

```json
// apps/portal/package.json
{
  "dependencies": {
    "@project/shared": "*"
  }
}
```

```javascript
// apps/portal/src/utils.js
const { formatDate, truncate } = require('@project/shared');
```

---

## Cross-app dependency regels

### Toegestane richtingen

```
apps/portal  -->  packages/auth     (ok: app gebruikt package)
apps/api     -->  packages/auth     (ok: app gebruikt package)
packages/auth -->  packages/shared  (ok: package gebruikt package)
```

### Verboden richtingen

```
packages/auth  -->  apps/portal    (verboden: package importeert uit app)
apps/portal    -->  apps/api       (verboden: app importeert uit andere app)
packages/a     -->  packages/b     (voorzichtig: vermijd cycles tussen packages)
```

### Dependency-piramide

```
         apps/
        /     \
  packages/auth  packages/shared
        \     /
     (geen cycles)
```

Regel: dependencies stromen alleen naar beneden. Nooit omhoog, nooit horizontaal tussen apps.

---

## Refactor-werkwijze voor extractie naar shared package

### Stap 1: Identificeer gedeelde code
Zoek duplicatie met:
```bash
# Vind functies die in meerdere apps voorkomen
rg "function formatDate" apps/
rg "export.*formatDate" apps/
```

### Stap 2: Maak het package
```bash
mkdir -p packages/shared/src
```

Maak `packages/shared/package.json` met de juiste naam en exports.

### Stap 3: Verplaats de code
- Kopieer de functies naar `packages/shared/src/`
- Exporteer via `index.js`
- Run `npm install` in de root (workspace linking)

### Stap 4: Update imports in apps
Vervang lokale imports door package imports:
```javascript
// VOOR
const { formatDate } = require('../utils/date');

// NA
const { formatDate } = require('@project/shared');
```

### Stap 5: Verwijder oude code
Verwijder de gekopieerde bestanden uit de apps na verificatie.

### Stap 6: Verifieer
- `npm run build` slaagt in alle apps
- `npm test` slaagt in alle apps
- Geen circulaire dependencies tussen packages

---

## Veelvoorkomende valkuilen

| Valkuil | Oplossing |
|---------|-----------|
| Te vroeg abstraheren | Wacht tot code in 2+ apps bewezen stabiel is |
| God-package met alles | Splits per domein: utils, types, config |
| Verborgen app-aannames in package | Package mag geen app-specifieke env vars of config gebruiken |
| Vergeten npm install na toevoegen | Altijd `npm install` in root na nieuw package |
| Breaking changes zonder communicatie | Verhoog version, documenteer wijzigingen |
