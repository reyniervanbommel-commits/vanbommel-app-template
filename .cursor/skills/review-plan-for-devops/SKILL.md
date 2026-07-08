---
name: review-plan-for-devops
description: >-
  Kritische, read-only review van een implementatieplan in .cursor/plans/ vóór
  het naar Azure DevOps gaat. Denkt eerst inhoudelijk mee — komt altijd met
  concrete suggesties om het plan functioneel completer en pragmatischer/simpeler
  te maken — en toetst daarna of het plan voldoet aan de voorwaarden van
  post-plan-to-devops (vertaalbaar naar work item + stories) én develop-from-devops
  (autonoom bouwbaar zonder vragen), inclusief het perspectief van de review-agents
  die aan het eind van develop-from-devops langskomen. Levert een go/no-go-oordeel
  met concrete plan-fixes en verbeterideeën. Gebruik bij "review dit plan", "is dit
  plan klaar voor DevOps", "toets het plan", "kritisch naar het plan kijken",
  "plan-check".
---

# Review Plan for DevOps

## Doel

Een plan is pas klaar om te posten als het straks **zonder tussenkomst** door de
hele straat komt: `post-plan-to-devops` → `develop-from-devops` (full) →
team-review → PR. Deze skill is de **poort daarvóór**. Ze wijzigt standaard geen
code en post niets — ze **beoordeelt** het plan en geeft een concrete lijst met
wat er in het plan moet worden aangevuld voordat het door mag.

Kernvraag: *"Kan een autonome agent dit plan bouwen zonder één vraag te stellen,
en overleeft het resultaat de team-review aan het eind?"* Zo niet → benoem elke
lacune als plan-fix.

## Wanneer gebruiken

- Na het brainstormen/schrijven van een plan, vóór `post-plan-to-devops`.
- Als de gebruiker twijfelt of een plan "af" is.
- Triggers: *"review dit plan"*, *"is dit plan klaar voor DevOps"*, *"toets het
  plan"*, *"plan-check"*, *"kritisch naar het plan kijken"*.

## Werkwijze

1. **Bepaal het planbestand.** Genoemd pad → gebruik dat. Anders het meest recent
   gewijzigde bestand in `.cursor/plans/`. Een `dev_`-prefix betekent dat het al
   in DevOps staat — meld dat en stop, tenzij de gebruiker een her-review wil.
2. **Lees het plan volledig** en de bestanden/paden die het noemt (verifieer dat
   genoemde bestanden, tabellen, kolommen en routes echt bestaan — een plan dat
   naar niet-bestaande code verwijst is niet bouwbaar).
3. **Toets tegen de lenzen** hieronder. Begin met **Lens 0** (inhoudelijke
   kritiek — het belangrijkste deel: maak het plan functioneel beter en
   pragmatischer), daarna de drie conformiteits-lenzen A/B/C. Wees streng en
   concreet: elk gebrek verwijst naar de exacte plek in het plan en de fix, elke
   suggestie beschrijft het betere alternatief.
4. **Geef het oordeel** in het uitvoerformaat onderaan.
5. **Bied aan de plan-fixes toe te passen** (het plan in `.cursor/plans/` te
   bewerken). Doe dit alleen na akkoord — post nooit zelf naar DevOps; dat is de
   taak van `post-plan-to-devops` ná een 🟢.

Dit is een **read-only analyse-skill**: standaard geen code- of DevOps-mutaties.

## Vanuit welke rollen je kijkt (altijd, bij elke lens)

Bekijk het plan consequent door **drie petten** — laat elke pet apart spreken, zodat
de review niet vervlakt tot "ziet er goed uit":

- 🧑‍💻 **Senior software developer** — correctheid, edge cases/foutpaden,
  onderhoudbaarheid, testbaarheid, code-niveau-pragmatiek, hergebruik. "Klopt dit
  en is het niet onnodig ingewikkeld om te bouwen en te onderhouden?"
- 🏛️ **Senior software architect** — systeemgrenzen, coupling, dataflow, fit met de
  bestaande architectuur (bijv. de `tb_*`/`po_*`-lagen), langetermijngevolgen,
  uitbreidbaarheid. "Past dit in het geheel en welke schuld bouwen we op?"
- 🎨 **UI-specialist** — interactie/UX, Fluent UI v9-patronen en valkuilen,
  toegankelijkheid, duidelijke hiërarchie, Nederlandse labels. "Snapt en gebruikt
  de eindgebruiker dit soepel?"

Deze petten voeden vooral **Lens 0**, maar gelden overal: waar een pet iets ziet,
benoem je het onder die rol. (Ze overlappen bewust met de `.claude/team/`-persona's
uit Lens C — de petten zijn het senior-niveau, Lens C is de fijnmazige
regel-toets per teamlid.)

