# PO-board verticaal scrollen — analyse & oplossingsplan

> **Status:** analyse afgerond, fix geïmplementeerd én weer teruggedraaid uit de codebase (op expliciet verzoek — de code moest weg, dit document blijft over als overdracht). Niets van onderstaande code staat nog in `develop` of op een feature-branch.
> **Doel van dit document:** een andere agent moet dit vanaf nul kunnen reproduceren zonder de hele analyse opnieuw te hoeven doen.
> **Herkomst:** de originele commits bestaan nog in de git-historie (zie "Originele commits" onderaan) en kunnen 1-op-1 bekeken of gecherry-picked worden.

---

## 1. Aanleiding

Gebruiker zag op de PO-tabel-pagina een opvallend **dunne verticale scrollbalk** en concludeerde daaruit dat mogelijk alle ~2000 regels direct in de DOM zaten en bij elke scroll mee moesten renderen.

## 2. Analyse — wat bleek waar en niet waar

### 2.1 De dunne scrollbalk is GEEN bewijs van een probleem

Code-onderzoek van de bestaande implementatie liet zien dat de board **al volledig gevirtualiseerd** is:

- [`src/hooks/useBoardRowWindow.js`](../../src/hooks/useBoardRowWindow.js) — custom windowing-hook: binary search over rij-offsets, houdt alleen `[start, end)` + overscan (14 rijen) gemount, rest van de scrollhoogte wordt opgevuld met twee lege `<tr>`-spacers (`topPadPx`/`bottomPadPx`). Ondersteunt variabele rijhoogtes (voor uitgeklapte orders) via een `rowHeights`-array.
- [`src/components/supplier/PurchaseOrdersBoardRows.jsx`](../../src/components/supplier/PurchaseOrdersBoardRows.jsx) — gebruikt die hook, plus sticky/pinned groep-headers die apart teruggemount worden als hun eigen slot buiten het venster valt.
- Rijen en cellen zijn `React.memo`'d met custom equality-checks (`areBoardCellPropsEqual` in [`PurchaseOrderBoardRow.jsx`](../../src/components/supplier/PurchaseOrderBoardRow.jsx)).
- Dit is L5-niveau virtualisatie (zie `perf-backlog.json` BL-005-notitie: "Al geoptimaliseerd (L5 windowing v1.3)").

De dunne scrollbar-duim is dus precies het **verwachte** gedrag van windowing (de duim weerspiegelt de virtuele totale hoogte, niet het aantal DOM-nodes) — geen bug.

### 2.2 "2000 rijen" = 2000 PO-headers, niet headers+regels samen

Uit [`purchaseOrderBoardRowSlots.js`](../../src/utils/purchaseOrderBoardRowSlots.js): elke slot in de gevirtualiseerde lijst is een groep-header óf één PO-entry (order-header). Orderregels (lines) worden **lazy per order** geladen en gerenderd, alleen wanneer die ene order wordt uitgeklapt (`PurchaseOrdersBoardExpandedRow`, zie [`PurchaseOrderBoardRow.jsx:357-363`](../../src/components/supplier/PurchaseOrderBoardRow.jsx)). Ze tellen niet mee in de 2000.

### 2.3 Databron: alles in één keer, geen server-side paging

[`usePurchaseOrdersPage.js`](../../src/hooks/usePurchaseOrdersPage.js) haalt de volledige orderset in één `GET /data/purchase-orders`-call op (met sessie-cache). Filter/sort/groepering gebeurt client-side over de volledige set (`usePurchaseOrderBoardView`). Bij ~2000 rijen is dat verwaarloosbaar (client-side filter/sort van een array van die grootte kost enkele ms).

### 2.4 Vergelijking met D365 F&O en monday.com (mondayDB)

Beide systemen scheiden **fetch/filter/sort** (server-side, gepagineerd, index-gedreven) van **render** (client-side gevirtualiseerd):

