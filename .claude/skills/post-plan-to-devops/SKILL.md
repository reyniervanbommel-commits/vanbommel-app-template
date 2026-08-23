---
name: post-plan-to-devops
description: >-
  Use when a feature plan or design should be registered on a tracker (Azure
  DevOps, GitHub Issues, or a local backlog doc) — any repo. Triggers: "post
  plan", "maak een work item", "post-plan-to-devops", "zet op het bord".
---

# Post Plan to DevOps

## Overview

Na het brainstormen en opslaan van een plan in `.cursor/plans/` worden twee dingen gedaan:
1. Een gestructureerd DevOps-document aangemaakt in `docs/devops/` (user story, acceptatiecriteria, backlog)
2. Een Azure DevOps work item aangemaakt met dit document als Description

Het plan blijft ongewijzigd in `.cursor/plans/`. Het DevOps-document is een vertaling van het plan naar een formaat dat direct in Azure DevOps werkt.

## Vereisten

- Plan of ontwerp op schijf (`docs/specs/` of `.cursor/plans/`, of pad van de gebruiker)

## Project-detectie (Stap 0)

1. **Bronbestand:** pad van de gebruiker, anders nieuwste `.cursor/plans/*.plan.md`
   of `docs/specs/*-design.md`.
2. **Tracker (kies één):**
   - Azure DevOps MCP bereikbaar → **Pad ADO** (stappen 3–9 hieronder)
   - `gh` + GitHub remote, geen ADO → **Pad GitHub:** `gh issue create` (of Epic
     als de org dat gebruikt); lokaal document in `docs/devops/` of `docs/backlog/`
   - Geen tracker → **Pad document:** alleen `docs/devops/` (of `docs/backlog/`)
     schrijven; geen work item. Meld dat.
3. `dev_`-prefix op het plan → al gepost; niet opnieuw aanmaken.

Geen `grill-me` / `brainstorming`. Ontwerp incompleet → eerst
`brd-td-feature-design` of `review-plan-for-devops`.

## Overview

Vertaal plan/ontwerp naar een backlog-document + (als er een tracker is) een
work item. Het planbestand zelf blijft de bron; hernoem met `dev_` alleen bij
succesvolle post.

## Hiërarchie: Feature → User Stories → Tasks

Bij het aanmaken van work items wordt de volgende hiërarchie aangehouden:

### Wanneer een Feature aanmaken

- Het plan beschrijft een **brede feature** met meerdere deelstappen
- Er zijn **3 of meer logische deelgebieden** (bijv. frontend, backend, communicatie, testen)
- Het werk overspant **meerdere sprints of iteraties**

**Aanpak:**
1. Maak een **Feature** aan als overkoepelend work item
2. Maak **User Stories** aan als child items via `wit_add_child_work_items`
3. Elke User Story heeft eigen acceptatiecriteria en beschrijving

### Wanneer een User Story volstaat

- Het plan beschrijft een **afgebakende wijziging** die in één sprint past
- Er zijn **minder dan 3 deelgebieden**
- De backlog-items passen als tasks onder één story

### Tags / Labels

Voeg altijd **tags** toe aan het parent work item via `System.Tags`:
- Tags zijn **gescheiden door puntkomma's** (`;`)
- Gebruik **korte, beschrijvende termen** in lowercase
- Voorbeelden: `PWA; caching; iOS; service-worker` of `testing; CI; coverage`
- Tags maken work items vindbaar en filteren in DevOps boards mogelijk

Bij child work items hoeven tags niet herhaald te worden — ze erven de context van de parent.

## Stappen

### 1. Bepaal het planbestand
- Als de gebruiker een pad noemt: gebruik dat
- Anders: gebruik het meest recent gewijzigde bestand in `.cursor/plans/`

### 2. Lees het planbestand volledig

### 3. Genereer het DevOps-document in het geheugen

Gebruik de planinhoud om het document op te stellen in de structuur hieronder. Gebruik het werk item ID nog niet — vul `<id>` als placeholder in.

**Structuur van het DevOps-document:**

```markdown
# <Titel van de feature> (DevOps)

**Doel:** <één zin samenvatting van het plan>  
**Referentie in repo:** [.cursor/plans/<planbestand>](../.cursor/plans/<planbestand>)  
**Tags:** <tag1; tag2; tag3>

---

## User story

**Als** <doelgroep>  
**wil ik** <wat>  
**zodat** <waarom / business value>

---

## Acceptatiecriteria (definitie van "klaar")

1. <criterium 1>
2. <criterium 2>
3. <criterium 3>
...

---

## Wat is al gedaan (geen DevOps-tasks meer nodig tenzij verificatie)

| Item | Locatie |
|------|---------|
| <bestaande implementatie> | <bestandspad> |

_(Leeg laten als er nog niets is gedaan)_

---

## Backlog — child User Stories

### Story A: <Titel>
**Beschrijving:** <wat en waarom>  
**Acceptatiecriteria:**
1. <criterium>
2. <criterium>

### Story B: <Titel>
**Beschrijving:** <wat en waarom>  
**Acceptatiecriteria:**
1. <criterium>
2. <criterium>

_(Bij een enkel User Story work item: gebruik "Backlog — tasks" met checkboxes in plaats van child stories)_

---

## Versie document

Aangemaakt op basis van [.cursor/plans/<planbestand>](../.cursor/plans/<planbestand>); wijzig dit bestand bij nieuwe afspraken.
```