---

## Lens A — Vertaalbaar naar DevOps (voorwaarden `post-plan-to-devops`)

Kan `post-plan-to-devops` het plan één-op-één omzetten naar een DevOps-document +
work item? Controleer:

- [ ] **Bestandsnaam** volgt `YYYY-MM-DD-naam.plan.md` en heeft (nog) **geen**
      `dev_`-prefix.
- [ ] **`#` H1-heading aanwezig** — die wordt de work-item-titel. Ontbreekt → fix.
- [ ] **Doel in één zin** af te leiden (kop van het DevOps-document).
- [ ] **User story** construeerbaar: *Als \<doelgroep> wil ik \<wat> zodat
      \<business value>*. Ontbreekt de business-value/waarom → fix.
- [ ] **Acceptatiecriteria** ("definitie van klaar") aanwezig en **toetsbaar** —
      geen vage criteria als "werkt goed". Elk criterium moet objectief te
      verifiëren zijn.
- [ ] **Hiërarchie beslisbaar**: is dit een **brede feature** (≥3 logische
      deelgebieden / meerdere iteraties → Feature + child User Stories) of een
      **afgebakende wijziging** (< 3 deelgebieden → één User Story)? De structuur
      van het plan (fasen/onderdelen) moet die knip mogelijk maken.
- [ ] **Per child-story eigen acceptatiecriteria** af te leiden (bij brede
      feature). Een fase zonder eigen "klaar"-definitie is geen story.
- [ ] **Tags** af te leiden (korte lowercase termen, `;`-gescheiden).
- [ ] **"Wat is al gedaan"** waar relevant met bestandspaden benoemd, zodat er
      geen dubbel werk als task ontstaat.

---

## Lens 0 — Is dit het juiste, beste plan? (inhoudelijke kritiek) ⭐

**De belangrijkste lens.** De andere lenzen toetsen of het plan *vormtechnisch*
door de straat komt; deze lens toetst of het plan *inhoudelijk deugt*. Neem hier
de rol van een kritische, ervaren collega die het plan beter wíl maken — niet
afvinken, maar meedenken. Lever altijd concrete, betere suggesties op. Denk langs
drie assen:

### Functioneel — klopt het en is het compleet?
- **Ontbrekende scenario's**: edge cases, foutpaden, lege staat, gelijktijdigheid,
  migratie van bestaande data, rechten/rollen. Wat gebeurt er als de happy path
  niet loopt? Benoem elk gat.
- **Lost het het echte probleem op?** Sluit de oplossing aan op de business-waarde
  uit de user story, of lost het een symptoom op? Mist het een use-case die de
  gebruiker straks meteen zal missen?
- **Consistentie met de bestaande app**: past dit bij hoe vergelijkbare features
  nu werken, of introduceert het een afwijkend patroon zonder reden?

### Pragmatisch — kan het simpeler, slimmer, of via een andere route?
- **Over-engineering / YAGNI**: bouwt het plan abstractie, configureerbaarheid of
  generiekheid die nu niemand nodig heeft? Stel de simpelere variant voor.
- **Scope**: kan de feature in een kleinere eerste versie die 80% van de waarde
  levert, met de rest als vervolg-story? Splits als dat de levering versnelt.
- **Hergebruik**: bestaat er al code/patroon/component dat dit grotendeels
  oplost? Verwijs ernaar in plaats van opnieuw bouwen.
- **Eenvoudiger alternatief**: is er een aanpak met minder bewegende delen,
  minder bestanden, of minder risico die hetzelfde doel haalt? Beschrijf hem.
- **Andere route (out of the box)**: is er een fundamenteel andere aanpak — ander
  mechanisme, andere laag, een bestaande tool/feature/dienst hergebruiken — die
  het doel **beter, sneller, duurzamer of slimmer** haalt dan wat het plan nu
  kiest? Denk hier bewust buiten de gekozen oplossingsrichting: niet "maak dit
  plan simpeler", maar "moet dit plan misschien een heel andere kant op?".
  Beschrijf die route concreet, ook als dat het plan flink omgooit.

### Waarde & risico — de moeite waard, en wat kan misgaan?
- **Kosten/baten = complexiteit vs. waarde.** De "kosten" zijn hier **uitsluitend
  complexiteit** — bouw- en onderhoudslast, extra bewegende delen, coupling,
  cognitieve last. Bouwtijd en geld tellen **niet** mee (die zijn geen argument om
  iets wel/niet te doen). De vraag is dus: *levert de toegevoegde complexiteit
  genoeg functionele waarde op?* Zo niet → stel de simpelere variant voor, ook al
  kost die net zoveel tijd om te bouwen.
