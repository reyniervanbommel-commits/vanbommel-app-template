---
name: browser-feature-test
description: >-
  Test nieuwe features in de browser met de cursor-ide-browser MCP.
  Voert visuele controles, interactietests, console-error checks en
  netwerk-inspectie uit op een React (Vite/CRA) app.
  Genereert een markdown testrapport.
  Gebruik wanneer de gebruiker vraagt om een feature te testen in de browser,
  een UI-test uit te voeren, of een nieuw component visueel te controleren.
  Kan ook automatisch context ophalen uit recente code-wijzigingen.
---

# Browser Feature Test

> **OTAP-straat:** gebruik `develop-from-devops` modus `test` — die roept deze workflow aan.
> **Los gebruiken:** ad-hoc UI-tests buiten de OTAP-pipeline (bijv. lokaal, zonder DevOps work item).

Test nieuwe features in de browser via de cursor-ide-browser MCP-server.
Resultaat: een markdown testrapport in `test-reports/`.

## Workflow

Kopieer deze checklist en vink af tijdens het testen:

```
Test Progress:
- [ ] Stap 0: Context ophalen (automatisch)
- [ ] Stap 1: Voorbereiding
- [ ] Stap 2: Navigatie & eerste snapshot
- [ ] Stap 3: Visuele controle
- [ ] Stap 4: Interactie tests
- [ ] Stap 5: Console & netwerk check
- [ ] Stap 6: Rapport genereren
```

---

## Stap 0 — Context ophalen (automatisch)

Als de agent net zelf code heeft geschreven of aangepast, haal automatisch de context op:

1. **Gewijzigde bestanden detecteren**:
   ```bash
   git diff --name-only HEAD
   git diff --staged --name-only
   ```
2. **Bepaal welk component/pagina geraakt is** op basis van de bestandspaden:
   - `src/components/admin/*` → `/admin` routes
   - `src/components/settings/*` → `/settings` route
   - `src/components/canvas/*` → layout-pagina's
   - `src/components/table/*` → `/table` route
   - Kijk naar de React Router configuratie als het pad niet duidelijk is
3. **Stel automatisch de test-URL samen** op basis van het geraakt component
4. **Bepaal verwacht gedrag** op basis van de code-wijzigingen (nieuwe elementen, gewijzigde teksten, API-calls)

> Als er geen recente wijzigingen zijn of de context onduidelijk is, val terug op Stap 1 (vraag het aan de gebruiker).

---

## Stap 1 — Voorbereiding

1. Vraag de gebruiker welke feature getest moet worden en op welke URL
   (standaard: `http://localhost:5173`) — **sla over als Stap 0 voldoende context gaf**
2. Bepaal de testscenario's op basis van de feature:
   - Welke elementen zijn zichtbaar?
   - Welke interacties zijn mogelijk (klikken, invullen, hover)?
   - Wat is het verwachte gedrag?
