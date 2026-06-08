targetScope = 'subscription'

@description('Naam van de resource group voor Supplier Portal.')
param resourceGroupName string = 'vanbommel-vendorportal'

@description('Azure locatie voor de resource group en resources.')
param location string = 'northeurope'

@description('Naam van de Key Vault.')
param keyVaultName string

@description('Naam van de SQL server.')
param sqlServerName string

@description('SQL admin gebruikersnaam.')
param sqlAdminLogin string

@secure()
@description('SQL admin wachtwoord.')
param sqlAdminPassword string

@description('Naam van de Supplier Portal database.')
param sqlDatabaseName string = 'sqldb-vendorportal'

@description('Naam van de Container Apps Environment.')
param containerAppsEnvironmentName string

@description('Naam van de DEV Container App.')
param containerAppDevName string = 'vendorportal-dev'

@description('Naam van de PROD Container App.')
param containerAppProdName string = 'vendorportal-prod'

@description('Container image voor DEV.')
param containerAppDevImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Container image voor PROD.')
param containerAppProdImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Tags voor alle resources.')
param tags object = {}

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module foundation './main.bicep' = {
  name: 'supplierPortalFoundation'
  scope: rg
  params: {
    location: location
    keyVaultName: keyVaultName
    sqlServerName: sqlServerName
    sqlAdminLogin: sqlAdminLogin
    sqlAdminPassword: sqlAdminPassword
    sqlDatabaseName: sqlDatabaseName
    containerAppsEnvironmentName: containerAppsEnvironmentName
    containerAppDevName: containerAppDevName
    containerAppProdName: containerAppProdName
    containerAppDevImage: containerAppDevImage
    containerAppProdImage: containerAppProdImage
    tags: tags
  }
}

output resourceGroupId string = rg.id
output keyVaultResourceId string = foundation.outputs.keyVaultResourceId
output containerAppDevResourceId string = foundation.outputs.containerAppDevResourceId
output containerAppProdResourceId string = foundation.outputs.containerAppProdResourceId
