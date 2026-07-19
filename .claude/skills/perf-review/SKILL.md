---
name: perf-review
description: >-
  Meet en verklaart laadtijden die de gebruikerservaring raken — tab-switches en
  paginaladingen. Meet eerst app-breed (screening), rekent de tijd daarna toe aan
  SQL / backend / netwerk / client-berekening / render, en zoomt alleen in op de
  traagste acties. Vergelijkt tegen een baseline in test-reports/perf-baseline.json.
  Gebruik bij "perf check", "performance controleren", "waarom is dit traag",
  "laadtijden meten", "tab-switch traag", "/perf-check".
---

# Performance Review

> **Doel:** een getal én de oorzaak. Meten alleen levert "de tab duurt 1,2 s"; deze skill
> levert "1,2 s waarvan 850 ms `tb_read_sql`" met de plek in de code erbij.
>
> **Verwant:** `ui-design-review` (visuele consistentie), `browser-feature-test` (functioneel gedrag).
> Deze skill kijkt uitsluitend naar snelheid.

## Omgeving

Werkt in **Cursor** (`.cursor/skills/perf-review/`) en **Claude Code** (`.claude/skills/`,
plus `/perf-check`). Wat je kunt meten hangt af van de beschikbare tools:

| Tool aanwezig | Gevolg |
|---------------|--------|
| `browser_console_messages` | **Volledige meting.** De app logt zichzelf — dit is de hoofdweg (zie stap 1) |
| `browser_network_requests` | Server-Timing-headers → SQL-toerekening |
| evaluate / JS uitvoeren | Optioneel, preciezer: `window.__perf.*` in plaats van console-parsen |
| geen browser-tools | Alleen statische analyse — vermeld **"static only"** en sla stap 1–2 over |

De meetweg via de console is bewust de standaard: die werkt in beide omgevingen. Ga niet uit
van een evaluate-tool.

## Modi

| Modus | Wanneer | Wat |
|-------|---------|-----|
| `screening` (default) | Periodiek, vóór een PR, bij "voelt traag" | Alle routes + tabs meten, ranglijst, toerekening, rapport |
| `drilldown` | Na screening, op één trage actie | Component-niveau: React `<Profiler>`, tijdelijke `measure()`/`time()` |
| `regression` | Na een feature | Alleen de baseline-acties hermeten en vergelijken |

Bij twijfel: `screening`.

---

## Workflow

```
Perf Progress:
- [ ] Stap 0: Voorbereiding (env-check, doel-inventaris)
- [ ] Stap 1: Meten (screening over routes + tabs)
- [ ] Stap 2: Toerekenen (SQL / backend / netwerk / client / render)
- [ ] Stap 3: Diagnose in de code (alleen top 3)
- [ ] Stap 4: Rapport + baseline
- [ ] Stap 5: Meetgaten dichten
```

---

## Stap 0 — Voorbereiding

1. **Env-check.** De metingen werken alleen als `PERF_ENABLED` aan staat: `import.meta.env.DEV`,
   of `VITE_APP_ENV` is `dev` of `preview`. Op productie is er geen `window.__perf` en geen HUD.
   - Draait de dev-server? `curl -s -o /dev/null -w "%{http_code}" http://localhost:5178`
   - **DOWN** → meld aan de gebruiker, start hem NIET zelf.
2. **Doel-inventaris opstellen.** Niet hardcoden — lees het uit de code, want routes en tabs veranderen:
   - Routes: `<Route path=...>` in `src/App.jsx` (authenticated: `/`, `/admin`, `/bi`, `/rccp`)
   - Tabs: `TabList` / `<Tab` in `src/components/layout/AppLayout.jsx`,
     `src/components/bi/BoardSplitView.jsx`, `src/components/admin/datamodel/AdminDataModel.jsx`
   - Elke tab en route is één **actie** in het rapport.
3. **Baseline laden** als `test-reports/perf-baseline.json` bestaat — die stuurt de beoordeling in stap 4.

---

## Stap 1 — Meten

De app **logt zichzelf**: de observers in `src/utils/perf.js` installeren zich in dev/preview en
schrijven naar de console. Je hoeft niets op te starten en geen JS te injecteren.

