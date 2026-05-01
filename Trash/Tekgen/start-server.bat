@echo off
title Tekgen ATS - Local Server
color 0B

set ROOT=C:\Tekgen
set NODE_EXE=%ROOT%\node-portable\node-v20.20.2-win-x64\node.exe
set PATH=%ROOT%\node-portable\node-v20.20.2-win-x64;%PATH%
set NEXT_TELEMETRY_DISABLED=1

echo.
echo ======================================================
echo   TEKGEN ATS - Local Server
echo   URL: http://localhost:5000
echo ======================================================
echo.

if not exist "%NODE_EXE%" (
  echo ERROR: Node.js not found. Check node-portable folder.
  pause
  exit /b 1
)

echo Stopping any old server...
taskkill /F /FI "IMAGENAME eq node.exe" >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting database...
docker start tekgen-postgres >nul 2>&1
if errorlevel 1 (
  echo   Database container not found - creating it...
  docker run -d --name tekgen-postgres -e POSTGRES_USER=tekgen -e POSTGRES_PASSWORD=tekgen_pass_2024 -e POSTGRES_DB=tekgen_ats -p 5432:5432 postgres:15-alpine >nul 2>&1
)
echo   Waiting for database to be ready...
timeout /t 6 /nobreak >nul

echo Taking auto-backup before start...
cd /d "%ROOT%\tekgen-ats-backend"
for /f "tokens=*" %%i in ('powershell -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TS=%%i
docker exec tekgen-postgres pg_dump -U tekgen -d tekgen_ats -Fc -f /tmp/tekgen_autobackup_%TS%.dump >nul 2>&1
docker cp tekgen-postgres:/tmp/tekgen_autobackup_%TS%.dump "%ROOT%\backups\tekgen_autobackup_%TS%.dump" >nul 2>&1
docker exec tekgen-postgres rm -f /tmp/tekgen_autobackup_%TS%.dump >nul 2>&1
echo   Backup saved: backups\tekgen_autobackup_%TS%.dump

echo Running database migrations (safe additive only)...
cd /d "%ROOT%\tekgen-ats-backend"
call node_modules\.bin\prisma.cmd migrate deploy >nul 2>&1

if not exist "%ROOT%\tekgen-ats-frontend\out\index.html" (
  echo Building frontend - first time only, please wait a few minutes...
  cd /d "%ROOT%\tekgen-ats-frontend"
  "%NODE_EXE%" node_modules\next\dist\bin\next build
  if errorlevel 1 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
  )
) else (
  echo Frontend already built, skipping.
)

echo Starting backend server...
cd /d "%ROOT%\tekgen-ats-backend"
start "Tekgen ATS Server" /min "%NODE_EXE%" src/index.js

echo Waiting for server to start...
timeout /t 6 /nobreak >nul

echo.
echo   Tekgen ATS is LIVE at http://localhost:5000
echo.
echo   Admin:    admin@tekgen.com    / Admin@2026
echo   Shashank: shashank@tekgen.com / Shashank@2026
echo   Jerry:    jerry@tekgen.com    / Jerry@2026
echo   Savitha:  savitha@tekgen.com  / Savitha@2026
echo   Demo:     demo@tekgen.com     / Demo@2026
echo.

start "" "http://localhost:5000"
echo Server running in background. Close "Tekgen ATS Server" window to stop.
echo.
pause