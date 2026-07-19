# Performance Review — <datum>

**Modus:** screening | drilldown | regression
**Omgeving:** local (5178) | preview (<url>) — *metingen op local bevatten geen netwerklatentie*
**Baseline:** aanwezig (<datum>) | eerste run, geen vergelijking
**Verdict:** STABIEL / REGRESSIE / VERBETERPUNTEN / NIET MEETBAAR

---

## 1. Ranglijst

Mediaan van 3 metingen, in ms. Gesorteerd op totaal.

| Actie | Totaal | Δ baseline | SQL | Backend-ov. | Netwerk | Client | Render | Dominant |
|-------|-------:|-----------:|----:|------------:|--------:|-------:|-------:|----------|
| Tab "…" | 1210 | +18% | 850 | 90 | 120 | 60 | 90 | SQL |
| Route /… | | | | | | | | |

Koude start (eerste klik na load), waar sterk afwijkend:

| Actie | Koud | Warm |
|-------|-----:|-----:|
| | | |

---

## 2. Bevindingen

Gesorteerd op **geschatte winst**, niet op ernst.

### B1 — <korte titel> · geschatte winst ~<x> ms

- **Gemeten:** <actie> duurt <x> ms, waarvan <y> ms <post>
- **Toegerekend aan:** <label / call / component>
- **Oorzaak:** <wat er in de code gebeurt>
- **Plek:** `pad/naar/bestand.js:regel`
- **Voorstel:** <concrete wijziging>
- **Afweging:** <wat je inlevert — bijv. stale data bij cachen>

### B2 — …

---

## 3. Meetgaten

Wat níet toerekenbaar was, en wat daarvoor nodig is. Dit zijn bevindingen, geen weglatingen.

| Actie / route | Ongemeten deel | Voorgestelde instrumentatie |
|---------------|---------------:|-----------------------------|
| | | `time('…', …)` in `server/…` |

---

## 4. Baseline

`test-reports/perf-baseline.json` — <aangemaakt | bijgewerkt | ongewijzigd>.

Regressiedrempel: > +25% of > +200 ms t.o.v. baseline.

---

## 5. Aantekeningen

- Parallelle calls / negatieve restposten / spreiding tussen metingen
- Wat er tijdens de meting op de achtergrond liep (sync, HMR)
- Wat expliciet buiten scope bleef
</content>
