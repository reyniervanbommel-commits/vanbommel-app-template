# D365 MCP Auth Checklist (Azure + F&O + Cursor)

Gebruik deze lijst van boven naar beneden. Vink elk punt af voordat je verdergaat.

## 0) Startstatus

- [ ] Endpoint in Cursor staat op: `https://vanbommel-acc.sandbox.operations.dynamics.com/mcp`
- [ ] `D365_MCP_TOKEN` bestaat in User environment variables
- [ ] Cursor is volledig herstart na token update

## 0B) MCP server feature en platform toegang (kritisch)

Locatie: D365 F&O -> Feature management

- [ ] Feature `Dynamics 365 ERP Model Context Protocol server` staat op Enabled
- [ ] Omgeving voldoet aan MCP-vereisten (minimaal ondersteunde versie en ondersteund omgevingstype)

Locatie: D365 F&O -> System administration -> Setup -> Allowed MCP clients

- [ ] Record bestaat voor jouw eigen app `ClientId = 6a2ec1cb-0340-4cdc-90bc-591de060f3f1`
- [ ] `Allowed = true` voor die client
- [ ] Optioneel: naam herkenbaar, bijv. `MCP-D365-Cursor`

Verwacht resultaat:
- MCP endpoint accepteert requests van jouw agentplatform/client-id.

## 1) Azure Entra - App registratie controleren

Locatie: Entra admin center -> App registrations -> jouw app

- [ ] App registration bestaat en is Single-tenant
- [ ] `Application (client) ID` genoteerd
- [ ] `Directory (tenant) ID` genoteerd
- [ ] Er is een geldig secret of certificaat (niet verlopen)
- [ ] Secret expiry gecontroleerd (geen bijna-verlopen secret)

Verwacht resultaat:
- Je hebt een geldige confidential client app met actuele credentials.

## 2) Azure Entra - API permissies/consent controleren

Locatie: Entra admin center -> App registrations -> jouw app -> API permissions

- [ ] Vereiste Dynamics/F&O permissies toegevoegd (volgens jullie integratiestandaard)
- [ ] Geen incomplete of pending consent meldingen
- [ ] Admin consent uitgevoerd waar vereist
- [ ] Geen oude/onnodige permissies die conflicteren met huidige flow

Verwacht resultaat:
- Token-uitgifte en toestemming zijn correct voor deze app.

## 3) D365 F&O - App registreren in F&O

Locatie: D365 F&O -> System administration -> Setup -> Microsoft Entra applications

- [ ] Record bestaat voor jouw `Client ID`
- [ ] `Name` staat logisch en herkenbaar
- [ ] `User ID` is gekoppeld (bij voorkeur dedicated service account)
- [ ] Record opgeslagen zonder fouten

Verwacht resultaat:
- F&O herkent de Entra app en kan requests mappen naar een F&O user context.

## 4) D365 F&O - Security rechten op gekoppelde User ID

Locatie: D365 F&O -> System administration -> Users / Security configuration

- [ ] Gekoppelde `User ID` bestaat en is actief
- [ ] Benodigde security roles zijn toegewezen voor de acties die MCP moet uitvoeren
- [ ] Geen deny/restrictie policies die API-calls blokkeren
- [ ] Als test: tijdelijk hogere rol geprobeerd om autorisatie uit te sluiten

Verwacht resultaat:
- De user achter de app mag functioneel doen wat de MCP-call vraagt.

## 5) D365 F&O - Integratie prioriteit (optioneel maar aanbevolen)

Locatie: D365 F&O -> System administration -> Setup -> Throttling priority mapping

- [ ] Mapping toegevoegd voor `Microsoft Entra application` met jouw `Client ID`
- [ ] Priority gezet op `Medium` of `High` voor bedrijfskritische integratie

Verwacht resultaat:
- Minder kans dat requests onnodig vroeg worden gethrottled.

## 6) Cursor - MCP configuratie valideren

Locatie: projectbestand `.cursor/mcp.json`

- [ ] Servernaam: `d365-fo-mcp`
- [ ] URL: `https://vanbommel-acc.sandbox.operations.dynamics.com/mcp`
- [ ] Header `Authorization` gebruikt `Bearer ${env:D365_MCP_TOKEN}`
- [ ] Header `X-Tenant` alleen gebruiken als backend dit echt vereist
- [ ] Geen hardcoded secrets in bestand

