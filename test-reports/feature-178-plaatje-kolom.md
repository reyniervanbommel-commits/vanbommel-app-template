# Testrapport — Feature #178 Plaatje-kolom in main tabel

**Datum:** 2026-07-04
**Branch:** feature/178-plaatje-kolom · commit 8bc3a85
**Preview:** https://preview-178-plaatje-kolom.graysand-65442c41.northeurope.azurecontainerapps.io

## Geautomatiseerde verificatie

| Check | Resultaat |
|-------|-----------|
| Unit tests (`npm test`) | ✅ 86/86 geslaagd (incl. 7 nieuwe backend-validatie + 13 resolver-tests) |
| Vite build (`npm run build`) | ✅ geslaagd |
| Typecheck frontend | ✅ geen fouten in gewijzigde bestanden |
| DB-migratie 015 op DEV | ✅ uitgevoerd door preview.yml |
| Preview app-load | ✅ HTTP 200, titel "Vendor Collaboration App" |
| API health | ✅ HTTP 200 |

## Live CSP-verificatie (kern-blocker)

De live response-header op de preview bevestigt dat de CSP-verruiming werkt zoals bedoeld:

```
content-security-policy: img-src 'self' data: https:; default-src 'self'; script-src 'self'; ...
```

- `img-src` staat externe **https**-afbeeldingen toe → plaatje-kolommen kunnen laden.
- `script-src 'self'` en overige directives blijven **streng/intact** → geen verzwakking buiten images.

## Niet geautomatiseerd (beperking harness)

Interactieve UI-tests (kolom toevoegen via menu, config-stap, read-only rendering, filter/sort verborgen) vereisen de `cursor-ide-browser` MCP, die niet beschikbaar is in Claude Code. Deze scenario's staan als handmatige checks in `src/config/devTestItems.js` (item `feature-178`) en zijn afgedekt door unit-tests op resolver- en validatielogica. Aanbevolen: één handmatige rondgang op de preview vóór merge naar PROD.
