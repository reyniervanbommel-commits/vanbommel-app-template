# Azure DevOps MCP koppelen in Cursor (lokaal + cloud agents)

De DevOps MCP staat in `.cursor/mcp.json` onder servernaam `Devops`. Cloud agents hebben **niet-interactieve** auth nodig via `ADO_MCP_AUTH_TOKEN`.

## 1) Wat is al geregeld

- Projectconfig in `.cursor/mcp.json` met org `ReyniervanBommel0745`
- Standaardproject: **Vendor-App** (`ado_mcp_project` GUID)
- Domains: `core`, `work`, `work-items`
- Auth: `--authentication envvar` (werkt lokaal én op cloud agents)

## 2) Lokaal (Cursor Desktop)

### Optie A — Azure CLI (snel, token ~1 uur geldig)

```powershell
.\refresh-ado-mcp-token.ps1 -PersistToUserEnv
```

Herstart Cursor daarna. Script gebruikt `az account get-access-token` voor Azure DevOps.

### Optie B — Personal Access Token (stabieler)

1. Maak een [PAT](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate) aan in Azure DevOps (scopes: Work Items Read & Write, Project and Team Read).
2. Sla op als User env var:

```powershell
[System.Environment]::SetEnvironmentVariable("ADO_MCP_AUTH_TOKEN","<JOUW_PAT>","User")
```

Of bewaar de PAT als `AZURE_DEVOPS_PAT` en run:

```powershell
.\refresh-ado-mcp-token.ps1 -UsePat -PersistToUserEnv
```

3. Herstart Cursor.

## 3) Cloud agents (Cursor Dashboard)

Cloud agents draaien headless — interactieve login werkt niet.

1. Ga naar [cursor.com → Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents)
2. Voeg secret toe:
   - **Naam:** `ADO_MCP_AUTH_TOKEN`
   - **Waarde:** een Azure DevOps PAT (aanbevolen) of een geldig bearer token
3. Start een cloud agent opnieuw na het toevoegen van het secret.

Optioneel (zelfde token als lokaal D365):

| Secret | Gebruik |
|--------|---------|
| `ADO_MCP_AUTH_TOKEN` | Azure DevOps MCP (verplicht voor cloud) |
| `D365_MCP_TOKEN` | D365 F&O MCP (optioneel) |

## 4) Testen

1. Herstart Cursor (lokaal) of start een cloud agent opnieuw.
2. Controleer in MCP/Tools dat `Devops` actief is.
3. Probeer: "Toon mijn open work items in Vendor-App" of "Haal work item #130 op".

## 5) Veelvoorkomende fouten

| Symptom | Oplossing |
|---------|-----------|
| MCP server start niet | Controleer of `ADO_MCP_AUTH_TOKEN` is gezet |
| 401 / auth failed | Token verlopen (az-token) → refresh script opnieuw draaien of PAT gebruiken |
| Verkeerd project | `ado_mcp_project` in `.cursor/mcp.json` wijst naar Vendor-App GUID |
| Cloud agent ziet MCP niet | Secret `ADO_MCP_AUTH_TOKEN` in dashboard + agent herstarten |
| `npx` timeout | Node.js 20+ vereist; cloud agents hebben Node 22 via `npm ci` |

## 6) Org- en projectgegevens

| Veld | Waarde |
|------|--------|
| Organisatie | `ReyniervanBommel0745` |
| Project | `Vendor-App` |
| Project GUID | `d7db55dd-a46b-4c68-a6a1-b6cbc1ef23c7` |
| DevOps URL | `https://dev.azure.com/reyniervanbommel0745/Vendor-App` |

## 7) Referenties

- [Azure DevOps MCP — Getting Started](https://github.com/microsoft/azure-devops-mcp/blob/main/docs/GETTINGSTARTED.md)
- [Cursor Cloud Agents — Secrets](https://cursor.com/docs/cloud-agent/setup#environment-variables-and-secrets)
- Project skills: `post-plan-to-devops`, `develop-from-devops`
