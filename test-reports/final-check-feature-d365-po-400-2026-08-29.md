# Final check — D365 PO refresh 400 (2026-08-29)

**Scope:** 4 bestanden (`D365ODataService.js`, `D365ODataService.test.js`, `TableDataService.js`, `version.js`)
**Skills aangeroepen:** final-check-feature, security-review (subagent)
**Skills overgeslagen:** ui-design-review (geen UI), perf-review screening-meting (geen board-hot-path; static only), browser-feature-test (geen user-visible flow; retry is backend)

| Onderdeel | Verdict |
|-----------|---------|
| Eigen checks | ok — tests groen, versie v1.52.56 |
| UI | n.v.t. |
| Snelheid | ok (static) — extra D365-call alleen bij HTTP 400, daarna kolom weg |
| Security | ok — geen medium+ |
| Browser | niet gemeten; unit tests dekken de retry |
| Cleanup | ok — tijdelijk diagnose-script verwijderd |

**Gedaan:** PO-fetch drop’t ongeldige `$select`-velden na 400, net als generieke entiteiten. Innererror in admin-fouttekst.
**Open:** code staat lokaal; PROD-app heeft de fix nog niet tot er gedeployed wordt. Directe workaround: kolom Deliver remainder op PROD uitzetten.
