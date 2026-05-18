# Called from start-ngrok.bat after ngrok is listening.
# Writes last public URL to ngrok/last-public-url.txt and opens it in the default browser.
param(
    [string] $RepoRoot = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)),
    [int] $MaxWaitSeconds = 25
)

$ErrorActionPreference = 'Stop'
$api = 'http://127.0.0.1:4060/api/tunnels'
$deadline = (Get-Date).AddSeconds($MaxWaitSeconds)
$url = $null

while (-not $url -and (Get-Date) -lt $deadline) {
    try {
        $r = Invoke-RestMethod -Uri $api -TimeoutSec 5
        $https = $r.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1
        if ($https) { $url = $https.public_url }
        elseif ($r.tunnels.Count -gt 0) { $url = $r.tunnels[0].public_url }
    } catch {
        Start-Sleep -Milliseconds 500
    }
}

$outFile = Join-Path $RepoRoot 'ngrok\last-public-url.txt'
if ($url) {
    Set-Content -LiteralPath $outFile -Value $url -Encoding utf8
    Write-Host ''
    Write-Host "  TEAM (live) URL: $url" -ForegroundColor Green
    Write-Host "  Saved to: ngrok\last-public-url.txt" -ForegroundColor DarkGray
    Write-Host ''
    Start-Process $url
} else {
    Write-Host ''
    Write-Host '  Could not read ngrok URL yet. Open http://127.0.0.1:4060 for the inspector, or use http://localhost:5000' -ForegroundColor Yellow
    Write-Host ''
    Start-Process 'http://localhost:5000'
}
