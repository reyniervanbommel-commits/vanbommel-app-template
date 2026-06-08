# MCP D365 Cursor Setup

Korte projecthandleiding om Dynamics 365 F&O MCP te gebruiken in Cursor.

## Inhoud

- `MCP_D365_CURSOR_SETUP.md` -> volledige setupstappen
- `D365_MCP_AUTH_CHECKLIST.md` -> auth en troubleshooting checklist
- `.cursor/mcp.json` -> Cursor MCP server configuratie
- `refresh-d365-mcp-token.ps1` -> token refresh script

## Quick start

1. Controleer in D365 F&O:
   - Feature management: `Dynamics 365 ERP Model Context Protocol server` is Enabled
   - `System administration > Setup > Allowed MCP clients`:
     - ClientId `6a2ec1cb-0340-4cdc-90bc-591de060f3f1`
     - `Allowed = true`
   - `System administration > Setup > Microsoft Entra ID applications`:
     - Zelfde Client ID gekoppeld aan juiste User ID

2. Verfris lokaal token:

```powershell
.\refresh-d365-mcp-token.ps1 -PersistToUserEnv
```

3. Herstart Cursor volledig.

4. Test MCP in Cursor met prompts uit:
   - `D365_MCP_AUTH_CHECKLIST.md` -> sectie `12) Eerste 3 testprompts in Cursor`

## Endpoint

- MCP endpoint: `https://vanbommel-acc.sandbox.operations.dynamics.com/mcp`

## Opmerking

Als `/mcp` nog `403` geeft maar `/data/` wel werkt, is de kans groot dat de MCP platform-toegang in F&O nog niet volledig is geconfigureerd (Allowed MCP clients / feature / app-koppeling).
