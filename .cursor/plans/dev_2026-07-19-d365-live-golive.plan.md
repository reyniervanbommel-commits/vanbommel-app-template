# Go-live plan: PROD-app koppelen aan D365 F&O LIVE

**Datum:** 2026-07-19
**Doel:** `vendorportal-prod` betrouwbaar en herhaalbaar laten praten met de LIVE D365 F&O-omgeving, in plaats van de huidige situatie waarin de koppeling alleen bestaat als iemand hem handmatig in de admin-UI heeft ingetypt.

---

## 0. Voortgang

| Stap | Wat | Status |
|------|-----|--------|
| A1 | Entra app-registratie `VBO-OData-VendorApp-PROD` | ✅ 2026-07-19 |
| A2 | API-permissies | ⛔ vervallen (DEV heeft er geen) |
| A5 | Client secret → Key Vault | ✅ 2026-07-19 |
| B1 | Base URL / tenant / client id → Key Vault | ✅ 2026-07-19 |
| B2 | Managed identity leesrechten | ✅ was al geregeld |
| A3 | Registreren in F&O LIVE | ✅ 2026-07-19 — token wordt geaccepteerd |
| A6 | F&O-rechten op de gekoppelde gebruiker | ✅ 2026-07-19 — opgelost, alle 4 entiteiten 200 |
| B3 | `deploy-prod.yml` uitbreiden | ✅ 2026-07-19 |
| B4 | `/api/health/d365` readiness-probe | ✅ 2026-07-19 |
| B5 | Deploy laten falen bij kapotte koppeling | ✅ 2026-07-19 |
| B6 | Precedentie-check `app_settings` | ✅ 2026-07-19 — schoon |
| B7 | Go-live checklist actualiseren | ✅ 2026-07-19 |

### A6 — Rechten: eerst ontbrekend, daarna opgelost
Twee metingen met de PROD-credentials tegen `https://vanbommel.operations.dynamics.com`:

| Entiteit | 1e meting (ochtend) | 2e meting (na aanpassing user) |
|---|---|---|
| `PurchaseOrderHeadersV2` | 403 | ✅ 200 |
| `PurchaseOrderLinesV2` | 403 | ✅ 200 |
| `VendorsV2` | 403 | ✅ 200 |
| `ReleasedProductsV2` | 403 | ✅ 200 |

De eerste 403's bevestigden: authenticatie werkte al (A3 goed), maar de gekoppelde F&O-gebruiker
had geen leesrechten. Na het aanpassen van de gebruiker geven alle vier entiteiten 200.

**Data-verificatie (2026-07-19):**
- WHSL heeft echte PO-data (`WSPO-0300744` e.a.).
- De filter `dataAreaId eq 'WHSL'` is hoofdletterongevoelig: query op `'WHSL'` levert rijen met
  `dataAreaId: 'whsl'`. De config `D365_ODATA_COMPANY=WHSL` sluit dus correct aan.
- Company `rtde` bestaat óók in dezelfde omgeving (kwam eerst boven in de ongefilterde query) —
  onschadelijk, want de app filtert op WHSL.

> Deze eerste meting is precies de reden dat B4 méér doet dan een token ophalen — zie daar.
> Nog steeds openstaand: schrijfrechten op `PurchaseOrderLinesV2` — bewust pas ná C1.
| **B8** | **Verloopwaarschuwing client secret in de app** | ✅ 2026-07-19 |
| C1–C3 | Rooktest, write-back-test, rotatie | ⏳ |

### B8 — Verloopwaarschuwing (gebouwd 2026-07-19)
Waarschuwt admins vanaf 30 dagen vóór het verlopen van de client secret, en blijft waarschuwen tot de datum bijgewerkt is. Vervangt stap C3 (agenda-herinnering) door iets dat niet vergeten kan worden.