| Consoleregel | Bron | Geeft |
|--------------|------|-------|
| `[perf] interaction {…}` | Event Timing | Doelelement + opsplitsing inputDelay / processing / render |
| `[perf] longframe {…}` | Long Animation Frames | Blokkerend script met bestand + functienaam |
| `[perf] navigation {…}` | Navigation Timing | ttfb / domContentLoaded / load / transferKB per paginalading |
| `[perf] measure <label> → …ms` | `measure()` | Client-berekening |
| `[api] GET /path → 200 in …ms` | `apiRequest` | Netwerk + backend per call |

Alleen interacties trager dan 100 ms worden gelogd — een stille console betekent "snel genoeg",
niet "kapot".

Per actie:

```
1. browser_click op de tab/link  → de echte interactie
2. browser_wait_for              → wacht op een element dat pas ná de data verschijnt
3. browser_console_messages      → lees de [perf]- en [api]-regels van déze actie
4. browser_network_requests      → Server-Timing-headers (SQL-labels)
```

**Klik echt** — navigeer niet via de URL. Zonder echte klik is er geen Event Timing-entry en
verlies je de interactie-meting volledig.

Bij een **paginalading** (eerste load, harde refresh) gebruik je de `[perf] navigation`-regel;
die verschijnt vanzelf na het load-event.

Meet elke actie **3×** en noteer de mediaan. Een enkele meting is ruis: koude cache, JIT,
achtergrond-sync. Noteer de eerste meting apart als die sterk afwijkt — dat is je koude-start.

> **Heb je wél een evaluate-tool?** Dan is `window.__perf.timings()` / `.navigation()` /
> `.reset()` / `.dump()` sneller en preciezer dan console-parsen. De buffer houdt 40 entries
> vast — `reset()` vlak vóór de klik, uitlezen direct erna. Zie `reference.md`.

---

## Stap 2 — Toerekenen

Dit is de kern van de skill. Splits elk gemeten totaal in vijf posten:

| Post | Bron | Betekenis |
|------|------|-----------|
| **SQL** | `time()`-labels in Server-Timing (`tb_read_sql`, `bi_aggregate`, …) | Query-tijd |
| **Backend-overig** | `app` minus de som van de labels | Route-logica, serialisatie, of **ongemeten** code |
| **Netwerk** | `apiRequest`-duur minus `app` | Transport, TLS, payload-grootte |
| **Client-berekening** | `measure()`-entries (`method: 'ui'`) | Board opbouwen, filteren, sorteren |
| **Render** | Restant van de interactie-duur | React commit + browser paint |

Zie `reference.md` voor de complete labelinventaris en de rekenregels.

Wijs per actie de **dominante post** aan. Die bepaalt stap 3 volledig — 900 ms SQL en 900 ms
render zijn totaal verschillende problemen en je zou de verkeerde code gaan lezen.

Let op deze twee valkuilen:
- **Gestapelde labels.** Gelijknamige `time()`-labels tellen op in de header. Een `tb_lookups`
  van 600 ms kan één trage query zijn óf 40 keer 15 ms (N+1). Check het aantal entries.
- **Groot backend-overig.** Als `app` veel hoger is dan de som van de labels, is de route
  grotendeels ongemeten. Dan is de conclusie niet "de route is traag" maar "hier ontbreekt
  instrumentatie" → stap 5.

---

## Stap 3 — Diagnose in de code

Alleen voor de **top 3** acties. Niet alles uitdiepen.

### Dominant: SQL

1. Zoek het `time()`-label op in `server/services/` of `server/routes/` (zie `reference.md`).
2. Lees de query: `SELECT *` waar een kolomselectie volstaat, ontbrekende `WHERE`, joins over
   de hele `tb_cache`, geen paginering.
3. Bepaal het rijaantal. 200 rijen traag → index-probleem. 200.000 rijen traag → ontwerpprobleem.
4. Vraag het uitvoeringsplan op bij MSSQL (scan vs seek, ontbrekende index) — zie `reference.md`.
5. N+1 herkennen: hetzelfde label dat meerdere keren per request bijdraagt.

### Dominant: netwerk

- Refetch bij elke tab-switch die uit cache had gekund — de klassieker bij trage tabs.
- Waterfall: sequentiële `await`s die `Promise.all` hadden kunnen zijn.
- Payload-grootte: een respons van megabytes is transport-tijd, geen query-tijd.
- Raw `fetch` buiten `apiRequest` — dan mis je de meting sowieso (ESLint waarschuwt hierop).

