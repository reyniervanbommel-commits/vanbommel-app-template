# Story A - Azure fundament (in uitvoering)

## Status

- Ticket: gestart
- Type: DevOps / infrastructuur
- Scope: RG `vanbommel-vendorportal`, SQL, Key Vault, Container Apps basis

## Opgeleverde startitems

1. Startplan toegevoegd: `.cursor/plans/2026-06-08-story-a-azure-fundament.plan.md`
2. IaC scaffold toegevoegd: `infra/azure/main.bicep`
3. Parameter voorbeeld toegevoegd: `infra/azure/main.parameters.example.json`
4. Deploy-handleiding toegevoegd: `infra/azure/README.md`

## Openstaande Story A checks

- [ ] Resource Group provisioning automatiseren (subscription deployment)
- [ ] Container Apps `vendorportal-dev` en `vendorportal-prod` definities toevoegen
- [ ] Key Vault secret references koppelen in deploy workflows
- [ ] Deploy-validatie vastleggen (healthcheck + output controls)
- [ ] Secrets matrix voor DEV/PROD finaliseren
