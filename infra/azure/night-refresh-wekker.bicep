targetScope = 'resourceGroup'

@description('Publieke origin van vendorportal-prod, zonder trailing slash.')
param prodAppUrl string

@description('Key Vault naam met secret night-refresh-token-prod.')
param keyVaultName string

param location string = resourceGroup().location

param logicAppName string = 'vendorportal-night-refresh-prod'
param nightRefreshSecretName string = 'night-refresh-token-prod'

var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource nightRefreshSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' existing = {
  parent: keyVault
  name: nightRefreshSecretName
}

var workflowDefinition = json(replace(
  loadTextContent('night-refresh-wekker.definition.json'),
  '__VAULT_URI__',
  keyVault.properties.vaultUri
))

resource wekker 'Microsoft.Logic/workflows@2019-05-01' = {
  name: logicAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    state: 'Enabled'
    parameters: {
      prodAppUrl: {
        type: 'String'
        value: prodAppUrl
      }
    }
    definition: workflowDefinition
  }
}

resource secretRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(nightRefreshSecret.id, wekker.id, kvSecretsUserRoleId)
  scope: nightRefreshSecret
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: wekker.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
