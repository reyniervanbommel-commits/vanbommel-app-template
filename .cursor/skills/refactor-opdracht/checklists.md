# Refactor checklists

## Pre-flight

Doorloop voor je begint met refactoren:

### Analyse
- [ ] Bestandsgroottes gescand (zie [analysis-commands.md](analysis-commands.md))
- [ ] State-telling per component uitgevoerd
- [ ] Circulaire dependencies gecontroleerd
- [ ] Complexiteit-hotspots geidentificeerd
- [ ] Import-relaties in kaart gebracht

### Scope
- [ ] Concrete pijnpunten benoemd (max 5)
- [ ] Meetbare doelen geformuleerd (niet "betere code")
- [ ] Refactor-type gekozen via [beslisboom](decision-tree.md)
- [ ] Juist patroon geselecteerd uit referentiebestanden

### Voorbereiding
- [ ] Werkruimte aangemaakt via `superpowers:using-git-worktrees` (branch: `refactor/<korte-beschrijving>`)
- [ ] Checkpoint commit gemaakt van huidige staat (voor rollback)
- [ ] Huidige tests draaien groen (indien test-suite aanwezig)
- [ ] Huidige build slaagt
- [ ] Bestandsgrootte van doelbestanden genoteerd (baseline)

### Rollback-strategie
- Bij falen halverwege een refactor: `git stash` of `git checkout` naar checkpoint commit
- Werk in kleine commits zodat je per stap kunt terugdraaien
- Test na elke iteratie, niet pas aan het eind

---

## Per-iteratie

Doorloop na elke individuele wijziging:

### Correctheid
- [ ] Lint slaagt (geen nieuwe warnings/errors)
- [ ] Bestaande tests slagen (indien test-suite aanwezig; anders handmatig verifiëren)
- [ ] Geen functionele regressie (zelfde input geeft zelfde output)
- [ ] Dependency-graph gecontroleerd (geen nieuwe cycles)
- [ ] Geen console.log/debugger statements toegevoegd

### Kwaliteit
- [ ] Gewijzigd bestand blijft onder hard max (zie regellimieten per bestandstype in SKILL.md)
- [ ] Nieuwe modules hebben duidelijke, smalle interface
- [ ] Handlers/afgeleide data gestabiliseerd (useCallback/useMemo waar nodig)

### Documentatie
- [ ] Iteratie-log bijgewerkt: probleem, aanpak, effect
- [ ] Commit gemaakt met juiste prefix: `refactor(<scope>): <beschrijving>`

---

## Post-flight

Doorloop wanneer alle iteraties afgerond zijn:

### Technische verificatie
- [ ] `npm run lint` slaagt (indien beschikbaar)
- [ ] Tests slagen (indien test-suite aanwezig; anders handmatig kernfunctionaliteit verifiëren)
- [ ] `npm run build` slaagt
- [ ] Geen circulaire dependencies (via `npx madge --circular src/` of handmatige controle)
- [ ] Geen console.log/debugger statements achtergebleven
- [ ] Geen ongebruikte imports achtergebleven

### Kwantitatieve checks
- [ ] Alle bestanden onder hard max (zie regellimieten per bestandstype in SKILL.md)
- [ ] Alle componenten: 5-9 useState → custom hook overwogen; 10+ → verplicht in custom hook
- [ ] Alle componenten max 10 props
- [ ] JSX nesting max 4 niveaus

### Deliverables
- [ ] Wijzigingslijst opgesteld (een regel per bestand) — altijd verplicht
- [ ] Ontwerpnotitie opgesteld — alleen bij P1/P2 of > 3 bestanden
- [ ] Risico's en open vragen gedocumenteerd — alleen bij P1/P2 of > 3 bestanden
- [ ] Test-impact checklist ingevuld — alleen bij P1/P2 of > 3 bestanden

### Afronding
- [ ] Versienummer verhoogd (PATCH voor refactor) — indien het project een zichtbaar versienummer heeft
- [ ] Alle commits hebben correcte prefix
- [ ] Branch is klaar voor review/merge

---

## Review

Doorloop bij het reviewen van een refactor (eigen of van anderen):

### Structuur
- [ ] Elke module heeft een duidelijke, enkele verantwoordelijkheid
- [ ] Publieke API per module is minimaal (alleen wat nodig is)
- [ ] Geen god-modules (10+ exports uit verschillende domeinen)
- [ ] Dependencies stromen in een richting (geen cycles)

### Correctheid
- [ ] Geen stille semantiekwijzigingen (behavior changes zijn expliciet gemarkeerd)
- [ ] Error handling is behouden of verbeterd
- [ ] Edge cases zijn afgedekt (null, empty arrays, error states)

### Testbaarheid
- [ ] Pure logica is gescheiden van side-effects
- [ ] Modules zijn testbaar zonder verborgen singletons
- [ ] Dependencies zijn injecteerbaar waar nodig
- [ ] Test coverage is niet gedaald (indien test-suite aanwezig)

### Code kwaliteit
- [ ] Geen over-abstractie (geen wrappers voor eenmalig gebruik)
- [ ] Naamgeving is consistent en beschrijvend
- [ ] Geen TODO's of FIXME's achtergelaten zonder issue/ticket
- [ ] Diff is schoon: geen formatting-changes gemixed met logica-changes
