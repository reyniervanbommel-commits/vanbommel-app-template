param(
    [string]$EnvVarName = "ADO_MCP_AUTH_TOKEN",
    [switch]$PersistToUserEnv,
    [switch]$UsePat
)

$ErrorActionPreference = "Stop"

# Azure DevOps resource ID for az account get-access-token
$DevOpsResourceId = "499b84ac-1321-427f-aa17-267ca6975798"

if ($UsePat) {
    $pat = [System.Environment]::GetEnvironmentVariable("AZURE_DEVOPS_PAT", "User")
    if (-not $pat) {
        throw "Missing AZURE_DEVOPS_PAT in User environment variables. Create a PAT in Azure DevOps and store it there."
    }
    $token = $pat
    Write-Host "Using Personal Access Token from AZURE_DEVOPS_PAT."
} else {
    Write-Host "Checking Azure CLI login..."
    $null = az account show --output none

    Write-Host "Requesting Azure DevOps access token..."
    $token = az account get-access-token --resource $DevOpsResourceId --query accessToken -o tsv
}

if (-not $token) {
    throw "No access token returned."
}

Set-Item -Path "Env:$EnvVarName" -Value $token

if ($PersistToUserEnv) {
    [System.Environment]::SetEnvironmentVariable($EnvVarName, $token, "User")
    Write-Host "Token stored in User environment variable '$EnvVarName'."
    Write-Host "Restart Cursor to load updated User env vars."
} else {
    Write-Host "Token set for current shell session only."
}

Write-Host "Done."