| Bestand | Wat |
|---------|-----|
| `server/utils/secretExpiry.js` | pure functie `getSecretExpiryStatus()` — drempel 30 dagen, statussen `unknown`/`ok`/`warning`/`expired` |
| `server/utils/secretExpiry.test.js` | 7 tests (drempelgrenzen, afronding, onleesbare datum) |
| `server/services/SettingsService.js` | key `D365_ODATA_CLIENT_SECRET_EXPIRES_AT` toegevoegd aan `ODATA_KEYS` |
| `server/routes/admin.js` | `derived.clientSecretExpiry` in `GET /settings/odata` |
| `src/hooks/useSecretExpiryWarning.js` | admin-only fetch, dismissal per sessie én per vervaldatum |
| `src/components/shared/SecretExpiryWarning.jsx` | `MessageBar` (blijft staan) + `Dialog` (1× per sessie) |
| `src/components/shared/SecretExpiryWarning.test.jsx` | 6 tests (rol-gating, drempels, dismissal, stille fout) |
| `src/App.jsx` | gemount bovenaan de app-shell, vóór de content |
| `src/components/admin/AdminODataSettings.jsx` | datumveld + statusbadge in "Current status" |

**Ontwerpkeuzes:**
- *Waarom een handmatige datum?* De app-registratie heeft bewust geen Graph-permissies, dus de app kan de vervaldatum niet uit Entra ophalen. Toevoegen zou admin consent vereisen — en een bredere permissie dan de koppeling nodig heeft.
- *Drift-risico:* roteren zonder de datum bij te werken. Afgevangen doordat de dialog beide stappen expliciet noemt, en de dismissal aan de datum gekoppeld is — een nieuwe datum laat de melding opnieuw verschijnen.
- *Banner niet permanent wegklikbaar* — dat is de eis "blijf waarschuwen tot de secret vernieuwd is". De dialog is wel wegklikbaar, één keer per browsersessie.
- *Onleesbare datum → `unknown`, niet `expired`* — een typefout mag geen vals alarm geven.

**Key Vault (gezet 2026-07-19):** secret `D365-ODATA-PROD-CLIENT-SECRET-EXPIRES-AT` = `2028-07-19`, plus het `expires`-attribuut op `D365-ODATA-PROD-CLIENT-SECRET` zelf (`2028-07-19T11:12:01Z`), zodat Azure de vervaldatum ook intrinsiek kent.

⚠️ **De waarschuwing is pas actief als de datum in de omgeving staat.** Zonder waarde is de status `unknown` en toont de app niets. Vullen kan via B3 (env var uit Key Vault) of handmatig via Admin → OData settings.

### Aangemaakte resources (2026-07-19)
| Wat | Waarde |
|-----|--------|
| App-registratie | `VBO-OData-VendorApp-PROD` |
| **Client Id** | **`73d7b2ea-adb6-44f7-8358-90c28d71d12e`** ← nodig voor A3 |
| Object Id (app) | via `az ad app show` |
| Service principal | `324807d9-75d8-44e5-879e-0995dd6806d4` |
| Tenant Id | `0392ec91-927c-4e81-884d-d21d2cd99be1` |
| Secret in vault | `D365-ODATA-PROD-CLIENT-SECRET` (geldig tot ~2028-07-19) |

Key Vault `kv-vp-ne-20260628` bevat nu: `D365-ODATA-PROD-BASE-URL`, `-TENANT-ID`, `-CLIENT-ID`, `-CLIENT-SECRET`.

---

## 1. Uitgangssituatie (geverifieerd op 2026-07-19)

### Wat werkt
- `server/services/D365ODataService.js` — één generieke client, OAuth2 client-credentials. De token-scope wordt afgeleid uit `D365_ODATA_BASE_URL` (`regel 34-37`), dus één URL wijzigen schakelt automatisch de juiste token-audience in. Geen code-wijziging nodig om van omgeving te wisselen.
- `server/services/SettingsService.js` — resolutie-volgorde `dbo.app_settings` (DB) → `process.env` → fallback (`regel 45-48`).
- Admin-UI `src/components/admin/AdminODataSettings.jsx` + `POST /api/admin/settings/odata` — secrets zijn write-only.
- `.env` staat in `.gitignore` en is **niet** getrackt in git. Geen secret-lek in de repo.

