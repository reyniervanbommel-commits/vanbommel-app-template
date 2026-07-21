# Perf — pipeline resume 2026-07-21

**Omgeving:** Vendor Portal preview  
**Datum:** 2026-07-21  
**Verdict:** DEELS KLAAR — 2 fixes live; filter Apply wacht op virtualisatie

## Wat is gedaan
- **BL-006** text style Bold: UI reageert meteen (geen wachten op save)
- **BL-003** terugkeer van RCCP: geen zware PO-herlaad meer (alleen revision-check)
- **BL-005** filter Apply: snellere state-updates geprobeerd; bord legen blijft ~10 s bij grote datasets

## Wat jij kunt testen
1. Preview openen (v1.30.32)
2. Purchase orders → RCCP → terug: Network alleen `…/revision`
3. Kolommenu → Text style Bold: direct zichtbaar
4. Kolommenu → Filter Apply met onzinwaarde: empty state komt, maar kan nog lang duren

## PERF HUD
- Sectie **Vs baseline (pre-fix)** voor revision vs full read

## Nog open
- Filter Apply op grote boards → board virtualisatie (volgende pipeline / L5)
