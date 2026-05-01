# ============================================================
# Tekgen DB Restore Script
# Usage:  powershell -File C:\Tekgen\restore-db.ps1 [backup-filename]
# Example: powershell -File C:\Tekgen\restore-db.ps1 tekgen_backup_20260429_101353.dump
# If no filename given, restores the LATEST backup
# ============================================================

param (
    [string]$BackupFile = ""
)

$BackupDir = "C:\Tekgen\backups"
$Container = "tekgen-postgres"
$DbUser    = "tekgen"
$DbName    = "tekgen_ats"

# Find backup file
if ($BackupFile -eq "") {
    $latest = Get-ChildItem -Path $BackupDir -Filter "tekgen_backup_*.dump" | Sort-Object Name -Descending | Select-Object -First 1
    if (-not $latest) { Write-Host "ERROR: No backup files found in $BackupDir" -ForegroundColor Red; exit 1 }
    $BackupFile = $latest.Name
    Write-Host "No file specified. Using latest backup: $BackupFile" -ForegroundColor Yellow
}

$LocalPath = "$BackupDir\$BackupFile"
if (-not (Test-Path $LocalPath)) {
    Write-Host "ERROR: Backup file not found: $LocalPath" -ForegroundColor Red
    exit 1
}

Write-Host "WARNING: This will restore $BackupFile into $DbName." -ForegroundColor Red
Write-Host "All current data will be replaced. Type YES to continue:" -ForegroundColor Red
$confirm = Read-Host
if ($confirm -ne "YES") { Write-Host "Restore cancelled."; exit 0 }

$TempPath = "/tmp/$BackupFile"

# Copy backup into container
Write-Host "Copying backup into container..." -ForegroundColor Cyan
docker cp $LocalPath "${Container}:${TempPath}" 2>&1 | Out-Null

# Restore
Write-Host "Restoring database..." -ForegroundColor Cyan
docker exec $Container pg_restore -U $DbUser -d $DbName --clean --if-exists -Fc $TempPath 2>&1

# Cleanup
docker exec $Container rm -f $TempPath 2>&1 | Out-Null

Write-Host "Restore complete from: $BackupFile" -ForegroundColor Green
