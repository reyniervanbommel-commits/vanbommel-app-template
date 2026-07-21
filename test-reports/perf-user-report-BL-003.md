# Perf — fix BL-003 (terugkeer PO-board)

**Omgeving:** Vendor Portal preview  
**Datum:** 2026-07-21  
**Verdict:** VERBETERING

## Wat is gedaan
- Terugkeer van RCCP naar Purchase orders gebruikt session-cache + revision-check
- Geen volledige PO-read meer bij ongewijzigde revision
- Adversary A1/A5 groen op preview

## Wat jij kunt testen
1. Open preview → Purchase orders → wacht tot board geladen is
2. Ga naar RCCP → wacht
3. Terug naar Purchase orders
4. Network: alleen `…/purchase-orders/revision`, geen zware `…/data/purchase-orders`
5. PERF HUD: revision-check blijft licht t.o.v. full-read baseline

## PERF HUD
- Sectie **Vs baseline (pre-fix)** — vergelijk revision vs full read
