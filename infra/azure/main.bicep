targetScope = 'resourceGroup'

@description('Azure locatie voor alle resources.')
param location string = resourceGroup().location

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

@description('Tags voor alle resources.')
param tags object = {}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    publicNetworkAccess: 'Enabled'
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enabledForTemplateDeployment: true
  }
}

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: sqlServerName
  location: location
  tags: tags
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    publicNetworkAccess: 'Enabled'
    minimalTlsVersion: '1.2'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  name: '${sqlServer.name}/${sqlDatabaseName}'
  location: location
  tags: tags
  sku: {
    name: 'Basic'
    tier: 'Basic'
  }
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppsEnvironmentName
  location: location
  tags: tags
  properties: {}
}

output keyVaultResourceId string = keyVault.id
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseResourceId string = sqlDatabase.id
output containerAppsEnvironmentResourceId string = containerAppsEnvironment.id