Verwacht resultaat:
- Cursor leest een correcte MCP-config zonder syntax/auth anti-patterns.

## 7) Eindtest (na alle checks)

- [ ] Token opnieuw ververst
- [ ] Cursor volledig herstart
- [ ] MCP call opnieuw getest
- [ ] Resultaat vastgelegd: statuscode + timestamp

Doel:
- Geen `403` meer, en succesvolle response op MCP-call.

## 8) Snelle diagnose bij 403

Als je nog `403` krijgt, ga in deze volgorde:

1. F&O `Microsoft Entra applications` mapping klopt niet -> fix stap 3  
2. Gekoppelde F&O `User ID` mist rechten -> fix stap 4  
3. Entra app mist consent/permissie -> fix stap 2  
4. Token bevat verkeerde context (verkeerde app/tenant) -> controleer stap 1  
5. Header-contract endpoint wijkt af (`X-Tenant` of extra header nodig) -> endpoint-specific check

## 8B) MCP-specifieke diagnose (gevalideerd in deze omgeving)

Feiten uit uitgevoerde tests:

- `https://.../data/` met app-token geeft `200`
- `https://.../mcp` met hetzelfde app-token geeft `403`
- Dit betekent: algemene app-auth werkt, maar MCP endpoint autorisatie faalt specifiek

Tokenverschil dat is bevestigd:

- CLI-token:
  - `idtyp=user`
  - `appid=04b07795-8ddb-461a-bbee-02f9e1bf7b46` (Azure CLI first-party)
  - `scp=user_impersonation`
- Eigen app-token:
  - `idtyp=app`
  - `appid=6a2ec1cb-0340-4cdc-90bc-591de060f3f1`
  - geen `scp` (client credentials flow)

Interpretatie:

- Als MCP alleen delegated user-tokens accepteert, dan faalt app-only token met `403`.
- Als MCP app-tokens accepteert, dan mist waarschijnlijk nog MCP-specifieke app-authorisatie in F&O/backend.

## 8C) Copilot Studio vergelijken (must-do)

Omdat Copilot Studio wel werkt, vergelijk exact deze punten met Cursor:

1. Zelfde endpointpad?
   - `.../mcp` of `.../mcp/sse`
2. Zelfde token type?
   - delegated user-token (`idtyp=user`) of app-token (`idtyp=app`)
3. Zelfde app registration (`client_id`)?
4. Zelfde tenant en audience?
5. Extra headers aanwezig in Copilot Studio maar niet in Cursor?
6. Zit er een proxy/bridge in Copilot Studio flow die auth transformeert?

Als 1 van deze afwijkt, eerst gelijk trekken en opnieuw testen.

## 9) Wat ik direct voor je kan uitvoeren

- Azure CLI controles op app, tenant en tokenclaims
- Token refresh en endpoint probes
- Cursor MCP config bijwerken en valideren
- Troubleshooting documenteren per testresultaat

## 10) Wat jij waarschijnlijk in portal/F&O moet doen

- Entra consent afronden als admin-flow nodig is
- F&O app-user mapping en security roles instellen/bevestigen
- Eventuele organisatie-specifieke security policies laten vrijgeven

## 11) Bekende waarden in deze setup

- F&O host: `https://vanbommel-acc.sandbox.operations.dynamics.com`
- MCP endpoint: `https://vanbommel-acc.sandbox.operations.dynamics.com/mcp`
- Gemaakte Entra app: `MCP-D365-Cursor`
- Client ID: `6a2ec1cb-0340-4cdc-90bc-591de060f3f1`
- Gekoppelde F&O User ID (beoogd): `reyniervanBommel`

## 12) Eerste 3 testprompts in Cursor

Gebruik na herstart van Cursor deze drie prompts in volgorde:

1. `Initialiseer de d365-fo-mcp server en bevestig serverInfo.`
2. `Vraag de lijst met beschikbare MCP tools op voor d365-fo-mcp.`
3. `Gebruik een veilige read-only tool (bijvoorbeeld entity zoeken) en toon het resultaat.`

Verwacht patroon:

- Prompt 1 slaagt met serverinformatie
- Prompt 2 geeft tools terug
- Prompt 3 geeft functionele data terug zonder auth-fouten
