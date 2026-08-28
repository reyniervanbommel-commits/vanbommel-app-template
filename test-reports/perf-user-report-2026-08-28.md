# Perf — review

**Omgeving:** preview RCCP confirmed-delivery  
**Datum:** 2026-08-28  
**Verdict:** PARTIAL (niet gemeten — login)

## Wat is gedaan
- Statische regressiecheck op de RCCP-diff: planning-date en matrix-toggles doen geen extra analysis-call.
- Browser-meting op preview is niet gelukt (ongeldige testcredentials).

## Wat jij kunt testen
1. Inloggen op de preview, vendor kiezen, `/rccp` openen.
2. Requested/Confirmed-label aanklikken: grafiek en KPI’s moeten meteen wisselen, zonder spinner.
3. PERF HUD linksonder: geen extra `GET /api/rccp/analysis` bij die klik.

## PERF HUD (⚡ linksonder)
- Open de HUD na een vendor-load
- Baseline is niet bijgewerkt deze run

## Nog open
- Drie warme metingen van dashboard-load + matrix-toggle op preview
