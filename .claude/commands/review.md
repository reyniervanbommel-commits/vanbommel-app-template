# /review — Team review uitvoeren

Dispatch de relevante teamleden parallel op basis van de gewijzigde bestanden:

**Altijd:** Dev Lead, Security Engineer, Refactor Specialist

**Bij frontend-wijzigingen:** + React Architect, UI Engineer, Design Lead

**Bij backend-wijzigingen:** + Backend Engineer

**Bij CI/CD-wijzigingen:** + Release Manager

Instructie per agent:
```
Lees .claude/team/<agent>.md voor je persona.
Lees de gewijzigde bestanden op de huidige branch.
Geef je review in het formaat uit je persona-bestand.
Stel geen vragen — geef je review op basis van wat je ziet.
```

Daarna: dispatch Team Lead synthese met alle review-outputs.

Eindoordeel: 🟢 GOEDGEKEURD / 🟡 CONDITIONEEL / 🔴 GEBLOKKEERD
