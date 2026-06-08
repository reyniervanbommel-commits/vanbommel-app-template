# Azure fundament (Story A)

Dit is de start van ticket Story A uit het Supplier Portal DevOps-plan.

## Inhoud

- `main.bicep`: basisresources voor Supplier Portal in een bestaande resource group
- `main.parameters.example.json`: voorbeeldparameters voor DEV

## Resources in scope

- Key Vault
- SQL Server + SQL Database
- Container Apps Environment

## Deploy (voorbeeld)

```bash
az deployment group create \
  --resource-group vanbommel-vendorportal \
  --template-file infra/azure/main.bicep \
  --parameters @infra/azure/main.parameters.example.json
```

## Opmerking

Resource Group, Container Apps (app instances) en pipeline-secrets worden in vervolgstappen uitgewerkt binnen Story A.