### 4. Maak het work item aan (alleen Pad ADO)

Als Pad GitHub of Pad document: sla MCP-stappen over; schrijf het document
(stap 5) en maak desnoods `gh issue create`. Ga daarna naar stap 7–9 alleen
als er een planbestand te hernoemen is.

**Pad ADO:** via MCP.

**Bepaal het type** op basis van de hiërarchie-regels hierboven.

#### Feature met child User Stories (voorkeur bij brede plannen)

1. **Feature aanmaken** via `wit_create_work_item`:
   - **Type**: `Feature`
   - **Title**: eerste `#`-regel uit het plan (zonder `#`)
   - **Description**: het gegenereerde document uit stap 3
   - **Tags**: voeg `System.Tags` toe met relevante labels (`;`-gescheiden)

2. **Child User Stories aanmaken** via `wit_add_child_work_items`:
   - **parentId**: het ID van de Feature
   - **workItemType**: `User Story`
   - **items**: array met title + description per story (uit de "Backlog — child User Stories" sectie)

Noteer het teruggegeven Feature **ID** (bijv. `142`).

#### Enkel User Story (bij afgebakende wijzigingen)

- **Type**: `User Story`
- **Title**: eerste `#`-regel uit het plan (zonder `#`)
- **Description**: het gegenereerde document uit stap 3
- **Tags**: voeg `System.Tags` toe met relevante labels

Noteer het teruggegeven work item **ID**.

### 5. Sla het DevOps-document op

Bestandsnaam: `docs/devops/<id>-<korte-naam>.md`  
Voorbeeld: `docs/devops/142-login-flow.md`

Vervang in het document de placeholder `<id>` door het echte ID.

### 6. Update de Description in het work item

Voeg onderaan de Description een repo-link toe:
```
Repo-document: docs/devops/<id>-<korte-naam>.md
```

### 7. Hernoem het planbestand met `dev_` prefix

Voeg `dev_` toe aan de bestandsnaam in `.cursor/plans/` zodat zichtbaar is dat het plan in DevOps staat:

```
.cursor/plans/2026-05-07-login-flow.plan.md → .cursor/plans/dev_2026-05-07-login-flow.plan.md
```

### 8. Commit het DevOps-document en de hernoemde plan

```
git add docs/devops/<id>-<korte-naam>.md .cursor/plans/
git commit -m "docs: devops document voor work item #AB:<id>"
```

### 9. Sluit af — geen worktree aanmaken

De worktree wordt **niet** aangemaakt in deze stap. Dat gebeurt pas wanneer het plan daadwerkelijk uitgevoerd gaat worden (via de `executing-plans` skill). Op dat moment:
- wordt de worktree `.worktrees/feature/<id>-<korte-naam>` aangemaakt (via `git worktree add`)
- wordt de branchnaam toegevoegd als comment op het work item in Azure DevOps

Sluit af met een samenvatting:
> "Work item #<id> aangemaakt. Worktree wordt aangemaakt zodra je het plan gaat uitvoeren."

## Mapstructuur na uitvoering

```
.cursor/
  plans/
    dev_2026-05-07-login-flow.plan.md   ← plan met dev_ prefix = staat in DevOps
docs/
  devops/
    142-login-flow.md                    ← DevOps document met work item ID
```

## Commit conventie

Alle commits die bij dit work item horen bevatten `#AB:<id>`:
```
feat: beschrijving #AB:142
```

## Voorbeeldprompts

| Situatie | Prompt |
|----------|--------|
| Meest recente plan posten | "Maak een work item aan voor het laatste plan" |
| Specifiek plan | "Maak een work item aan voor .cursor/plans/2026-05-07-login.plan.md" |
| Plan uitvoeren | "Voer het plan uit voor work item #<id>" (worktree wordt dan aangemaakt) |
| Feature met children | "Maak een Feature aan met User Stories voor elk deelgebied" |
| Type wijzigen | "Zet work item #1 om naar een Feature" |

## MCP Tools referentie

| Tool | Gebruik |
|------|---------|
| `wit_create_work_item` | Maak een Feature of User Story aan |
| `wit_add_child_work_items` | Voeg child User Stories toe aan een Feature (parentId vereist) |
| `wit_update_work_item` | Wijzig type, tags, beschrijving of andere velden van een bestaand item |
| `wit_get_work_item` | Haal details op van een bestaand work item |

## Veelgemaakte fouten

| Fout | Oplossing |
|------|-----------|
| MCP niet actief | Herstart Cursor, vul org + project in bij de prompt |
| Plan heeft geen `#` heading | Gebruik de bestandsnaam als titel |
| Gebruiker noemt geen bestand | Gebruik het meest recent gewijzigde bestand in `.cursor/plans/` |
| Document al bestaat in docs/devops/ | Controleer of het work item al aangemaakt is |
| Plan heeft al `dev_` prefix | Work item bestaat al — niet opnieuw aanmaken |
| Tags vergeten | Altijd `System.Tags` meegeven bij aanmaken, puntkomma-gescheiden |
| Alles als User Story aangemaakt | Check hiërarchie-regels: breed plan = Feature + child stories |
| Project naam verkeerd | Gebruik `core_list_projects` om de exacte naam te achterhalen |