- **Risico's benoemd?** Performance, data-integriteit, D365-load, backwards-compat.
  Ontbreekt een mitigatie → stel er een voor.
- **Meetbaar succes**: hoe weten we straks dat het werkt zoals bedoeld?

> Deze lens levert **suggesties** (verbeterpunten), geen harde BLOCKERs — tenzij
> het plan een aanpak kiest die aantoonbaar fout of onnodig duur is. Wees hier
> royaal met betere ideeën: dit is precies waar de review waarde toevoegt.

---

## Lens B — Autonoom bouwbaar (voorwaarden `develop-from-devops`, modus `full`)

`develop-from-devops` stelt **nooit** een vraag: bij twijfel maakt het een
aanname. Een plan met open eindes leidt dus tot ongecontroleerde aannames.
Controleer of het plan die twijfel wegneemt:

- [ ] **Geen open beslissingen.** Grep mentaal naar "TBD", "?", "te bepalen",
      "nog te beslissen", "optie A of B", "afhankelijk van feedback". Elke open
      keuze → **BLOCKER**: laat het plan de knoop doorhakken (met onderbouwing)
      of expliciet als gedocumenteerde aanname vastleggen.
- [ ] **Elke story is één afgebakende, onafhankelijk bouwbare taak** (stap 5 doet
      één story = één taak).
- [ ] **Concrete aangrijpingspunten**: het plan noemt de te wijzigen/aan te maken
      bestanden, functies, routes en tabellen bij naam. De implementer moet weten
      *waar*. Vaag ("pas de UI aan") → fix.
- [ ] **Volgorde/afhankelijkheden expliciet** (fasen), zodat stories in de juiste
      volgorde bouwen zonder halverwege vast te lopen.
- [ ] **Spec-toetsbaar**: de spec-reviewer per story controleert "voldoet aan
      acceptatiecriteria". Zijn die per story scherp genoeg om af te vinken?
- [ ] **SQL-schema-regel**: heeft de feature een **nieuwe tabel/kolom** nodig?
      Dan moet het plan een migratie `scripts/db/migrations/00N_*.sql` benoemen,
      **idempotent** (`IF NOT EXISTS`), **non-destructief**, in **dezelfde
      commit/PR** als de code die het veld gebruikt. Ontbreekt → fix. (JSON in
      bestaande layout/settings-kolommen → geen migratie nodig, benoem dat.)
- [ ] **Browser-testbaar**: minstens één acceptatiecriterium is als
      browser-interactie tegen de preview-URL te testen (stap 7). Puur
      backend-werk → benoem hoe het zichtbaar/aantoonbaar is (endpoint-respons,
      UI-effect).
- [ ] **Versie-ophoging** in `src/config/version.js` als afrondingsstap benoemd.
- [ ] **devTestItem** afleidbaar: uit titel + acceptatiecriteria kan een item in
      `src/config/devTestItems.js` worden gemaakt (stap 6a).
- [ ] **Performance-chokepoints** (CLAUDE.md): nieuwe zware backend-suboperatie →
      `time()`; nieuwe frontend backend-call → `apiRequest` (nooit raw `fetch`);
      zware client-berekening → `measure()`. Introduceert het plan zoiets zonder
      dit te benoemen → verbeterpunt.

---

## Lens C — Overleeft de team-review aan het eind (perspectief review-agents)

