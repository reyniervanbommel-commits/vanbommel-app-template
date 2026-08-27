# Performance Review — 2026-08-27

**Modus:** regression (PO-board / tabs / kolommenu in de diff)
**Omgeving:** preview (AUTH_BLOCKED) — localhost:5178 up, backend 3008 down
**Baseline:** aanwezig (`test-reports/perf-baseline.json`) — **niet hermeten**
**Verdict:** NIET MEETBAAR (static only)

---

## 1. Ranglijst

Geen mediaanmetingen. Preview-login faalt (401); lokale API draait niet. Baseline niet bijgewerkt.

---

## 2. Bevindingen (statisch, geen extra snelheid-skill)

Gesorteerd op geschatte winst. Geen automatische gedragswijziging.

### B1 — PATCH bij elke tabklik · geschatte winst: minder netwerk/rerenders bij snel wisselen

- **Gemeten:** niet gemeten
- **Toegerekend aan:** client netwerk
- **Oorzaak:** `persistTabSelection` stuurt per `selectTab` een PATCH naar board-settings, zonder debounce
- **Plek:** `src/hooks/usePurchaseOrderViewTabs.js`
- **Voorstel:** debounce persist (bijv. 200–400 ms); laatste tabId wint
- **Afweging:** kort stale last-tab bij crash tijdens debounce-venster

### B2 — Hover `setState` zonder delay · geschatte winst: minder tab-bar rerenders

- **Gemeten:** niet gemeten
- **Toegerekend aan:** render
- **Oorzaak:** `onMouseEnter` zet hover-state direct; labels max 10 tekens → meer hover-events
- **Plek:** `src/components/supplier/viewTabs/PurchaseOrderViewTabBar.jsx`
- **Voorstel:** korte hover-delay + geen setState als dezelfde tab al gehoverd is
- **Afweging:** hover-card verschijnt ~100–200 ms later

### B3 — `snapshotCurrentTab` altijd `setState`

- **Gemeten:** niet gemeten
- **Toegerekend aan:** render / client
- **Oorzaak:** bij tabwissel altijd extraTabs/baseFilters zetten, ook als extra filters ongewijzigd zijn
- **Plek:** `src/hooks/usePurchaseOrderViewTabs.js`
- **Voorstel:** skip setState als extras gelijk zijn
- **Afweging:** geen functionele change

`perf-scroll` / `perf-board-actions`: diff raakt tab-scroller en kolomacties; **niet gemeten** (auth). Geen `perf-pipeline`.

---

## 3. Meetgaten

| Actie / route | Ongemeten deel | Voorgestelde instrumentatie |
|---------------|----------------|-----------------------------|
| Tab select | hele interactie | hermeten op preview ná werkende login; `[perf] interaction` + `[api] PATCH board-settings` |
| Tab-balk scroll | longframes | `perf-scroll` wanneer sessie werkt |
| Kolommenu Apply | J7/J8 | `perf-board-actions` wanneer sessie werkt |

---

## 4. Baseline

`test-reports/perf-baseline.json` — ongewijzigd.

---

## 5. Aantekeningen

- Static only — niet doen alsof er gemeten is
- Preview 401 is omgevingsconfig, geen app-regressie in deze diff
