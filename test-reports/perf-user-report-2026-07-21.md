# Perf — eindrapport 2026-07-21

**Omgeving:** Vendor Portal preview **v1.30.33**  
**URL:** https://preview-perf-pipeline-skills-v1.graysand-65442c41.northeurope.azurecontainerapps.io  
**PR:** https://github.com/reyniervanbommel-commits/vanbommel-app-template/pull/61  
**Verdict:** **KLAAR** — drie UX-fixes live gemeten

## Wat is sneller

| Actie | Voorheen | Nu |
|-------|----------|-----|
| Filter toepassen (lege match) | ~10,6 s | **~0,7 s** |
| Text style Bold | ~10 s wachten op save | **~1 s** (optimistic) |
| Terug van RCCP naar PO-board | Zware herlaad | Alleen revision-check |

## Wat jij kunt testen

1. Open de preview (footer **v1.30.33**)
2. Kolommenu → Filter → onzinwaarde → **Apply** → empty state moet snel komen
3. Kolommenu → Text style → **Bold** → direct zichtbaar
4. PO-board → RCCP → terug → Network: vooral `/revision`, geen volle PO-read
5. Scroll het board: alle rijen bereikbaar (window + spacers)

## PERF HUD

- Sectie **Vs baseline** voor PO full-read / revision / filter / text-style

## Niet gedaan deze run

- Scroll-jank meting (geen overflow op huidige dataset)
- Seed M/L lokaal (SQL-firewall)