### Wat ontbreekt
| # | Gat | Bewijs |
|---|-----|--------|
| 1 | Geen D365-variabele in de PROD-deploy | `.github/workflows/deploy-prod.yml:53-73` zet alleen `SQL_CONNECTION_STRING`, `SESSION_SECRET`, `APP_ENV` |
| 2 | Geen PROD D365-secrets in de app-key vault | `kv-vp-ne-20260628` bevat wél `D365-ODATA-DEV-CLIENT-ID/-SECRET/-TENANT-ID`, géén PROD-tegenhanger |
| 3 | De bestaande DEV-secrets worden door niets gelezen | geen enkele workflow refereert eraan — half aangelegd patroon |
| 4 | Geen PROD app-registratie | alleen `VBO-OData-VendorApp-DEV` bestaat; de LIVE F&O-hostname komt nergens in de repo voor |
| 5 | Health check test D365 niet | `server/server.js:152` → `res.json({ status: 'ok' })`. Deploy gaat groen terwijl D365 volledig onbereikbaar is |
| 6 | Geen omgevings-guard op write-back | `writeBackField` (`regel 319-366`) PATCHt naar wat er ook maar geconfigureerd staat |
| 7 | Go-live checklist is nog de template | `docs/guides/LIVEGANG_CHECKLIST.md` bevat `[APP_NAME]`-placeholders, geen D365-sectie |

### Bestaande Azure-resources
- Resource group **`vanbommel-vendorportal`** — container apps `vendorportal-prod`, `vendorportal-dev`
- App-key vault **`kv-vp-ne-20260628`** (zelfde RG)
- Aparte D365-key vaults in `vanbommel-kvault`: `vbo-keyvault-d365-prd`, `vbo-keyvault-d365-acc`. **Ik heb hier geen leesrechten op** (`AccessDenied` op secrets list) — mogelijk staan hier al LIVE-credentials van andere integraties.
- GitHub secret `KEY_VAULT_NAME_PROD` bestaat al

---

## 2. Ontwerpkeuze

**Configuratie gaat via Key Vault → Container App env vars, niet via de admin-UI.**

Reden: de DB-laag (`app_settings`) wint van `process.env`, dus de admin-UI blijft werken als override voor DEV/experimenten. Maar voor PROD wil je dat de koppeling *reproduceerbaar uit de deploy komt* — een lege database of een herstelde backup mag niet betekenen dat de D365-koppeling stilletjes weg is.

> ⚠️ **Let op de precedentie.** Omdat `app_settings` vóór `process.env` komt, overschrijft een eerder handmatig ingetypte waarde in de PROD-database de nieuwe env var. Stap 3.6 checkt dit expliciet.

---

## 3. Stappenplan

### Fase A — Wat JIJ moet regelen (ik kan dit niet)

Dit vereist rechten in Entra ID en in D365 F&O die ik niet heb.

#### Stap A1 — App-registratie voor PROD aanmaken (Entra ID) — **kan ik doen**
Geverifieerd 2026-07-19: ik heb de rol **Application Developer**, dus ik kan deze registratie zelf aanmaken. Ik heb géén Application Administrator / Global Admin, dus ik kan geen admin consent geven — zie A2 waarom dat niet nodig is.

Wat ik aanmaak, exact gespiegeld aan `VBO-OData-VendorApp-DEV`:
- Naam: **`VBO-OData-VendorApp-PROD`**
- `signInAudience`: `AzureADMyOrg` (single tenant, net als DEV)
- Redirect URI: geen (client-credentials flow)
- Client secret, 24 maanden geldig → gaat direct naar Key Vault, komt nooit in een chat of log

Tenant ID is gelijk aan DEV: `0392ec91-927c-4e81-884d-d21d2cd99be1`.

#### Stap A2 — API-permissies — **vervalt**
Geverifieerd: `VBO-OData-VendorApp-DEV` heeft `requiredResourceAccess: []` — **nul API-permissies**. De koppeling werkt volledig via de registratie in de F&O *Entra ID applications*-tabel (stap A3), niet via een Dynamics ERP-permissie in Entra.

Dus: geen permissie toevoegen, geen admin consent. PROD spiegelt DEV. Dit haalt de enige stap uit het plan die Global Admin-rechten vereiste.

