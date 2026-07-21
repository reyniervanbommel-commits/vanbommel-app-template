# Perf — fix BL-005 (filter Apply)

**Omgeving:** Vendor Portal preview v1.30.32  
**Datum:** 2026-07-21  
**Verdict:** GEEN VOLDOENDE WINST — overgeslagen (L5 nodig)

## Wat is gedaan
- Filter Apply batched + startTransition + deferred board-compute
- Hermeting: empty state na ~10,6 s op grote dataset

## Wat jij kunt testen
1. Kolommenu → Filter → onzinwaarde → Apply
2. Verwacht: menu sluit snel; empty state kan nog lang duren

## Nog open
- Board virtualisatie (L5) voor snelle filter op ~2000 orders
