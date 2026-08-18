# ADR-005: Idle-timeout van 45 minuten naast de 8-uurs sessie-TTL

**Datum:** 2026-08-18  
**Status:** Geaccepteerd  
**Tags:** auth, session, idle-timeout, security  

---

## Context

Uitloggen gebeurde alleen via de knop **Log out**. De server-sessie had een harde cookie-TTL van 8 uur (`SESSION_TTL_HOURS`), zonder idle-detectie. Een open tab bleef in de UI ingelogd zolang React-state `user` gezet was. `AuthGuard` hercontroleerde de server niet, en een 401 op een API-call stuurde de gebruiker niet naar login. Een vergeten tab of gedeelde pc bleef tot 8 uur bruikbaar.

## Beslissing

1. Idle-timeout in de frontend: 45 minuten zonder klik, toets, scroll of touch. Achtergrondpolling (remarks, activity) telt niet als activiteit.
2. Twee minuten vóór uitloggen verschijnt een dialoog (**Still there?**) met **Stay signed in** en **Sign out now**.
3. Uitloggen gebruikt het bestaande `logout()`-pad (sessie vernietigen, caches legen, naar `/login`).
4. Een 401 op een beschermde API (`apiRequest`) triggert hetzelfde uitlogpad, met reden `session`. Auth-routes (`/auth/*`) doen dat niet.
5. Het loginscherm toont een melding bij `?reason=idle` of `?reason=session`.
6. De harde 8-uurs sessie-TTL blijft het maximum. `rolling` blijft uit.

## Alternatieven overwogen

| Optie | Reden afgewezen |
|-------|-----------------|
| Alleen `SESSION_TTL_HOURS` verlagen | De open tab blijft visueel ingelogd; lost het UI-probleem niet op. |
| `rolling: true` + korte cookie (server-idle) | Remarks/activity-polling zou de sessie blijven verlengen. |
| Idle van 15 of 30 minuten | Te kort voor het lezen van het PO-board zonder te klikken; 45 minuten is de gekozen middenweg. |
| Alleen server-side last-activity in fase 1 | Meer werk, dezelfde UX-winst als frontend-timer plus 401-handler. |

## Gevolgen

Een inactieve gebruiker wordt na 45 minuten uitgelogd en ziet het loginscherm. Een tab die 8+ uur openstaat wordt bij de volgende 401 alsnog naar login gestuurd. Testers op DEV moeten de 45-minuten-timer of de login-URLs met `reason` gebruiken. Toekomstige auth-wijzigingen horen de idle-guard en de 401-handler in `apiRequest` in stand te houden; polling mag de idle-timer niet resetten.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/utils/idleSession.js` | Timeout 45 min, waarschuwing 2 min, countdown-helpers. |
| `src/hooks/useIdleSession.js` | Activity-listeners en timers. |
| `src/components/auth/IdleSessionGuard.jsx` | Koppelt idle + 401 aan logout en navigatie. |
| `src/components/auth/IdleSessionWarningDialog.jsx` | Waarschuwingsdialoog. |
| `src/utils/sessionExpiry.js` | 401-handler registry en loginmeldingen. |
| `src/utils/api.js` | 401 op beschermde routes meldt sessie-expiry. |
| `src/components/auth/LoginPage.jsx` | Toont idle/expiry-melding. |
| `src/App.jsx` | Mount `IdleSessionGuard` binnen FluentProvider. |
| `src/config/version.js` | Versie naar v1.49.0. |
