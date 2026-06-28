# /review — QA-QC Team Review

Voer een volledige team-review uit op de recentelijk gewijzigde bestanden.

## Stap 1: Bepaal gewijzigde bestanden

Voer uit: `git diff --name-only HEAD~1 HEAD`

Als er geen commits zijn, gebruik: `git diff --name-only`

Sla de lijst op — dit zijn de bestanden die alle teamleden reviewen. Filter op relevante bestanden (`.js`, `.jsx`, `.ts`, `.tsx`, `.css`, `.sql`, `.json` — geen `node_modules`, geen lockfiles).

Als er geen gewijzigde bestanden zijn: meld "Geen gewijzigde bestanden gevonden." en stop.

## Stap 2: Lees alle team-skills in

Lees de volgende bestanden volledig:
- `.claude/team/dev-lead.md`
- `.claude/team/react-architect.md`
- `.claude/team/backend-engineer.md`
- `.claude/team/security-engineer.md`
- `.claude/team/ui-engineer.md`
- `.claude/team/release-manager.md`
- `.claude/team/refactor-specialist.md`
- `.claude/team/design-lead.md`
- `.claude/team/team-lead.md`

Lees ook de inhoud van de gewijzigde bestanden zodat je die aan de agents kunt meegeven.

## Stap 3: Spawn 8 review-agents parallel

Gebruik de Agent tool om alle 8 agents tegelijkertijd te spawnen (parallel, in één bericht). Geef elke agent:
1. De volledige inhoud van hun skill-bestand als persona
2. De lijst van gewijzigde bestanden
3. De volledige inhoud van elk gewijzigd bestand

Gebruik dit prompt-patroon per agent:

```
Jij bent [ROLNAAM]. [VOLLEDIGE INHOUD VAN SKILL-BESTAND]

Review de volgende gewijzigde bestanden vanuit jouw expertise:

Gewijzigde bestanden: [lijst]

[Voor elk bestand: bestandsnaam + volledige inhoud]

Geef je bevindingen in het output formaat dat in jouw skill-beschrijving staat.
```

De 8 agents (spawn parallel):
- **Dev Lead** → skill: `.claude/team/dev-lead.md`
- **React Architect** → skill: `.claude/team/react-architect.md`
- **Backend Engineer** → skill: `.claude/team/backend-engineer.md`
- **Security Engineer** → skill: `.claude/team/security-engineer.md`
- **UI Engineer** → skill: `.claude/team/ui-engineer.md`
- **Release Manager** → skill: `.claude/team/release-manager.md`
- **Refactor Specialist** → skill: `.claude/team/refactor-specialist.md`
- **Design Lead** → skill: `.claude/team/design-lead.md`

## Stap 4: Team Lead synthetiseert

Wacht tot alle 8 agents klaar zijn. Spawn dan 1 Team Lead agent:

```
Jij bent de Team Lead. [VOLLEDIGE INHOUD VAN .claude/team/team-lead.md]

Hier zijn de bevindingen van je 8 teamleden:

[ALLE RESULTATEN VAN DE 8 AGENTS]

Maak het eindrapport in jouw output formaat.
```

## Stap 5: Toon eindrapport

Toon het volledige rapport van de Team Lead aan de gebruiker.
