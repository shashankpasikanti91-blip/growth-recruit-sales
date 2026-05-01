# Tekgen ATS - Unified Startup Script (PowerShell)
# Usage: .\start.ps1 [start|stop|status|logs]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "status", "logs")]
    [string]$Command = "start"
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeDir = Join-Path $root "node-portable\node-v20.20.2-win-x64"
$nodeExe = Join-Path $nodeDir "node.exe"
$npmCmd = Join-Path $nodeDir "npm.cmd"
$backend = Join-Path $root "tekgen-ats-backend"
$frontend = Join-Path $root "tekgen-ats-frontend"

# Set PATH
$env:PATH = "$nodeDir;$env:PATH"

function Show-Header {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "TEKGEN ATS - LOCAL DEVELOPMENT SERVERS" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host ""
}

function Start-Servers {
    Show-Header
    
    Write-Host "Starting Tekgen ATS as a single local server..." -ForegroundColor Yellow
    Write-Host ""

    # ── AUTO-BACKUP before anything else ─────────────────────────────────────
    Write-Host "[0/2] Auto-backup DB before startup..." -ForegroundColor Cyan
    $backupDir = Join-Path $root "backups"
    if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }
    $ts = Get-Date -Format "yyyyMMdd_HHmmss"
    $dumpName = "tekgen_autostart_$ts.dump"
    docker exec tekgen-postgres pg_dump -U tekgen -d tekgen_ats -Fc -f "/tmp/$dumpName" 2>$null
    if ($LASTEXITCODE -eq 0) {
        docker cp "tekgen-postgres:/tmp/$dumpName" "$backupDir\$dumpName" 2>$null
        docker exec tekgen-postgres rm -f "/tmp/$dumpName" 2>$null
        Write-Host "  Backup saved: backups\$dumpName" -ForegroundColor Green
    } else {
        Write-Host "  Warning: Auto-backup failed (DB may not be running yet)" -ForegroundColor Yellow
    }
    # ─────────────────────────────────────────────────────────────────────────


    $existing = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Port 5000 is in use. Stopping existing process..." -ForegroundColor Red
        $existing | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
        Start-Sleep -Seconds 2
    }

    # Build frontend
    Write-Host "[1/2] Building frontend..." -ForegroundColor Cyan
    Push-Location $frontend
    & $nodeExe "node_modules\next\dist\bin\next" build 2>&1 | Out-Null
    $buildResult = $LASTEXITCODE
    Pop-Location

    if ($buildResult -ne 0) {
        Write-Host "Frontend build failed! Trying to start backend anyway..." -ForegroundColor Red
    } else {
        Write-Host "  Frontend built successfully." -ForegroundColor Green
    }

    # Start backend (serves both API + frontend static files)
    Write-Host "[2/2] Starting backend server..." -ForegroundColor Cyan
    Push-Location $backend
    Start-Process -FilePath $nodeExe -ArgumentList "src/index.js" `
        -WindowStyle Normal -PassThru | Out-Null
    Pop-Location
    
    Write-Host ""
    Write-Host ("=" * 50) -ForegroundColor Green
    Write-Host "  Tekgen ATS is running!" -ForegroundColor Green
    Write-Host "  URL: http://localhost:5000" -ForegroundColor White
    Write-Host "  Login: demo@tekgen.com / Demo@1234" -ForegroundColor White
    Write-Host ("=" * 50) -ForegroundColor Green
    Write-Host ""

    # Open browser after a short delay
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:5000"

    Write-Host "Browser opened. To stop: .\start.ps1 stop" -ForegroundColor Gray
    Write-Host ""
}


function Check-Status {
    Show-Header
    
    Write-Host "Checking server status..." -ForegroundColor Yellow
    Write-Host ""
    
    $port = 5000
    $service = "Tekgen ATS (Port 5000)"
    
    $connection = Test-NetConnection -ComputerName "127.0.0.1" -Port $port -WarningAction SilentlyContinue
    
    if ($connection.TcpTestSucceeded) {
        Write-Host "[$service] RUNNING (Port $port)" -ForegroundColor Green
    } else {
        Write-Host "[$service] NOT RUNNING (Port $port)" -ForegroundColor Red
    }
    
    Write-Host ""
}

function Show-Usage {
    Show-Header
    
    Write-Host "Usage: .\start.ps1 [command]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  start   - Build frontend (if needed) and start backend on port 5000 (default)" -ForegroundColor Gray
    Write-Host "  status  - Check if the server is running" -ForegroundColor Gray
    Write-Host "  stop    - Stop the server on port 5000" -ForegroundColor Gray
    Write-Host "  logs    - Show last 50 lines of the backend log file" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\start.ps1              # Start desktop server on localhost:5000" -ForegroundColor Gray
    Write-Host "  .\start.ps1 status       # Check if server is running" -ForegroundColor Gray
    Write-Host "  .\start.ps1 stop         # Stop the server" -ForegroundColor Gray
    Write-Host "  .\start.ps1 logs         # View recent log output" -ForegroundColor Gray
    Write-Host ""
    Write-Host "For team access (ngrok), run: start-ngrok.bat" -ForegroundColor Cyan
    Write-Host ""
}

# Execute command
switch ($Command) {
    "start" { Start-Servers }
    "status" { Check-Status }
    "logs" {
        $logFile = Join-Path $root "tekgen-ats-backend\logs\app.log"
        if (Test-Path $logFile) {
            Write-Host "Showing last 50 lines of $logFile" -ForegroundColor Cyan
            Write-Host ""
            Get-Content $logFile -Tail 50
        } else {
            Write-Host "No log file found at: $logFile" -ForegroundColor Yellow
            Write-Host "Logs are printed to the terminal where the backend is running." -ForegroundColor Gray
        }
    }
    "stop" { 
        Write-Host "Stopping Tekgen ATS server..." -ForegroundColor Yellow
        $existing = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
        if ($existing) {
            $existing | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
            Write-Host "Server stopped." -ForegroundColor Green
        } else {
            Write-Host "No server running on port 5000." -ForegroundColor Gray
        }
    }
    default { Show-Usage }
}
