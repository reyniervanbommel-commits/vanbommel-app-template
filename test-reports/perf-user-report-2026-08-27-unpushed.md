# Perf — review

**Omgeving:** localhost:5178  
**Datum:** 2026-08-27  
**Verdict:** REGRESSIE-RISICO (RCCP-periode + dubbele BI-calls)

## Wat is gedaan
- Lokale unpushed `develop`-code gemeten (v1.52.39): PO-board, eerste klik RCCP, terug naar PO, eerste klik BI.
- RCCP-analyse vergeleken: huidig opgeslagen venster (2021–2023) versus 8 weken in 2026.

## Wat jij kunt testen
1. Open PO → wacht tot de tabel er is → klik RCCP. Eerste keer: let op of het even duurt; tweede keer moet het vrijwel meteen zijn.
2. Op RCCP: kijk naar de periode. Staat daar een bereik van jaren (nu 2021-W46 → 2023-W10), dan is dat de zware variant. Zet het terug naar ~8 weken en klik Refresh — dashboard moet lichter aanvoelen.
3. Open de ⚡ HUD linksonder → **Vs baseline**. Rood op `/bi/meta` of `/rccp/analysis` = trager dan de oude baseline.

## PERF HUD (⚡ linksonder)
- Open de HUD → sectie **Vs baseline (pre-fix)**
- Baseline = `public/perf-baseline.json` (juli, andere dataset — absolute ms op localhost wijken af)
- Groen delta = sneller; rood = trager
- Bij deze meting: eerste BI-klik toonde twee zware `/bi/meta`-calls (~4,9 s); warme RCCP-klik ~120 ms

## Nog open
- Baseline niet bijgewerkt (zou de HUD-vergelijking met DEV/seed vervuilen)
- Geen fix gedaan — eerst jouw keuze: prefetch ontdubbelen, of het brede RCCP-venster niet meer bewaren
