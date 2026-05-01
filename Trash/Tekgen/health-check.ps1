# Health Check Script for Tekgen ATS (PowerShell)
# Checks Node.js server (port 5000) and ngrok tunnel

$nodeDir = "c:\Tekgen\node-portable\node-v20.20.2-win-x64"
$env:PATH = "$nodeDir;$env:PATH"

Write-Host ""
Write-Host ("=" * 50) -ForegroundColor Cyan
Write-Host "  TEKGEN ATS - Health Check" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Cyan
Write-Host ""

# â”€â”€ 1. Backend Server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Host "[ Backend Server - Port 5000 ]" -ForegroundColor Blue
$portOpen = Test-NetConnection -ComputerName "127.0.0.1" -Port 5000 -WarningAction SilentlyContinue
if ($portOpen.TcpTestSucceeded) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            Write-Host "  Status  : RUNNING" -ForegroundColor Green
            Write-Host "  Health  : OK (HTTP $($resp.StatusCode))" -ForegroundColor Green
        } else {
            Write-Host "  Status  : UP but health returned HTTP $($resp.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Status  : Port open but health endpoint unreachable" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Status  : NOT RUNNING" -ForegroundColor Red
    Write-Host "  Fix     : Run start-server.bat or .\start.ps1" -ForegroundColor Gray
}
Write-Host "  URL     : http://localhost:5000" -ForegroundColor Gray
Write-Host ""

# â”€â”€ 2. ngrok Tunnel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Host "[ ngrok Tunnel - Team Access ]" -ForegroundColor Blue
$ngrokPort = Test-NetConnection -ComputerName "127.0.0.1" -Port 4060 -WarningAction SilentlyContinue
if ($ngrokPort.TcpTestSucceeded) {
    try {
        $tunnelResp = Invoke-WebRequest -Uri "http://127.0.0.1:4060/api/tunnels" -TimeoutSec 3 -ErrorAction Stop
        $tunnelData = $tunnelResp.Content | ConvertFrom-Json
        $httpsUrl = ($tunnelData.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1).public_url
        if ($httpsUrl) {
            Write-Host "  Status  : RUNNING" -ForegroundColor Green
            Write-Host "  URL     : $httpsUrl" -ForegroundColor Green
        } else {
            Write-Host "  Status  : ngrok running but no HTTPS tunnel found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Status  : ngrok admin port open but API not responding" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Status  : NOT RUNNING" -ForegroundColor Red
    Write-Host "  Fix     : Run start-ngrok.bat to share with your team" -ForegroundColor Gray
    Write-Host "  URL     : https://pawing-phoniness-preamble.ngrok-free.dev (when running)" -ForegroundColor Gray
}
Write-Host ""

# â”€â”€ 3. Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Host ("=" * 50) -ForegroundColor Cyan
$serverOk = $portOpen.TcpTestSucceeded
$ngrokOk  = $ngrokPort.TcpTestSucceeded
if ($serverOk -and $ngrokOk) {
    Write-Host "  ALL SYSTEMS UP" -ForegroundColor Green
} elseif ($serverOk) {
    Write-Host "  Server OK  |  ngrok NOT running (team can't access)" -ForegroundColor Yellow
} else {
    Write-Host "  Server DOWN  |  Run start-server.bat to fix" -ForegroundColor Red
}
Write-Host ("=" * 50) -ForegroundColor Cyan
Write-Host ""

# Frontend check
