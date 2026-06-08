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

resource containerAppDev 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppDevName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
      }
      secrets: []
      activeRevisionsMode: 'Single'
    }
    template: {
      containers: [
        {
          name: 'app'
          image: containerAppDevImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
      }
    }
  }
}

resource containerAppProd 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppProdName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
      }
      secrets: []
      activeRevisionsMode: 'Single'
    }
    template: {
      containers: [
        {
          name: 'app'
          image: containerAppProdImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output keyVaultResourceId string = keyVault.id
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseResourceId string = sqlDatabase.id
output containerAppsEnvironmentResourceId string = containerAppsEnvironment.id
output containerAppDevResourceId string = containerAppDev.id
output containerAppProdResourceId string = containerAppProd.id
