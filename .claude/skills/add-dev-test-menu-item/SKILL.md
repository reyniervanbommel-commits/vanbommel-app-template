---
name: add-dev-test-menu-item
description: Voeg nieuwe testitems toe aan het DEV testmenu/checklist. Gebruik wanneer de gebruiker vraagt om een testmenu-item, dev checklist item of testpunt toe te voegen voor een feature/fix.
disable-model-invocation: true
---

# Add DEV Test Menu Item

## Doel
Voeg 1 of meerdere testitems toe aan het DEV testmenu, in het juiste formaat voor de huidige repository.

## Gebruik wanneer
- De gebruiker vraagt: "voeg item toe aan test menu"
- De gebruiker noemt: "dev checklist", "testitem", "testpunt", "ready for DEV testing"
- Een feature/fix naar `develop` gaat en testers concrete checks nodig hebben

## Workflow

1. **Bepaal config-bestand**
- Als `src/config/devTestItems.js` bestaat: gebruik QAQC-formaat (`id`, `version`, `category`, `label`)
- Anders als `src/config/devFeatureChecklist.js` bestaat: gebruik template-formaat (`id`, `label`)
- Als geen van beide bestaat: stop en vraag waar het testmenu staat

2. **Verzamel input**
- Korte feature/fix omschrijving
- Work item ID (indien bekend)
- Categorie (bij `devTestItems.js`), bijv. `Feature`, `Fix`, `UI`, `Backend`, `Regression`
- Huidige app-versie uit `package.json` (zonder `v` prefix)

3. **Maak stabiele item-id**
- Gebruik lowercase kebab-case
- Voeg work item ID toe indien beschikbaar (bijv. `login-flow-142`)
- Controleer op duplicate `id`; bij conflict suffix `-2`, `-3`, etc.

4. **Voeg item(s) toe**
- Voeg onderaan de array toe
- Gebruik Engels voor testlabels
- Houd items testbaar en concreet (1 check per regel)

5. **Formaat per bestand**

### Voor `src/config/devTestItems.js`
Gebruik:

```js
{
  id: 'login-flow-142',
  version: '1.11.2',
  category: 'Feature',
  label: 'Login flow works end-to-end with valid and invalid credentials',
},
```

### Voor `src/config/devFeatureChecklist.js`
Gebruik:

```js
{
  id: 'login-flow-142',
  label: 'Login flow works end-to-end with valid and invalid credentials',
},
```

6. **Validatie**
- Geen duplicate IDs
- Geldige JS syntax
- Snelle check: `npm run build` (of equivalent)

7. **Terugkoppeling aan gebruiker**
- Welke file is aangepast
- Welke item IDs zijn toegevoegd
- Welke versie is gebruikt
- Of er build/lint issues waren

## Commit-conventie (alleen als gebruiker commit vraagt)
- Prefix: `feat` of `fix`
- Met DevOps-link indien bekend: `#AB:<id>`
- Voorbeeld: `feat: add dev test item for login flow #AB:142`
