# D365 F&O MCP koppelen in Cursor

Dit document helpt je om je bestaande MCP setup (die al werkt in Copilot Studio) ook werkend te krijgen in Cursor.

## 1) Wat is al geregeld

- Er is een projectconfig aangemaakt in `.cursor/mcp.json`.
- Er is een MCP server entry toegevoegd met naam `d365-fo-mcp`.
- Secrets staan niet hardcoded in code, maar via environment variables.

## 2) Cursor configuratie (project)

Bestand: `.cursor/mcp.json`

Controleer dat je config er ongeveer zo uitziet:

```json
{
  "mcpServers": {
    "d365-fo-mcp": {
      "url": "https://YOUR_D365_MCP_ENDPOINT/mcp",
      "headers": {
        "Authorization": "Bearer ${env:D365_MCP_TOKEN}",
        "X-Tenant": "${env:D365_TENANT_ID}"
      }
    }
  }
}
```

Vervang:
- `YOUR_D365_MCP_ENDPOINT` met jouw echte endpoint.

## 3) Windows environment variables instellen

Gebruik PowerShell (User scope):

```powershell
[System.Environment]::SetEnvironmentVariable("D365_MCP_TOKEN","<JOUW_TOKEN>","User")
[System.Environment]::SetEnvironmentVariable("D365_TENANT_ID","<JOUW_TENANT_ID>","User")
```

Belangrijk:
- Sluit Cursor volledig af en start opnieuw op na env-wijzigingen.

### Handig: token automatisch verversen via script

Er is een script toegevoegd: `refresh-d365-mcp-token.ps1`

Gebruik:

```powershell
.\refresh-d365-mcp-token.ps1 -PersistToUserEnv
```

Wat dit doet:
- Haalt via Azure CLI een vers token op voor `https://vanbommel-acc.sandbox.operations.dynamics.com`
- Schrijft dat token naar `D365_MCP_TOKEN` (User env var)
- Je hoeft daarna alleen Cursor opnieuw te starten

## 4) Informatie overnemen uit Copilot Studio

Neem uit je werkende Copilot Studio MCP-verbinding exact over:
- Endpoint URL
- Auth type (Bearer token of OAuth)
- Vereiste headers
- Eventuele scopes / tenant / audience vereisten

Als Copilot Studio werkt, is die configuratie meestal de snelste route naar een werkende Cursor setup.

## 5) Azure checks (afhankelijk van auth type)

## 5A) Bearer token flow

Controleer:
- Token issuer is correct.
- Token audience (`aud`) matcht jouw MCP backend.
- Token is niet verlopen.
- Vereiste claims/scopes zijn aanwezig.

## 5B) OAuth flow

Controleer in Azure Entra App Registration:
- Client ID / secret / scopes.
- Redirect URI voor Cursor OAuth callback:
  - `cursor://anysphere.cursor-mcp/oauth/callback`
- API permissions en consent zijn correct.

## 6) Testen in Cursor

1. Herstart Cursor.
2. Open MCP/Tools instellingen en controleer dat `d365-fo-mcp` zichtbaar is.
3. Doe een simpele testcall via chat naar de MCP server.
4. Bij fouten: check MCP logs in Cursor output.

Tip:
- Gebruik endpoint `https://vanbommel-acc.sandbox.operations.dynamics.com/mcp`
- Niet `.../mcp/sse` tenzij je backend dat expliciet ondersteunt

## 7) Veelvoorkomende fouten en oplossing

- Server niet zichtbaar:
  - JSON syntaxfout in `.cursor/mcp.json`
  - Verkeerd bestandspad
- 401/403:
  - Verkeerd token of verkeerde scope/audience
  - Env var niet geladen (Cursor herstart vergeten)
- Timeout/connection:
  - Endpoint fout
  - Firewall/proxy blokkeert
- OAuth problemen:
  - Redirect URI ontbreekt
  - Scopes of consent niet compleet

## 8) Wat ik voor je kan doen (nu en daarna)

Ik kan direct voor je doen:
- `.cursor/mcp.json` verder invullen op basis van jouw echte endpoint/auth details.
- Git beheer: branch, commit, merge, PR voorbereiden.
- Validatie uitvoeren van JSON/config en basis troubleshooting.
- Documentatie/handleidingen in repo bijhouden.

Ik kan voor je doen via CLI als beschikbaar:
- Azure CLI (`az`) checks:
  - Entra app registrations opzoeken
  - Redirect URI en app settings controleren
  - Relevante resource configuraties valideren
- GitHub CLI (`gh`) acties:
  - Remote instellen
  - Push en PR aanmaken

Ik kan (nu) niet zonder jouw gegevens:
- Jouw token/client secret invullen (security).
- OAuth consent schermen namens jou afronden als interactieve login nodig is.
- Tenant-specifieke instellingen raden zonder concrete IDs/URLs.

## 9) Aanbevolen vervolgstappen

1. Lever endpoint + auth model (Bearer of OAuth) aan.
2. Ik werk direct je `mcp.json` definitief bij.
3. We draaien een testcall en lossen eventuele auth/connectiefouten direct op.