- **D365 F&O grid**: OData server-side paging (`$filter`/`$orderby` naar SQL/AOT), grid houdt alleen een venster vast.
- **monday.com / mondayDB** (bron: [engineering.monday.com](https://engineering.monday.com/nice-to-meet-you-mondaydb-architecture/)): vóór mondayDB crashte de client boven ~20k items omdat alles clientside zat. Oplossing: columnar storage server-side, filter/sort/aggregatie altijd server-side, paginering via een "Query Response ID"-snapshot (goedkope skip/take zonder her-query).

**Conclusie voor deze app:** de render-laag (virtualisatie) zit al op het niveau van deze grote systemen. De fetch-laag (alles in één keer, client-side filter/sort) is pas een probleem als het aantal PO's richting de tienduizenden gaat — ruim boven de huidige ~2000. **Geen actie nodig op dit vlak nu.**

## 3. Gemeten bewijs — er is wél echte jank

Ondanks dat de architectuur solide is, liet een **daadwerkelijke meting** zien dat er wel degelijk substantiële scroll-jank optreedt. Gebruikte tooling: skill `perf-scroll` → `playwright/perf-scroll.js`, journey **J4** ("PO board — verticaal scrollen, wheel, ~15 stappen"), metric `maxLongFrameMs` (via `[perf] longframe`-observer in [`src/utils/perf.js`](../../src/utils/perf.js), Long Animation Frame API).

Drempel: `maxLongFrameMs ≤ 80ms` wordt als "geen probleem" geskipt (`test-reports/perf-optimize-policy.json` → `scrollTargets`). Doel: 30% reductie.

| Meting | Omgeving | Runs | maxLongFrameMs (mediaan) | scrollJankMs | longframeCount |
|---|---|---:|---:|---:|---:|
| Baseline A | Azure DEV, profiel L (1740 orders) | 3 | 1970 | 4951 | 11 |
| Baseline B | Azure DEV, profiel L | 5 | 1094 | 2237 | 15 |
| Baseline C (stabielste) | Azure DEV, profiel L | **20** | **1681** | 2924 | 7 |

Alle drie ruim boven de 80ms-drempel — dit is geen meetruis, dit is echte jank. Wel valt op dat zelfs *dezelfde code* op *dezelfde instance* al een spreiding van 1094–1970ms laat zien tussen runs — de Azure Container Apps-omgeving is zelf behoorlijk ruizig (zie §5).

## 4. Root-cause hypothese en geïmplementeerde fix (tier L1, tak Render)

**Hypothese:** [`useBoardRowWindow.js`](../../src/hooks/useBoardRowWindow.js) luistert naar het native `scroll`-event op de scroll-container en roept synchroon `update()` → `setRange()` aan, **zonder animation-frame-gate**. Bij snel wheel-scrollen kan `scroll` vaker dan 1× per animation frame vuren. Elke trigger veroorzaakt een React-re-render + reconciliatie voor de nieuw gemounte rijen/cellen (per rij ~25 kolommen, waarvan meerdere Fluent UI `Tooltip`/`Badge`/`Button`-wrappers). Als dat meermaals binnen dezelfde frame-taak stapelt, verklaart dat een blokkerend frame van >1000ms beter dan alleen "nieuwe rijen mounten" (dat zou typisch tientallen–honderden ms moeten kosten, geen seconden).

Tier **L1** gekozen (niet nog meer virtualiseren — dat is al L5, zie §2.1): render-scheduling fix, laag risico, geen architectuurwijziging.

### 4.1 Exacte code-wijziging (te reproduceren)

In `src/hooks/useBoardRowWindow.js`, binnen de `useEffect` die het `scroll`-event registreert:

```js
import { measure } from '../utils/perf';
// ... (bovenaan het bestand toevoegen)

// In de useEffect, i.p.v. `update` direct als listener te registreren:

const update = () => {
  const viewH = el.clientHeight || 600;
  const scrollTop = el.scrollTop;
  const first = findStartIndex(offsets, scrollTop);
  const start = Math.max(0, first - overscan);
  const last = findEndIndex(offsets, scrollTop + viewH);
  const end = Math.min(totalCount, last + overscan);
  setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
};

// Native 'scroll' events kunnen vaker dan 1x per animation frame vuren (snel wheel/
// trackpad-input). Collapse ze tot één rAF-geplande update om te voorkomen dat meerdere
// setRange-getriggerde re-renders (rij-mount/unmount + reconciliatie) binnen één task
// stapelen — dat compound-effect kan uitmonden in lange blokkerende frames tijdens snel
// scrollen.
let rafId = null;
const scheduleUpdate = () => {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    measure('board:window-update', update);
  });
};

update(); // initiële synchrone berekening blijft direct
el.addEventListener('scroll', scheduleUpdate, { passive: true });
const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleUpdate) : null;
ro?.observe(el);
return () => {
  el.removeEventListener('scroll', scheduleUpdate);
  ro?.disconnect();
  if (rafId !== null) cancelAnimationFrame(rafId);
};
```

Dit is functioneel identiek aan wat eerder gecommit zat in `752b563` ("perf: rAF-gate scroll-window update op PO-board [BL-004 tier L1]") — zie §7 om die commit direct te bekijken/cherry-picken in plaats van over te typen.

**Trade-off:** window-update kan tot 1 frame (~16ms) later landen dan voorheen. Verwaarloosbaar, geen functionele wijziging aan wélke rijen gemount worden.

### 4.2 Bijkomende bugfix in de meettool zelf (nodig voor elke toekomstige meting)

`playwright/perf-scroll.js` navigeerde na login (en na elke per-run `page.goto`) naar de **D365F&O-integratiestatustab** in plaats van de daadwerkelijk scrollbare **"All orders"-tab** — waardoor de meting altijd faalde met "No scrollable PO container" totdat dit gefixt was. Nodig: een herbruikbare `goToAllOrders(page)`-stap die **na login én na elke pagina-reload** opnieuw draait (elke scroll-run in het script doet een verse `page.goto`, wat terugvalt op de default-tab). Zie commit `9c4c96a`.

## 5. Verificatie — inconclusief (methodologisch mankement, niet per se een mislukte fix)

Na implementatie + commit is de fix via een **preview-Container-App** (`develop-from-devops` skill, modus preview) gedeployed en gemeten:

| Meting | Omgeving | Runs | maxLongFrameMs (mediaan) | scrollJankMs | longframeCount |
|---|---|---:|---:|---:|---:|
| Na fix, koud | Preview (net aangemaakt) | 5 | 2703 | 6679 | 17 |
| Na fix, warm | Preview (herhaling) | 5 | 2442 | 4640 | 9 |
| Na fix, stabielste | Preview | **20** | **2031** | 4415 | 8 |

**Alle post-fix cijfers zijn slechter dan de pre-fix baseline (1681ms/2924ms/7 bij 20 runs).** De 30%-reductiedoelstelling is niet gehaald — sterker, er is geen enkele verbetering gemeten.

**Waarom dit niet als "fix mislukt" te lezen is zonder voorbehoud:** de vóór-meting liep op de **bestaande, allang draaiende** Azure DEV Container App; de ná-meting liep noodgedwongen op een **gloednieuwe preview-Container-App** (andere infra-instance — mogelijk andere resource-allocatie, zeker een andere opwarm-historie, ook na een expliciete "warme herhaling"). Er is in deze sessie **geen same-instance vergelijking** gelukt:

- Lokaal verifiëren kon niet: geen lokale SQL Server bereikbaar (`localhost:1433` ESOCKET, geen Windows SQL-service, geen docker-compose in de repo).
- Azure DEV zelf bleek tijdens de sessie meermaals **onstabiel**: een waargenomen redeploy (app-versie wisselde van v1.42.1 → v1.42.2 tussen twee paginaladingen), en de `/refresh/progress`-endpoint bleek **onbetrouwbaar** op een multi-replica Container App — een `POST /refresh/start` op de ene replica gevolgd door een `GET /refresh/progress` op een andere replica meldt `running:false`/`idle` terwijl de sync elders nog loopt. **Vertrouw dit endpoint niet als "klaar"-signaal — verifieer i.p.v. daarvan via een echte paginaload of de rijen/`total` daadwerkelijk aanwezig zijn.**

## 6. Aanbevolen aanpak voor een volgende poging

1. **Herimplementeer de fix** uit §4.1 (of cherry-pick `752b563`, zie §7).
2. **Fix ook meteen** de navigatiebug in `playwright/perf-scroll.js` (§4.2) — zonder die fix faalt elke meting sowieso.
3. **Verifieer same-instance, niet cross-instance.** Twee opties, in volgorde van betrouwbaarheid:
   - **Lokaal** (beste optie): start een lokale SQL Server (Docker of Windows-service), seed met `node scripts/seed-perf-po-cache.js --orders=2000 --lines=3` (profiel L = 2000 orders, zie `test-reports/perf-optimize-policy.json` → `scaleProfiles`), meet vóór/ná op **dezelfde** `localhost:5178`-instance (frontend + backend via `npm run dev:all`).
   - **Cloud, maar zelfde instance**: meet een baseline op de bestaande DEV-app, deploy de fix **naar diezelfde app** (niet een nieuwe preview-container) en meet daar opnieuw — vermijdt het cold-start/infra-verschil dat deze sessie parten speelde.
4. Gebruik minimaal **20 runs** per meting — bij 5 runs was de spreiding (1094–1970ms) te groot om iets te concluderen; bij 20 runs stabiliseerde het beeld aanzienlijk.
5. Als de rAF-gate op zichzelf geen aantoonbare winst geeft: volgende stappen op dezelfde tak (Render), in oplopende impact:
   - Overscan verlagen (nu 14, in `PurchaseOrdersBoardRows.jsx`) — minder rijen die tegelijk moeten mounten per scroll-stap, ten koste van meer zichtbare "pop-in".
   - Niet-essentiële per-cel Fluent-wrappers (met name `Tooltip` rond de product-afbeelding-cel, zie `PurchaseOrderProductImageCell.jsx`) pas mounten bij hover i.p.v. bij elke rij-mount.
   - `measure('board:window-update', ...)` (al onderdeel van de fix) gebruiken om in een volgende meting **exact** te zien hoeveel van het blokkerende frame aan de window-berekening zelf toe te schrijven is vs. aan de daaropvolgende React-reconciliatie/mount — dat onderscheid is deze sessie niet meer gemaakt.

## 7. Originele commits (nog in de git-historie, maar niet meer op enige actieve branch-tip)

Deze commits zijn met `git revert` ongedaan gemaakt (op expliciet verzoek — "verwijder de code"), maar blijven **inspecteerbaar en cherry-pickbaar** via hun SHA, ongeacht welke branch nu actueel is:

```bash
git show 9c4c96a   # fix(perf-scroll): navigeer naar All-orders tab bij elke scroll-run (J4)
git show 752b563   # perf: rAF-gate scroll-window update op PO-board [BL-004 tier L1]
git show dc1d257   # perf: verify-run BL-004 L1-fix - target niet gehaald (mogelijk infra-confound)
```

Reverts (voor de volledigheid, niet nodig om te lezen):

```bash
git show f2220d7   # Revert "perf: verify-run BL-004 L1-fix..."
git show 2673410   # Revert "perf: rAF-gate scroll-window update..."
git show e7edc9a   # Revert "fix(perf-scroll): navigeer naar All-orders tab..."
```

Deze SHA's leven op branch `feature/BL-004-po-board-scroll-jank` (gepusht naar `origin`, niet gemerged naar `develop`). Als die branch ooit wordt opgeruimd/verwijderd, blijven de commits alsnog bereikbaar zolang de branch niet **force**-verwijderd is vóórdat een andere ref ernaar verwijst — cherry-picken op korte termijn is dus veilig, maar niet oneindig houdbaar.

## 8. Relevante bestanden (naslag)

| Bestand | Rol |
|---|---|
| `src/hooks/useBoardRowWindow.js` | Windowing-hook — hier moet de rAF-gate komen |
| `src/hooks/useBoardRowWindow.test.jsx` | Bestaande unit tests (dekken de scroll-listener-path niet af — `scrollRef.current` is `null` in beide tests, dus een rAF-wijziging breekt ze niet, maar bewijst ook niets over het scroll-gedrag) |
| `src/components/supplier/PurchaseOrdersBoardRows.jsx` | Gebruikt de hook, bouwt slots, meet/schat uitgeklapte rijhoogtes |
| `src/components/supplier/PurchaseOrderBoardRow.jsx` | Rij/cel-rendering, memoization (`areBoardCellPropsEqual`) |
| `src/components/supplier/PurchaseOrderProductImageCell.jsx` | Voorbeeld van al-aanwezige scroll-bewuste optimalisatie (delayed image-load, faalt-cache) |
| `src/utils/purchaseOrderBoardRowSlots.js` | Slot-opbouw (groep-headers + PO-entries) |
| `src/hooks/usePurchaseOrdersPage.js` | Databron — hele orderset in één fetch |
| `src/utils/perf.js` | `measure()`, longframe-observer |
| `playwright/perf-scroll.js` | J4-meetscript — bevat de tab-navigatiebug, zie §4.2 |
| `.claude/skills/perf-scroll/SKILL.md` + `reference.md` | Volledige workflow, drempels, selectors |
| `test-reports/perf-optimize-policy.json` | `scrollTargets`, `scaleProfiles` (S/M/L = 80/500/2000 orders) |
| `scripts/seed-perf-po-cache.js` | Lokale seed-data voor perf-metingen (`--orders=N --lines=N`) |