3. Controleer of de dev-server draait:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null || echo "DOWN"
   ```
   - **200** → server draait, ga verder
   - **DOWN of andere status** → meld aan gebruiker, NIET zelf starten

---

## Stap 2 — Navigatie & eerste snapshot

Voer deze acties **in volgorde** uit:

```
1. browser_tabs       → action: "list" (check bestaande tabs)
2. browser_navigate   → url: "<target-url>"
3. browser_snapshot   → (verkrijg accessibility tree + element refs)
```

**Optioneel** — als `browser_lock` beschikbaar is:
```
4. browser_lock       → (voorkom user-interactie tijdens test)
```
> Als `browser_lock` niet beschikbaar is of faalt, ga gewoon verder zonder lock.
> Meld aan de gebruiker dat ze de browser niet moeten aanraken tijdens de test.

```
5. browser_take_screenshot → filename: "test-reports/test-before.png"
```

**Belangrijk**: `browser_navigate` MOET vóór `browser_lock` — je kunt niet locken zonder actieve tab.

### Authenticatie afhandelen

Als de app authenticatie vereist (bijv. Azure AD / MSAL):

| Situatie | Actie |
|----------|-------|
| Login-pagina verschijnt na navigate | Controleer of de browser al een actieve sessie heeft (snapshot de pagina, check op login-elementen) |
| Redirect naar login.microsoftonline.com | De browser-tool kan geen externe OAuth-flows doorlopen. Meld dit aan de gebruiker en vraag om: (a) handmatig in te loggen in dezelfde browser, of (b) een test-route zonder auth te gebruiken |
| App toont "Niet geauthenticeerd" | Zelfde als hierboven — auth-state is sessie-gebonden |
| App laadt normaal met data | Sessie is actief, ga verder met testen |

> **Best practice**: Test altijd eerst of je op de juiste pagina bent geland (snapshot + check op verwachte elementen) voordat je verdergaat met Stap 3. Als je op een login-pagina bent beland, stop de test en rapporteer dit.

---

## Stap 3 — Visuele controle

Controleer met de snapshot:

| Check | Hoe |
|-------|-----|
| Element aanwezig | Zoek element in snapshot tree |
| Tekst correct | Vergelijk tekst in snapshot met verwachte waarde |
| Element zichtbaar | `browser_is_visible` met ref |
| Layout / stijl | `browser_take_screenshot` en visuele inspectie |
| Responsiveness | `browser_resize` naar 375x667 (mobiel), screenshot, dan terug naar 1280x720 |

Noteer elk resultaat als PASS of FAIL met korte beschrijving.

---

## Stap 4 — Interactie tests

Test gebruikersinteracties op basis van de feature:

### Klik-acties
```
browser_snapshot  → verkrijg ref van doelelement
browser_click     → element: "<beschrijving>", ref: "<ref>"
browser_wait_for  → time: 1 (kort wachten op UI-update)
browser_snapshot  → includeDiff: true (vergelijk voor/na)
```

### Formulier invullen
```
browser_snapshot  → verkrijg ref van input-veld
browser_fill      → element: "<beschrijving>", ref: "<ref>", value: "<testwaarde>"
browser_snapshot  → controleer of waarde is ingevuld
```

### Hover-effecten
```
browser_hover     → element: "<beschrijving>", ref: "<ref>"
browser_snapshot  → controleer hover-state (tooltips, dropdowns)
```

### Scrollen
```
browser_scroll    → direction: "down", amount: 500
browser_snapshot  → controleer lazy-loaded content
```

### Navigatie
```
browser_click     → op link/button die navigeert
browser_wait_for  → text: "<verwachte tekst op nieuwe pagina>"
browser_snapshot  → controleer nieuwe pagina
```

Noteer elk resultaat als PASS of FAIL.

---

## Stap 5 — Console & netwerk check

### Console errors
```
browser_console_messages → controleer op errors/warnings
```

Beoordeling:
- **Geen errors/warnings** → PASS
- **Warnings** → PASS met opmerking
- **Errors** → FAIL, noteer de foutmelding

Bekende ruis die je kunt negeren:
- `[HMR]` messages (Vite hot module reload)
- `DevTools` warnings
- Third-party script warnings (analytics, fonts)

### Netwerk requests
```
browser_network_requests → controleer API-calls
```

Controleer:
- Zijn verwachte API-calls uitgevoerd?
- Status codes (200/201 = ok, 4xx/5xx = probleem)
- Onverwachte failed requests?
- 401/403 responses → authenticatie-probleem (zie Stap 2)

---

## Stap 6 — Rapport genereren

1. Ontgrendel de browser (als gelocked): `browser_unlock`
2. Genereer het rapport in `test-reports/` met het template uit [report-template.md](report-template.md)
3. Bestandsnaam: `test-reports/test-report-<feature-naam>-<datum>.md`
4. Screenshots ook opslaan in `test-reports/`

---

## Foutafhandeling

| Situatie | Actie |
|----------|-------|
| Dev-server draait niet | Meld aan gebruiker, NIET zelf starten |
| Auth-redirect na navigate | Stop test, rapporteer, vraag gebruiker om handmatig in te loggen |
| Element niet gevonden | Noteer als FAIL, probeer alternatieve selector |
| Timeout bij wait_for | Verhoog timeout tot 10s, dan FAIL |
| browser_lock niet beschikbaar | Ga verder zonder lock, vermeld in rapport |
| Browser lock mislukt | Controleer of er een tab open is, ga verder zonder lock |
| Onverwachte dialog | `browser_handle_dialog` met accept: true |
| Pagina laadt leeg (wit scherm) | Check console voor JS errors, neem screenshot, FAIL |

## Wachtstrategie

Gebruik korte incrementele waits in plaats van één lange wacht:
```
browser_wait_for → time: 1
browser_snapshot → check of klaar
(herhaal indien nodig, max 3x)
```

> **Best practice**: Na een klik die een API-call triggert, wacht op een specifiek element
> (`browser_wait_for → text: "Opgeslagen"`) in plaats van een vaste tijd. Dit is betrouwbaarder
> en sneller dan time-based waits.

---

## Best practices

### Test-isolatie
- Test één feature per run — mix niet meerdere onafhankelijke features
- Begin elke test met een verse navigatie naar de pagina (geen aannames over bestaande state)
- Als de test data wijzigt (POST/PUT/DELETE), vermeld dit in het rapport zodat de gebruiker weet dat de state is veranderd

### Snapshot-gebruik
- Maak altijd een snapshot **voor** en **na** elke interactie — dit maakt het rapport reproduceerbaar
- Gebruik `includeDiff: true` na interacties om te zien wat er veranderd is
- Bewaar screenshots met beschrijvende namen: `test-reports/admin-analytics-before-click.png` in plaats van `test-1.png`

### Rapportage
- Rapporteer FAIL-resultaten met genoeg context om het probleem te reproduceren (stappen, verwacht vs. werkelijk)
- Voeg console errors letterlijk toe aan het rapport (niet samenvatten)
- Bij een PASS: benoem kort wat je gecontroleerd hebt, niet alleen "PASS"

### Scope beperken
- Test alleen wat relevant is voor de gewijzigde feature — niet de hele applicatie
- Als je een onverwachte bug vindt die niet gerelateerd is aan de feature, noteer het als "Opmerking" in het rapport maar markeer het niet als FAIL voor deze test
- Responsive testing is optioneel tenzij de wijziging layout-gerelateerd is

---

## Testcategorieën referentie

Voor gedetailleerde checklists per type test, zie [reference.md](reference.md).
