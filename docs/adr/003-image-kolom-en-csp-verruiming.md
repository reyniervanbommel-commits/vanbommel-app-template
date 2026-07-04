# ADR-003: Read-only plaatje-kolom via afgeleide URL + CSP img-src-verruiming

**Datum:** 2026-07-04  
**Status:** Geaccepteerd  
**Tags:** po-tabel, custom-kolommen, image, csp, security  
**DevOps Feature:** #178 (stories #179, #180, #181)

---

## Context

Gebruikers willen in de main PO-tabel een kolom die per rij een afbeelding toont, opgebouwd uit bestaande kolomwaarden (bv. een artikelnummer in een image-URL). De bestaande custom-kolomregistry (`po_columns`) ondersteunt tekst/nummer/datum/boolean/select en rendert via `EditableCell`. Twee architectuurvragen: (1) hoe modelleren we een kolom zonder eigen opgeslagen waarde, en (2) hoe laden we externe afbeeldingen terwijl de app achter een strikte `helmet()`-CSP draait (`img-src 'self' data:` blokkeert externe hosts).

## Beslissing

1. **Afgeleid, read-only kolomtype `image`** binnen de bestaande `po_columns`-registry — geen aparte tabel. De configuratie (`urlTemplate` met `{xxx}`, `sourceColumnKey`, `transforms`) leeft in de bestaande `options`-JSON-kolom. De kolom heeft geen eigen celwaarde; de URL wordt op render-tijd afgeleid uit een **header**-bronkolom via een pure util `resolveImageUrl`.
2. **Header-only scope (v1):** de bron- en image-kolom zijn header-level, want de resolver leest `order.values` (alleen header-keys). Line-kolommen zijn geen geldige bron. Backend dwingt dit af met een header-lookup bij create.
3. **CHECK-constraints uitgebreid via drop/recreate** (migratie 015) op zowel `po_columns` als `tb_columns` — CHECK is niet muteerbaar; idempotent geguard op `sys.check_constraints`. `tb_columns` mee omdat het uit `po_columns.data_type` wordt geseed (board-cutover).
4. **CSP `img-src` verruimd** naar `'self' data: https:` via `helmet({ contentSecurityPolicy: { useDefaults: true, ... } })`, zodat alle overige directives (m.n. `script-src 'self'`) streng blijven en alleen images van externe https-hosts laden.
5. **Injectie-hardening:** backend valideert `urlTemplate` op http(s)-prefix + verplichte `{xxx}` en transforms op een per-type whitelist; frontend spiegelt dit en `encodeURIComponent`-t de bronwaarde vóór substitutie. Rendering via React `src`-prop (geen `innerHTML`).

## Alternatieven overwogen

| Optie | Reden afgewezen |
|-------|-----------------|
| Aparte `po_image_columns`-tabel | Overbodig; de bestaande `options`-JSON draagt de config prima, en hergebruikt add/rename/delete-flow. |
| Handmatige URL per rij (opgeslagen waarde) | Arbeidsintensief voor gebruikers; de kracht is juist het afleiden uit bestaande data. |
| CSP host-allowlist i.p.v. `https:` breed | Veiliger, maar de doelhosts zijn niet vooraf bekend; breed `https:` is voor images (geen code-executie) een aanvaardbaar startpunt. |
| Image ook in subitems-tabel | Buiten v1-scope; header-only houdt de resolver-databron eenduidig. |

## Gevolgen

- **Positief:** minimale datalaag-impact, herbruikbare pure resolver (los getest), strak gehouden `script-src`, defense-in-depth validatie aan beide kanten.
- **Restrisico (aanvaard, sign-off eigenaar vereist):** een user-gestuurde template kan celwaarden via de request-URL naar een externe host sturen (exfiltratie-beacon). Kolombeheer is beperkt tot admin/employee, niet admin-only. Mogelijke aanscherping: `IMAGE_HOST_ALLOWLIST` via env of `requireRole('admin')` op create met `dataType='image'`.
- **Onderhoud:** transform-definitie leeft nu op meerdere plekken (UI-labels, frontend-normalisatie/-applicatie, backend-validatie); bij uitbreiding consolideren tot één gedeelde spec-tabel.