### Dominant: client-berekening

- Ontbrekende `useMemo` / `useCallback` rond board-berekeningen.
- Volledige herberekening bij een wijziging die maar één rij raakt.
- Zwaar werk in de render-body in plaats van in een effect of memo.

### Dominant: render (het restant)

- Long Animation Frames wijst script + regel aan — begin daar.
- Te veel DOM-nodes; ontbrekende virtualisatie bij lange lijsten.
- Is het diffuus (geen enkel script springt eruit) → dat is precies het geval voor modus `drilldown`.

---

## Stap 4 — Rapport + baseline

1. Rapport in `test-reports/perf-review-<datum>.md` volgens [report-template.md](report-template.md).
2. Sorteer bevindingen op **geschatte winst**, niet op ernst-label. Een 40%-versnelling van een
   actie die niemand doet is minder waard dan 15% op de tab die de hele dag open staat.
3. Elke bevinding bevat: gemeten getal, toegerekende oorzaak, plek in de code, geschatte winst.
4. **Baseline wegschrijven/bijwerken:** `test-reports/perf-baseline.json` met per actie de mediaan
   en de vijf posten. Bestond er al een baseline, vergelijk dan:

   | Verschil | Oordeel |
   |----------|---------|
   | > +25% of > +200 ms | **REGRESSIE** — benoem de post die groeide |
   | −25% … +25% | Stabiel |
   | < −25% | Verbetering — noteer wat het veroorzaakte |

   Verzin **geen** absolute budgetten. Zonder baseline is het oordeel "gemeten, nog geen
   vergelijking" — dat is een geldige uitkomst voor de eerste run.

> **Geen automatische fixes.** Perf-fixes zijn gedragswijzigingen: cachen betekent kiezen wanneer
> je stale data accepteert. De skill stopt bij het voorstel; de gebruiker beslist.

---

## Stap 5 — Meetgaten dichten

De enige wijzigingen die deze skill zelf voorstelt zijn metingen, geen optimalisaties:

- Backend-route zonder `time()` die dominant bleek → wrap de zware suboperatie in
  `time('label', () => ...)` uit `server/utils/timing.js`.
- Client-berekening die in "render" verdween → wrap in `measure('label', () => ...)` uit
  `src/utils/perf.js`.

Doe dit als aparte, kleine commit vóór de eigenlijke optimalisatie. De volgende run is dan
conclusief in plaats van suggestief.

---

## Modus `drilldown`

Alleen als stap 2 "render" of "client" als dominant aanwees én stap 3 geen enkele hotspot vond.

1. Wrap de verdachte subtree in React's `<Profiler>`; sluis `onRender` → `recordApiTiming()` zodat
   het in dezelfde buffer landt als de rest (zie `reference.md`).
2. Meet opnieuw, lees `actualDuration` per commit.
3. **Haal de wrapper daarna weg**, tenzij het een blijvende hotspot bleek — dan blijft er een
   permanente `measure()` staan.

Dit kost een tijdelijke codewijziging. Meld dat expliciet aan de gebruiker vóór je begint.

---

## Foutafhandeling

| Situatie | Actie |
|----------|-------|
| `window.__perf` is undefined | Verkeerde env (productie-build) of oude bundel — check `VITE_APP_ENV`, herlaad hard |
| Geen browser-tools beschikbaar | Alleen statische analyse; vermeld **"static only"** en sla alle meetstappen over |
| Dev-server draait niet | Meld aan gebruiker, start NIET zelf |
| Geen Server-Timing-header | Achter een proxy die headers stript, of de route mist de middleware — noteer als meetgat |
| Metingen lopen sterk uiteen (>3×) | Achtergrond-sync of koude cache; meet 5× en meld de spreiding |
| Auth-redirect bij navigatie | Sessie verlopen — vraag de gebruiker handmatig in te loggen, meet daarna |

## Best practices

- **Één ding tegelijk meten.** Geen HMR-reload, geen open DevTools-profiler tijdens de meting.
- **Koud en warm apart.** De eerste klik op een tab is bijna altijd trager; rapporteer beide.
- **Meet op preview, niet alleen lokaal.** Lokaal is er geen netwerklatentie richting Azure;
  transport-problemen zie je pas op een preview-URL.
- **Rapporteer wat je niet kon meten.** Een ongemeten route is een bevinding, geen weglating.
</content>
</invoke>