#### Stap A3 — De app registreren in D365 F&O LIVE — **moet jij doen**
Dit is de enige echt handmatige stap. Hij zit in de F&O-UI, daar kom ik niet bij.
1. Log in op de **LIVE** F&O-omgeving
2. Ga naar **System administration → Setup → Microsoft Entra ID applications**
3. Nieuwe regel:
   - **Client Id** = de Application (client) ID uit stap A1 (lever ik aan)
   - **Name** = `VBO-OData-VendorApp-PROD`
   - **User Id** = zie hieronder

##### Het `User Id`-veld = het volledige rechtenmodel
Elke OData-call van de app draait **als** deze F&O-gebruiker en erft diens security roles. Er is geen apart rechtenniveau op app-niveau — dat verklaart ook waarom `VBO-OData-VendorApp-DEV` nul API-permissies in Entra heeft. Dit ene veld bepaalt dus alles wat de koppeling mag.

Daarom:
- **Geen echte medewerker.** Rollen wijzigen, mensen gaan uit dienst, en de F&O audit trail toont hun naam bij elke geautomatiseerde wijziging. Gebruik een dedicated niet-interactieve gebruiker, bijv. `SVC-VENDORAPP`.
- **Start read-only.** Geef die gebruiker in eerste instantie géén schrijfrechten op `PurchaseOrderLinesV2`. Dat sluit gat #6 uit de analyse (write-back zonder omgevings-guard) af op het niveau van F&O zelf — sterker dan welke guard in de applicatiecode ook. Openzetten kan na een geslaagde C1.

#### Stap A4 — Gegevens ✅ **ontvangen 2026-07-19**

| Gegeven | Waarde | Status |
|---------|--------|--------|
| LIVE F&O base URL | `https://vanbommel.operations.dynamics.com/` | ✅ |
| Tenant ID | `0392ec91-927c-4e81-884d-d21d2cd99be1` | ✅ gelijk aan DEV |
| Company / `dataAreaId` | `WHSL` | ✅ gelijk aan DEV |
| Client ID (PROD) | volgt uit A1 | ⏳ ik maak aan |
| Client secret | → direct naar Key Vault | ⏳ ik maak aan |
| F&O `User Id` | `________` | ⏳ jouw keuze bij A3 |

> **Trailing slash is geen probleem.** `getBaseUrl()` (`D365ODataService.js:141`) stript een afsluitende `/` voordat de OAuth-scope wordt opgebouwd. De waarde mag dus letterlijk zo in Key Vault.
>
> **Let op:** LIVE (`vanbommel.operations.dynamics.com`) en ACC (`vanbommel-acc.sandbox.operations.dynamics.com`) verschillen maar in één woord. Dat maakt stap B6 (precedentie-check op `app_settings`) extra belangrijk — een oude sandbox-waarde in de PROD-database is visueel makkelijk over het hoofd te zien.

#### Stap A5 — Client secret in Key Vault — **kan ik doen**
Omdat ik de registratie in A1 zelf aanmaak, kan ik de secret ook direct doorzetten naar Key Vault zonder dat hij ooit in beeld komt:
```bash
SECRET=$(az ad app credential reset --id <appId> --years 2 --query password -o tsv)
az keyvault secret set --vault-name kv-vp-ne-20260628 \
  --name D365-ODATA-PROD-CLIENT-SECRET --value "$SECRET"
```
De waarde gaat van Entra rechtstreeks naar Key Vault. Wil je hem liever zelf beheren, dan maak ik alleen de app aan en zet jij de secret handmatig.

---

### Fase B — Wat IK kan doen (na jouw input uit A4)

#### Stap B1 — Niet-geheime secrets in Key Vault zetten
```bash
az keyvault secret set --vault-name kv-vp-ne-20260628 --name D365-ODATA-PROD-BASE-URL  --value "<base url>"
az keyvault secret set --vault-name kv-vp-ne-20260628 --name D365-ODATA-PROD-TENANT-ID --value "<tenant id>"
az keyvault secret set --vault-name kv-vp-ne-20260628 --name D365-ODATA-PROD-CLIENT-ID --value "<client id>"
```
Naamgeving spiegelt de bestaande `D365-ODATA-DEV-*` secrets.

