# Custom Auth Guide

Deze template gebruikt custom session-based authenticatie (geen Entra ID / OAuth).

## Flow overzicht

```
Login → AuthService.login() → session opslaan in MSSQL → redirect
         ↓ first-time login
         requiresPasswordSetup: true → /set-password
```

## Bestanden

| Bestand | Verantwoordelijkheid |
|---------|---------------------|
| `server/services/AuthService.js` | Login, set-password, reset-password logica |
| `server/services/EmailService.js` | Resetmail via Azure Communication Services |
| `server/middleware/auth.js` | `requireSession`, `requireRole` middleware |
| `server/routes/auth.js` | Auth-endpoints (login, logout, set-password, forgot/reset-password) |
| `src/hooks/useSessionAuth.js` | Frontend auth hook |
| `src/context/AuthContext.jsx` | Auth context provider |

## Eerste keer inloggen (bootstrap)

Stel in `.env`:
```
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=tijdelijk-wachtwoord
```

Bij de eerste login met dit e-mailadres + wachtwoord wordt de gebruiker automatisch aangemaakt als admin en het wachtwoord ingesteld. Verwijder de bootstrap-variabelen daarna uit `.env`.

## Wachtwoord-reset flow

1. `/api/auth/forgot-password` → genereert token, stuurt mail via ACS
2. Gebruiker klikt link → `/reset-password?token=...`
3. `/api/auth/reset-password` → valideert token (1 uur geldig), stelt nieuw wachtwoord in

## Account lockout

Na 3 mislukte inlogpogingen wordt `is_locked = 1` in de `users` tabel gezet.
Deblokkeer via de admin-interface of direct via SQL:
```sql
UPDATE dbo.users SET is_locked = 0, failed_attempts = 0 WHERE email = 'user@example.com';
```

## Rate limiting

- Globaal: 100 req/min (alle routes)
- Auth-endpoints: 5 req/min (`/api/auth/login`, `/api/auth/forgot-password`)

## MFA (TOTP)

MFA-velden zijn aanwezig in de `users` tabel (`mfa_enabled`, `mfa_secret_enc`, etc.) maar de implementatie is een stub (`/api/auth/mfa/verify`). Implementeer naar behoefte met `otplib`.

## Uitbreidingen

- **Rollen uitbreiden:** voeg extra rollen toe aan `requireRole()` en pas de `users.role` kolom aan
- **Sessie-TTL aanpassen:** `SESSION_TTL_HOURS` in `.env` (default: 8 uur)
- **Cookie-naam aanpassen:** `SESSION_COOKIE_NAME` in `.env`