`develop-from-devops` stap 8 zet adaptief de review-agents in; **Dev Lead,
Security Engineer en Refactor Specialist zijn altijd relevant**. Een plan dat een
architectuur voorschrijft die deze agents straks als BLOCKER afkeuren, is nu al
niet klaar. Toets het plan tegen hun eisen (persona's in `.claude/team/`):

| Agent | Waar het plan op afgerekend wordt | Rode vlag in het plan |
|---|---|---|
| **Dev Lead** | Component ≤300 regels, ≤10 props, <5 useState, ≤4 JSX-nesting, memoization | Plan laat een al groot component (bijv. `DataPreviewTables.jsx`) verder groeien zonder splitsing te benoemen |
| **React Architect** | Logica in hooks (geen JSX), ≤3 useEffect, ≤10 return-waarden, stabiele refs, `loading`/`error` | Nieuwe data-fetch direct in een component i.p.v. via een `use*`-hook |
| **Backend Engineer** | Idempotente migraties, server-side input-validatie, geen secrets in responses, rate-limiting op auth, `requireSession`/`requireRole` op beveiligde routes | Nieuwe route zonder validatie/auth benoemd; niet-idempotente migratie |
| **Security Engineer** | Geen hardcoded secrets/connectiestrings, alles via env-vars, geen gevoelige data in localStorage, CORS correct | Plan noemt een key/connstring inline; gevoelige data in localStorage |
| **Refactor Specialist** | Geen shotgun surgery (1 wijziging → 10+ bestanden), geen verborgen singletons/global state, geen cyclische deps, pure logica gescheiden van I/O | Eén story raakt heel veel bestanden; nieuwe globale state |
| **UI Engineer** | Geen `Tooltip`/`Menu`/`Popover`/`Dialog` in lijsten/panels/herhaalde items; alle labels in het Nederlands | Plan zet een `Tooltip` in een `.map()`/tabelrij; Engelse UI-teksten |
| **Design Lead** | Fluent-tokens i.p.v. hardcoded hex, `makeStyles` i.p.v. globale CSS, rustig/premium, status = kleur **én** tekst | Plan schrijft hardcoded kleuren of globale CSS voor |
| **Release Manager** | Commit-prefix (`feat`/`fix`) + `#AB:<id>`, werk op `feature/*`, idempotente migraties, nooit direct naar `main` | Plan impliceert directe push naar `main` of vergeet migratie-idempotentie |

Selecteer de relevante agents op basis van het feature-type (frontend / backend /
infra / full-stack), plus de drie vaste. Beoordeel per relevante agent of het
plan een toekomstige BLOCKER inbouwt.

### Optioneel — diepe review met de echte persona's
Voor een grondige toets kun je de persona-agents parallel dispatchen (zoals stap
8 doet), maar dan **op het plan** in plaats van op een diff:
> Lees `.claude/team/<agent>.md` voor je persona. Beoordeel het implementatieplan
> `.cursor/plans/<bestand>`: welke van jouw regels dreigt dit plan straks te
> overtreden? Geef bevindingen in jouw formaat. Stel geen vragen.

Doe dit alleen op verzoek of bij grote/risicovolle plannen — het kost extra
tokens. Standaard volstaat de inline-toets hierboven.

---

## Uitvoerformaat

```
# Plan-review — <planbestand>

**Feature-type:** <frontend / backend / infra / full-stack>
**Voorgestelde DevOps-structuur:** <Feature + N child stories | enkele User Story>

## Readiness-matrix
| Lens | Status | Belangrijkste bevinding |
|------|--------|-------------------------|
| 0 — Inhoudelijk (functioneel/pragmatisch) | ✅/⚠️/❌ | ... |
| A — Vertaalbaar naar DevOps | ✅/⚠️/❌ | ... |
| B — Autonoom bouwbaar        | ✅/⚠️/❌ | ... |
| C — Overleeft team-review    | ✅/⚠️/❌ | ... |

## Inhoudelijke suggesties (Lens 0 — het plan beter/pragmatischer maken)
- [🧑‍💻 dev | 🏛️ architect | 🎨 UI] <observatie> → **Beter:** <concreet
  alternatief, simpeler of completer>
  (dit blok is verplicht en zelden leeg — kom altijd met verbeterideeën; tag elke
  suggestie met de pet die haar inbrengt)

## BLOCKERs (moeten in het plan opgelost vóór posten)
1. <lacune> → **Fix:** <wat concreet aan het plan toevoegen/wijzigen>
   (of "Geen blockers")

## Verbeterpunten (aanbevolen, niet blokkerend)
- <punt> → <suggestie>

## Eindoordeel
🟢 KLAAR — voer `post-plan-to-devops` uit
🟡 BIJNA — los de blockers op, dan opnieuw reviewen
🔴 NIET KLAAR — <aantal> blockers; plan mist fundamenteel <…>

## Voorgestelde plan-fixes
<concrete, plakbare tekstblokken die aan het plan toegevoegd kunnen worden —
per BLOCKER één>
```

## Belangrijke regels

- **Kritisch meedenken is de kern (Lens 0).** Kom altijd met concrete ideeën om
  het plan functioneel completer of pragmatischer/simpeler te maken — dat is de
  belangrijkste waarde van deze review, niet het afvinken van de checklists.
- **Read-only, tenzij gevraagd.** Wijzig het plan pas na akkoord; post nooit zelf
  naar DevOps.
- **Concreet, niet vaag.** Elke bevinding wijst naar de plek in het plan en de
  exacte fix — geen "kan beter".
- **Eén open beslissing = BLOCKER.** `develop-from-devops` vraagt niets; een niet
  weggenomen keuze wordt straks een ongecontroleerde aanname.
- **Verifieer verwijzingen.** Een plan dat naar niet-bestaande bestanden,
  tabellen of routes wijst, is niet bouwbaar — benoem dat als blocker.
- **Na 🟢:** wijs de gebruiker door naar `post-plan-to-devops`; na registratie
  bouwt `develop-from-devops` het.