#### Stap B2 — Managed identity leesrechten — ✅ **al geregeld, no-op**
Geverifieerd 2026-07-19:
- Vault `kv-vp-ne-20260628` draait op **RBAC** (`enableRbacAuthorization: true`), niet op access policies. *(Eerdere versie van dit plan gebruikte `az keyvault set-policy` — dat zou gefaald zijn op deze vault.)*
- `vendorportal-prod` heeft een `SystemAssigned` identity: `c50a56c0-7988-4ebf-9300-d35072d4000b`
- Die identity heeft de rol **`Key Vault Secrets User`** op de **gehele vault** — dus ook op de nieuwe `D365-ODATA-PROD-*` secrets. Geen actie nodig.

#### Stap B3 — `deploy-prod.yml` uitbreiden
In de stap *Container App bijwerken* (`regel 55-68`), volgens het bestaande keyvaultref-patroon:

```yaml
az containerapp secret set \
  --name "$APP_NAME" \
  --resource-group "$ACA_RESOURCE_GROUP" \
  --secrets \
    sql-connection-string="keyvaultref:https://${KEY_VAULT_NAME}.vault.azure.net/secrets/sql-connection-string-prod,identityref:system" \
    session-secret="keyvaultref:https://${KEY_VAULT_NAME}.vault.azure.net/secrets/session-secret-prod,identityref:system" \
    d365-base-url="keyvaultref:https://${KEY_VAULT_NAME}.vault.azure.net/secrets/D365-ODATA-PROD-BASE-URL,identityref:system" \
    d365-tenant-id="keyvaultref:https://${KEY_VAULT_NAME}.vault.azure.net/secrets/D365-ODATA-PROD-TENANT-ID,identityref:system" \
    d365-client-id="keyvaultref:https://${KEY_VAULT_NAME}.vault.azure.net/secrets/D365-ODATA-PROD-CLIENT-ID,identityref:system" \
    d365-client-secret="keyvaultref:https://${KEY_VAULT_NAME}.vault.azure.net/secrets/D365-ODATA-PROD-CLIENT-SECRET,identityref:system"

az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$ACA_RESOURCE_GROUP" \
  --set-env-vars \
    SQL_CONNECTION_STRING=secretref:sql-connection-string \
    SESSION_SECRET=secretref:session-secret \
    APP_ENV=production \
    D365_ODATA_BASE_URL=secretref:d365-base-url \
    D365_ODATA_TENANT_ID=secretref:d365-tenant-id \
    D365_ODATA_CLIENT_ID=secretref:d365-client-id \
    D365_ODATA_CLIENT_SECRET=secretref:d365-client-secret \
    D365_ODATA_COMPANY="<company uit A4>"
```

Daarna hetzelfde voor `deploy-dev.yml` met de bestaande `D365-ODATA-DEV-*` secrets — dan is gat #3 ook dicht en zijn DEV en PROD symmetrisch.

#### Stap B4 — Health check uitbreiden met een D365-readiness-probe
`server/server.js:152` geeft nu onvoorwaardelijk `{ status: 'ok' }`.

Toevoegen: `GET /api/health/d365` die de config leest en een token ophaalt (niet een volledige data-query — dat is te traag en te duur voor een health check). Retourneert base URL en company, **nooit** de secret.

> De bestaande `/api/health` bewust ongewijzigd laten: dat is de liveness-probe voor de Container App. Een D365-storing mag geen container-restart triggeren. De nieuwe route is een *readiness/diagnose*-probe.

#### Stap B5 — De deploy laten falen bij een kapotte D365-koppeling
Na de bestaande health-curl in `deploy-prod.yml:83`:
```bash
curl --fail --silent --show-error "https://${FQDN}/api/health/d365"
```
Hiermee is gat #5 dicht: een PROD-deploy kan niet meer groen worden terwijl D365 onbereikbaar is.

