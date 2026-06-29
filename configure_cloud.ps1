param(
  [Parameter(Mandatory = $true)]
  [string]$SupabaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$SupabaseAnonKey,

  [Parameter(Mandatory = $false)]
  [string]$SupabaseServiceRoleKey,

  [Parameter(Mandatory = $false)]
  [string]$SupabaseTable = "sns_follower_records",

  [Parameter(Mandatory = $false)]
  [string]$GitHubRepo,

  [switch]$SkipGitHubSecrets
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir "supabase-config.js"

if (-not $SupabaseUrl.StartsWith("https://")) {
  throw "SupabaseUrl must start with https://"
}

if ($GitHubRepo -and $GitHubRepo -eq "OWNER/REPO") {
  throw "GitHubRepo is still OWNER/REPO. Replace it with the real repository name, for example kitaharu/sns-analytics."
}

$safeUrl = $SupabaseUrl.TrimEnd("/")
$config = @"
window.SNS_ANALYTICS_CONFIG = {
  supabaseUrl: "$safeUrl",
  supabaseAnonKey: "$SupabaseAnonKey",
  table: "$SupabaseTable"
};
"@

Set-Content -LiteralPath $configPath -Value $config -Encoding UTF8
Write-Host "Updated: $configPath"

if ($SkipGitHubSecrets) {
  Write-Host "Skipped GitHub Secrets."
  exit 0
}

if (-not $SupabaseServiceRoleKey) {
  Write-Host "SupabaseServiceRoleKey was not provided. GitHub Secrets were not updated."
  Write-Host "Run again with -SupabaseServiceRoleKey, or set secrets manually in GitHub."
  exit 0
}

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Host "GitHub CLI was not found. Set GitHub Secrets manually."
  exit 0
}

$repoArgs = @()
if ($GitHubRepo) {
  $repoArgs = @("--repo", $GitHubRepo)
}

function Set-GitHubSecret {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $Value | gh secret set $Name @repoArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to set GitHub Secret: $Name"
  }
}

Set-GitHubSecret -Name "SUPABASE_URL" -Value $SupabaseUrl
Set-GitHubSecret -Name "SUPABASE_SERVICE_ROLE_KEY" -Value $SupabaseServiceRoleKey
Set-GitHubSecret -Name "SUPABASE_TABLE" -Value $SupabaseTable

Write-Host "GitHub Secrets updated."
