@echo off
title Tekgen ATS - Team Server
color 0A

set ROOT=C:\Tekgen
set NODE=%ROOT%\node-portable\node-v20.20.2-win-x64\node.exe
set NGROK=%ROOT%\ngrok\ngrok.exe
REM Prefer gitignored local config (real authtoken); fallback to template
if exist "%ROOT%\ngrok\ngrok-tekgen.local.yml" (
  set NGROK_CFG=%ROOT%\ngrok\ngrok-tekgen.local.yml
) else (
  set NGROK_CFG=%ROOT%\ngrok\ngrok-tekgen.yml
)
set NGROK_LOG=%ROOT%\ngrok\ngrok.log
set NEXT_TELEMETRY_DISABLED=1

echo.
echo ============================================
echo   TEKGEN ATS - Team Server
echo   Local + Public URL for team via ngrok
echo ============================================
echo.

if not exist "%NODE%" (
  echo ERROR: Node.js not found. Check node-portable folder.
  pause
  exit /b 1
)

if not exist "%NGROK%" (
  echo ERROR: ngrok.exe not found at %ROOT%\ngrok
  pause
  exit /b 1
)

REM Only validate placeholder when using the shared template (not .local.yml)
if /I not "%NGROK_CFG%"=="%ROOT%\ngrok\ngrok-tekgen.local.yml" (
  findstr /C:"REPLACE_WITH_NGROK_AUTHTOKEN" "%NGROK_CFG%" >nul 2>&1
  if not errorlevel 1 (
    echo.
    echo ERROR: ngrok authtoken not configured.
    echo Copy ngrok\ngrok-tekgen.yml.example to ngrok\ngrok-tekgen.local.yml
    echo and set your authtoken ^(ngrok-tekgen.local.yml is gitignored^).
    echo   https://dashboard.ngrok.com/get-started/your-authtoken
    echo.
    pause
    exit /b 1
  )
)

echo Stopping any old server...
taskkill /F /FI "IMAGENAME eq node.exe" >nul 2>&1
taskkill /F /FI "IMAGENAME eq ngrok.exe" >nul 2>&1
call :sleep 2

echo Starting database...
docker start tekgen-postgres >nul 2>&1
if errorlevel 1 (
  echo   Database container not found - creating it...
  docker run -d --name tekgen-postgres -e POSTGRES_USER=tekgen -e POSTGRES_PASSWORD=tekgen_pass_2024 -e POSTGRES_DB=tekgen_ats -p 5432:5432 postgres:15-alpine >nul 2>&1
)
echo   Waiting for database to be ready...
call :sleep 6

echo Running database migrations...
cd /d "%ROOT%\tekgen-ats-backend"
call node_modules\.bin\prisma.cmd migrate deploy >nul 2>&1

if not exist "%ROOT%\tekgen-ats-frontend\out\index.html" (
  echo Building frontend - first time only, please wait a few minutes...
  cd /d "%ROOT%\tekgen-ats-frontend"
  "%NODE%" node_modules\next\dist\bin\next build
  if errorlevel 1 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
  )
) else (
  echo Frontend already built, skipping rebuild.
  echo   If the UI looks old: open tekgen-ats-frontend, run npm run build, then restart this script.
)

echo Starting backend server on port 5000...
cd /d "%ROOT%\tekgen-ats-backend"
start /B "" "%NODE%" src/index.js
call :sleep 6

echo Starting ngrok tunnel...
del /f /q "%NGROK_LOG%" >nul 2>&1
start /B "" "%NGROK%" start tekgen --config "%NGROK_CFG%" --log "%NGROK_LOG%"
call :sleep 5

echo Resolving public team URL and opening browser...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\open-ngrok-team-url.ps1" -RepoRoot "%ROOT%"

echo.
echo   Local URL:  http://localhost:5000
echo   Team sign-in: use credentials issued by your admin (see README / dev seed file).
echo.
echo   If the tunnel fails: update ngrok, confirm authtoken, and ensure port 5000 is not blocked.
echo   (Browser should open the HTTPS team URL above. Use localhost:5000 on this PC if you prefer.)

echo.
echo Server running. Do NOT close this window.
echo Press any key to STOP all servers.
echo.
pause >nul

taskkill /F /FI "IMAGENAME eq node.exe" >nul 2>&1
taskkill /F /FI "IMAGENAME eq ngrok.exe" >nul 2>&1
echo All servers stopped.
goto :eof

:sleep
ping 127.0.0.1 -n %~1 >nul
goto :eof