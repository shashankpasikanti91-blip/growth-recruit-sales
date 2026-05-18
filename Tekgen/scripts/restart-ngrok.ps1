# Restart ngrok tunnel to Tekgen API (port 5000).
# Prereqs: ngrok.exe in C:\Tekgen\ngrok, authtoken set in ngrok\ngrok-tekgen.yml (not the placeholder).

$ErrorActionPreference = 'SilentlyContinue'
Write-Host 'Stopping ngrok...' -ForegroundColor Cyan
Get-Process -Name 'ngrok' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not (Test-Path "$root\ngrok\ngrok.exe")) {
    Write-Host "ngrok.exe not found at $root\ngrok\ngrok.exe" -ForegroundColor Red
    exit 1
}

$cfgLocal = "$root\ngrok\ngrok-tekgen.local.yml"
$cfg = if (Test-Path $cfgLocal) { $cfgLocal } else { "$root\ngrok\ngrok-tekgen.yml" }
if ($cfg -notmatch 'local\.yml$' -and (Select-String -Path $cfg -Pattern 'REPLACE_WITH_NGROK_AUTHTOKEN' -Quiet)) {
    Write-Host 'Create ngrok\ngrok-tekgen.local.yml with your authtoken (gitignored).' -ForegroundColor Yellow
    exit 1
}

Write-Host 'Starting ngrok (tunnel tekgen -> localhost:5000)...' -ForegroundColor Cyan
Start-Process -FilePath "$root\ngrok\ngrok.exe" -ArgumentList @('start', 'tekgen', '--config', $cfg, '--log', "$root\ngrok\ngrok.log") -WindowStyle Minimized
Write-Host 'Done. Check ngrok.log or the ngrok dashboard for the public URL.' -ForegroundColor Green
