param(
    [string]$ResourceUrl = "https://vanbommel-acc.sandbox.operations.dynamics.com",
    [string]$EnvVarName = "D365_MCP_TOKEN",
    [switch]$PersistToUserEnv,
    [switch]$UseUserToken
)

$ErrorActionPreference = "Stop"

if ($UseUserToken) {
    Write-Host "Checking Azure CLI login..."
    $null = az account show --output none

    Write-Host "Requesting USER access token for resource: $ResourceUrl"
    $token = az account get-access-token --resource $ResourceUrl --query accessToken -o tsv
} else {
    $tenantId = [System.Environment]::GetEnvironmentVariable("D365_MCP_TENANT_ID", "User")
    $clientId = [System.Environment]::GetEnvironmentVariable("D365_MCP_CLIENT_ID", "User")
    $clientSecret = [System.Environment]::GetEnvironmentVariable("D365_MCP_CLIENT_SECRET", "User")

    if (-not $tenantId -or -not $clientId -or -not $clientSecret) {
        throw "Missing D365_MCP_TENANT_ID / D365_MCP_CLIENT_ID / D365_MCP_CLIENT_SECRET in User environment variables."
    }

    Write-Host "Requesting APP access token using configured MCP app registration..."
    $body = @{
        client_id     = $clientId
        client_secret = $clientSecret
        scope         = "$ResourceUrl/.default"
        grant_type    = "client_credentials"
    }

    $response = Invoke-RestMethod -Method Post `
        -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $body

    $token = $response.access_token
}

if (-not $token) {
    throw "No access token returned."
}

# Always set token for current session so immediate testing works.
Set-Item -Path "Env:$EnvVarName" -Value $token

if ($PersistToUserEnv) {
    [System.Environment]::SetEnvironmentVariable($EnvVarName, $token, "User")
    Write-Host "Token stored in User environment variable '$EnvVarName'."
    Write-Host "Restart Cursor to load updated User env vars."
} else {
    Write-Host "Token set for current shell session only."
}

Write-Host "Done."
