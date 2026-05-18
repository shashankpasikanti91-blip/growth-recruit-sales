# Restore Tekgen ATS PostgreSQL from a custom-format pg_dump (.dump), e.g. backups\tekgen_PREBUILD_*.dump
# Matches containers used by pre-build-backup.bat (tekgen-postgres, DB tekgen_ats, user tekgen).
#
# WARNING: This replaces data in the target database. Stop the Node API first, then run from PowerShell:
#   .\restore-db-from-dump.ps1 -DumpPath "C:\Tekgen\backups\your_file.dump"
#
param(
  [Parameter(Mandatory = $true)]
  [string] $DumpPath,
  [string] $Container = "tekgen-postgres",
  [string] $DbName = "tekgen_ats",
  [string] $DbUser = "tekgen"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $DumpPath)) {
  Write-Error "Dump file not found: $DumpPath"
}

$name = Split-Path -Leaf $DumpPath
Write-Host "Copying $DumpPath -> container:/tmp/$name"
docker cp -- "$DumpPath" "${Container}:/tmp/$name"

Write-Host "Running pg_restore (clean + if-exists) into $DbName ..."
docker exec $Container pg_restore -U $DbUser -d $DbName --clean --if-exists --no-owner --verbose "/tmp/$name"
$code = $LASTEXITCODE

docker exec $Container rm -f "/tmp/$name" 2>$null

if ($code -ne 0) {
  Write-Error "pg_restore exited with code $code (1 often means non-fatal warnings; check output above)."
}

Write-Host "Done. Restart the API and verify candidates."
exit $code