#### Stap B6 — ✅ gecontroleerd 2026-07-19: schoon
Read-only query op `vendorportal-prod-db` (`sql-vp-ne-20260628`): **nul `D365_ODATA%`-rijen** in
`dbo.app_settings`. PROD draait dus volledig op de env vars uit Key Vault; geen oude sandbox-waarde
die de deploy-config overschrijft. Het stille faalscenario is voor deze database niet aanwezig.

<details><summary>Oorspronkelijke stap</summary>
Voordat de eerste deploy live gaat, checken of er al handmatig ingetypte waarden in de PROD-database staan die de nieuwe env vars zouden overschrijven:
```sql
SELECT [key], CASE WHEN [key] LIKE '%SECRET%' THEN '***' ELSE value END
FROM dbo.app_settings WHERE [key] LIKE 'D365_ODATA%';
```
Staan er rijen die naar de sandbox wijzen → verwijderen, anders blijft PROD stilletjes naar ACC praten ondanks een correcte deploy. **Dit is het meest waarschijnlijke stille faalscenario van het hele plan.**
</details>

#### Stap B7 — Go-live checklist actualiseren
`docs/guides/LIVEGANG_CHECKLIST.md`: `[APP_NAME]`-placeholders vervangen, de verouderde "package-lock.json ontbreekt"-regel schrappen (die bestaat wél), en een D365-sectie toevoegen met de verificatiestappen uit fase C.

---

### Fase C — Verificatie & nazorg

#### Stap C1 — Rooktest na de eerste PROD-deploy
1. `GET /api/health/d365` → verwacht `ok` mét de **LIVE** base URL in het antwoord (niet `-acc.sandbox`)
2. In de app: PO-lijst laden, controleren dat er LIVE-ordernummers verschijnen
3. Admin → OData-instellingen: base URL moet de LIVE-URL tonen
4. Container App-logs op OAuth-fouten controleren:
   ```bash
   az containerapp logs show -n vendorportal-prod -g vanbommel-vendorportal --tail 100
   ```

#### Stap C2 — Write-back gecontroleerd testen
Alleen als je in stap A3 schrijfrechten hebt gegeven. Kies één testorder in LIVE, wijzig één veld, verifieer in F&O. Doe dit **vóór** je gebruikers toelaat.

#### Stap C3 — Secret-rotatie agenderen
De client secret uit A1 verloopt. Zet een herinnering ~1 maand vóór de vervaldatum. Rotatie = alleen `az keyvault secret set` met de nieuwe waarde + een Container App restart; geen code-wijziging.

---

## 4. Volgorde en afhankelijkheden

```
A1 (ik) → A5 (ik) ─┐
                   ├─> A3 (JIJ, in F&O LIVE) → B1 → B2 → B3 → B6 → deploy → B5 → C1 → C2
A4 (JIJ: URL+company) ┘
                     B4, B7 (ik, parallel — geen input nodig)
```

**Kritiek pad:** stap **A3** — de registratie in de F&O LIVE-omgeving. Dat is de enige stap die alleen jij kunt doen en die niets anders kan vervangen. A1/A5 kan ik direct uitvoeren; A2 is vervallen.

**Wat ik nodig heb om te starten:** de LIVE base URL en de company/`dataAreaId` (stap A4). Zonder base URL kan ik B1 niet vullen; de app-registratie zelf (A1) kan wel al.

---

## 5. Openstaande vragen

1. **Welke F&O-gebruiker in het `User Id`-veld?** Zie A3. Aanbeveling: een dedicated niet-interactieve gebruiker, read-only bij start.
2. **Akkoord op het aanmaken van de app-registratie** in de productie-tenant? Omkeerbaar (verwijderen kan), maar wel een echte wijziging in Entra.

*Beantwoord 2026-07-19: base URL (`https://vanbommel.operations.dynamics.com/`), company (`WHSL`), tenant (gelijk aan DEV).*

*Vervallen: eerdere vraag over al bestaande credentials in `vbo-keyvault-d365-prd` — er is bevestigd nog geen registratie in de LIVE-omgeving, dus die vault bevat niets bruikbaars voor deze app.*
