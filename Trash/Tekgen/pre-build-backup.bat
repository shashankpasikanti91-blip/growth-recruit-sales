@echo off
REM ============================================================
REM  Tekgen Pre-Build Safety Backup
REM  Run this BEFORE any phase build or DB change
REM  Usage: pre-build-backup.bat
REM ============================================================
title Tekgen - Pre-Build Backup

set ROOT=C:\Tekgen
for /f "tokens=*" %%i in ('powershell -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TS=%%i
set BACKUP_FILE=tekgen_PREBUILD_%TS%.dump

echo.
echo ======================================================
echo   TEKGEN PRE-BUILD SAFETY BACKUP
echo ======================================================
echo   Timestamp : %TS%
echo   File      : backups\%BACKUP_FILE%
echo ======================================================
echo.

if not exist "%ROOT%\backups" mkdir "%ROOT%\backups"

echo Taking backup now...
docker exec tekgen-postgres pg_dump -U tekgen -d tekgen_ats -Fc -f /tmp/%BACKUP_FILE% 2>&1
if errorlevel 1 (
  echo ERROR: pg_dump failed! Check that Docker container is running.
  pause
  exit /b 1
)

docker cp tekgen-postgres:/tmp/%BACKUP_FILE% "%ROOT%\backups\%BACKUP_FILE%" 2>&1
docker exec tekgen-postgres rm -f /tmp/%BACKUP_FILE% >nul 2>&1

if exist "%ROOT%\backups\%BACKUP_FILE%" (
  echo.
  echo SUCCESS: Backup saved to backups\%BACKUP_FILE%
  echo.
) else (
  echo ERROR: Backup file not found after copy!
  pause
  exit /b 1
)

echo Current backups:
dir /b "%ROOT%\backups\*.dump" 2>nul

echo.
echo Backup complete. Safe to proceed with build.
echo.
pause
