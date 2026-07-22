# Gebruikersverslag — perf (compact)

**Verplicht** aan het einde van elke perf-review, scout, verify of pipeline-iteratie.
Schrijf naar `test-reports/perf-user-report-<datum>.md` (of `-<BL-id>.md` bij fix).

Doelgroep: product-owner / tester — **geen** code, **geen** lange tabellen.

---

## Template (max ~15 regels)

```markdown
# Perf — [scout | review | verify | fix BL-xxx]

**Omgeving:** localhost:5178 | Vendor Portal DEV | …  
**Datum:** YYYY-MM-DD  
**Verdict:** [GEMETEN | VERBETERING | REGRESSIE | PARTIAL]

## Wat is gedaan
- [1–3 bullets: gemeten / fix / tier]

## Wat jij kunt testen
1. [Concrete stap — klik/navigatie]
2. [Wat je moet zien in Network of PERF HUD]
3. [Verwacht verschil vs baseline]

## PERF HUD (⚡ linksonder)
- Open de HUD → sectie **Vs baseline (pre-fix)**
- Baseline = `public/perf-baseline.json` (scout vóór fix)
- Groen delta = sneller dan baseline; rood = trager

## Nog open
- [deploy / profiel L / adversary — of "niets"]
```

---

## Regels

| Wel | Niet |
|-----|------|
| Korte stappen ("PO → RCCP → PO") | Code-paden of SQL-labels |
| Verwacht gedrag ("alleen `/revision`, geen full read") | Volledige ranglijst |
| Link naar HUD-sectie | Alleen test-reports zonder user-report |
| Vermeld localhost **én** DEV URL indien relevant | Aannemen dat gebruiker dev-server start |

---

## HUD-baseline sync

Na scout of vóór een fix:

1. Update `test-reports/perf-baseline.json`
2. **Spiegel** naar `public/perf-baseline.json` incl. `hudWatch[]` (zie perf-scout)
3. Na verify: update user-report met "vóór → na" cijfers

Zonder `public/perf-baseline.json` toont de HUD geen vergelijking — vermeld dat in het user-report.
