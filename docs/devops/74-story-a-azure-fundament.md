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
5. Subscription deploy toegevoegd: `infra/azure/subscription.bicep`
6. Secrets matrix toegevoegd: `docs/devops/75-story-a-secrets-matrix.md`
7. Deploy workflows uitgebreid met Key Vault secretrefs + healthcheck-validatie

## Openstaande Story A checks

- [x] Resource Group provisioning automatiseren (subscription deployment)
- [x] Container Apps `vendorportal-dev` en `vendorportal-prod` definities toevoegen
- [x] Key Vault secret references koppelen in deploy workflows
- [x] Deploy-validatie vastleggen (healthcheck + output controls)
- [x] Secrets matrix voor DEV/PROD finaliseren
