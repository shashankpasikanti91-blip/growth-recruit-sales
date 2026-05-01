@echo off
title Tekgen ATS - Team Server
color 0A

set ROOT=C:\Tekgen
set NODE=%ROOT%\node-portable\node-v20.20.2-win-x64\node.exe
set NGROK=%ROOT%\ngrok\ngrok.exe
set NGROK_CFG=%ROOT%\ngrok\ngrok-tekgen.yml
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

echo Stopping any old server...
taskkill /F /FI "IMAGENAME eq node.exe" >nul 2>&1
taskkill /F /FI "IMAGENAME eq ngrok.exe" >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting database...
docker start tekgen-postgres >nul 2>&1
if errorlevel 1 (
  echo   Database container not found - creating it...
  docker run -d --name tekgen-postgres -e POSTGRES_USER=tekgen -e POSTGRES_PASSWORD=tekgen_pass_2024 -e POSTGRES_DB=tekgen_ats -p 5432:5432 postgres:15-alpine >nul 2>&1
)
echo   Waiting for database to be ready...
timeout /t 6 /nobreak >nul

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
  echo Frontend already built, skipping.
)

echo Starting backend server on port 5000...
cd /d "%ROOT%\tekgen-ats-backend"
start /B "" "%NODE%" src/index.js
timeout /t 6 /nobreak >nul

echo Starting ngrok tunnel...
del /f /q "%NGROK_LOG%" >nul 2>&1
start /B "" "%NGROK%" start tekgen --config "%NGROK_CFG%" --log "%NGROK_LOG%"
timeout /t 8 /nobreak >nul

echo Getting public team URL...
"%NODE%" -e "const h=require('http');h.get('http://127.0.0.1:4060/api/tunnels',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{const t=JSON.parse(d).tunnels;const u=t.find(x=>x.proto==='https')||t[0];if(u){console.log('');console.log('  TEAM URL: '+u.public_url);console.log('');}else{console.log('Could not get URL. Check http://127.0.0.1:4060');}}catch(e){console.log('Error: '+e.message);}})}).on('error',()=>console.log('ngrok not ready - check http://127.0.0.1:4060'))"

echo.
echo   Local URL:  http://localhost:5000
echo   Login Credentials:
echo   Admin:    admin@tekgen.com    / Admin@2026
echo   Shashank: shashank@tekgen.com / Shashank@2026
echo   Jerry:    jerry@tekgen.com    / Jerry@2026
echo   Savitha:  savitha@tekgen.com  / Savitha@2026
echo   Demo:     demo@tekgen.com     / Demo@2026
echo.

start "" "http://localhost:5000"

echo.
echo Server running. Do NOT close this window.
echo Press any key to STOP all servers.
echo.
pause >nul

taskkill /F /FI "IMAGENAME eq node.exe" >nul 2>&1
taskkill /F /FI "IMAGENAME eq ngrok.exe" >nul 2>&1
echo All servers stopped.