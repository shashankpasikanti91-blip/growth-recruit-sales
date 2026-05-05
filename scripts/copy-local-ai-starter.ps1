param(
  [Parameter(Mandatory = $true)]
  [string]$TargetProjectPath,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot 'reusable-local-ai'
$targetDir = Join-Path $TargetProjectPath 'reusable-local-ai'

if (-not (Test-Path $TargetProjectPath)) {
  throw "Target project path does not exist: $TargetProjectPath"
}

if ((Test-Path $targetDir) -and -not $Force) {
  throw "Target already contains reusable-local-ai. Re-run with -Force to overwrite."
}

if (Test-Path $targetDir) {
  Remove-Item $targetDir -Recurse -Force
}

Copy-Item $sourceDir $targetDir -Recurse -Force
Write-Host "Copied reusable-local-ai starter to $targetDir"
Write-Host "Next: copy reusable-local-ai/.env.example values into your target project's .env as needed."
