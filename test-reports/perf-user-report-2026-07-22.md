# Perf — wat is er verbeterd (22-07-2026)

**App-versie:** v1.30.35

## Kort

De **tekststijl-knoppen** (vet/cursief/kleur) op een kolom in het inkooporder-bord voelen nu duidelijk sneller. Bij het aanzetten van **vet** hertekende voorheen het hele bord; nu doen alleen de cellen van de gewijzigde kolom dat, en de opslag naar de server blokkeert de tekening niet meer.

## Wat je kunt testen

1. Open het inkooporder-bord (Master plan purchase orders).
2. Open een kolommenu → **Text style** → **Toggle bold** (ook cursief/onderstreept/kleur).
3. Let op: de opmaak verschijnt direct en het bord blijft vloeiend, ook bij veel rijen/kolommen.
4. Herlaad de pagina → de opmaak is bewaard.

## Meting (voor → na)

| Actie | Voor | Na | Winst |
|-------|-----:|---:|------:|
| Kolom vet aan/uit (text style) | ~2941 ms | ~1880 ms | **≈ 36% sneller** |
| Kolomfilter toepassen (controle) | ~830 ms | ~825 ms | onveranderd (geen regressie) |

> Gemeten op een lokale test-opstelling tegen de DEV-backend. Definitieve bevestiging volgt na een DEV-deploy (geminificeerde build). Absolute tijden liggen op de test-opstelling hoger dan in DEV; de **verhouding** voor/na klopt.

## PERF HUD

Baseline-waarden staan in `public/perf-baseline.json` (J7/J8). Na de DEV-deploy kun je in de HUD de nieuwe J8-tijd vergelijken met de oude.

## Let op

- Nog **niet** naar GitHub gepusht en **niet** naar DEV gedeployed — dat wacht op jouw akkoord (zie de git-commando's in de chat).
- Unit-tests: 35/35 groen.
