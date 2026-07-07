# Test Report - Feature 196 Preview Smoke

- Feature: `#196 Volledig Plan D365 Detectie`
- Branch: `feature/196-d365-diff-volledig`
- Commit: `41d5c44`
- Preview URL: `https://preview-196-d365-diff-volledig.graysand-65442c41.northeurope.azurecontainerapps.io`
- Test datum: `2026-07-07`

## Uitgevoerde checks

1. HTTP bereikbaarheidscheck op preview URL
2. Controle op root-mount element in HTML (`<div id="root"></div>`)
3. Controle op pagina-title tag (`<title>`)

## Resultaat

- `status=200`
- `hasRoot=True`
- `hasTitle=True`

## Conclusie

Preview smoke-check is geslaagd. De preview omgeving is bereikbaar en serveert de frontend shell correct.
