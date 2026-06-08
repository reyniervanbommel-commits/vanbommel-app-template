# Azure fundament (Story A)

Dit is de start van ticket Story A uit het Supplier Portal DevOps-plan.

## Inhoud

- `main.bicep`: basisresources voor Supplier Portal in een bestaande resource group
- `main.parameters.example.json`: voorbeeldparameters voor DEV
- `subscription.bicep`: provisioning vanaf subscription-niveau inclusief resource group
- `subscription.parameters.example.json`: voorbeeldparameters voor subscription deploy

## Resources in scope

- Key Vault
- SQL Server + SQL Database
- Container Apps Environment

## Deploy (voorbeeld)

### Vanaf subscription (maakt ook de resource group)

```bash
az deployment sub create \
  --location northeurope \
  --template-file infra/azure/subscription.bicep \
  --parameters @infra/azure/subscription.parameters.example.json
```

### Alleen in bestaande resource group

```bash
az deployment group create \
  --resource-group vanbommel-vendorportal \
  --template-file infra/azure/main.bicep \
  --parameters @infra/azure/main.parameters.example.json
```

## Opmerking

Container Apps dev/prod worden nu ook als resources gedeployed. Verdere hardening (private endpoints, strengere networking, identity-to-role assignments) volgt in vervolgstappen.
