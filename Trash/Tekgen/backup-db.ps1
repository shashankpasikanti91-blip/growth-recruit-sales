# ============================================================
# Tekgen DB Backup Script
# Run manually:  powershell -File C:\Tekgen\backup-db.ps1
# Scheduled:     Task Scheduler → daily at 2 AM
# Keeps last 30 backups automatically
# ============================================================

$BackupDir = "C:\Tekgen\backups"
$Container = "tekgen-postgres"
$DbUser    = "tekgen"
$DbName    = "tekgen_ats"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$DumpName  = "tekgen_backup_$Timestamp.dump"
$TempPath  = "/tmp/$DumpName"
$LocalPath = "$BackupDir\$DumpName"

# Ensure backup directory exists
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

Write-Host "[$Timestamp] Starting Tekgen DB backup..." -ForegroundColor Cyan

# 1. Create dump inside container
$result = docker exec $Container pg_dump -U $DbUser -d $DbName -Fc -f $TempPath 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pg_dump failed: $result" -ForegroundColor Red
    exit 1
}

# 2. Copy dump from container to host
docker cp "${Container}:${TempPath}" $LocalPath 2>&1 | Out-Null
if (-not (Test-Path $LocalPath)) {
    Write-Host "ERROR: Failed to copy backup file to $LocalPath" -ForegroundColor Red
    exit 1
}

$size = (Get-Item $LocalPath).Length / 1KB
Write-Host "Backup saved: $LocalPath ($([math]::Round($size,1)) KB)" -ForegroundColor Green

# 3. Clean temp file inside container
docker exec $Container rm -f $TempPath 2>&1 | Out-Null

# 4. Keep only the last 30 backups
$backups = Get-ChildItem -Path $BackupDir -Filter "tekgen_backup_*.dump" | Sort-Object Name -Descending
if ($backups.Count -gt 30) {
    $toDelete = $backups | Select-Object -Skip 30
    foreach ($f in $toDelete) {
        Remove-Item $f.FullName -Force
        Write-Host "Removed old backup: $($f.Name)" -ForegroundColor Gray
    }
}

# 5. Show all current backups
Write-Host "`nAll backups in $BackupDir :" -ForegroundColor Yellow
Get-ChildItem -Path $BackupDir -Filter "tekgen_backup_*.dump" | Sort-Object Name -Descending | ForEach-Object {
    $kb = [math]::Round($_.Length / 1KB, 1)
    Write-Host "  $($_.Name)  ($kb KB)"
}

Write-Host "`nDone." -ForegroundColor Green
