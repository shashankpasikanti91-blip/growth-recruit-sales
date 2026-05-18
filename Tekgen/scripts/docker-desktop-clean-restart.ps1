# Clears stuck "Lingering processes detected" / multiple Docker Desktop.exe instances.
# Run in PowerShell, then start Docker Desktop once from the Start menu.
# If Docker still fails: Settings -> General -> "Use the WSL 2 based engine" (recommended),
# update Docker Desktop, and avoid launching it twice (e.g. double-click + autostart).

$ErrorActionPreference = 'SilentlyContinue'

Write-Host 'Stopping Docker Desktop processes...' -ForegroundColor Cyan
Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Common helper process names (vary by Docker Desktop version)
foreach ($name in @('com.docker.backend', 'com.docker.build', 'Docker Desktop Backend', 'DockerCli')) {
    Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force
}

Write-Host 'Done. Launch Docker Desktop from the Start menu (one time).' -ForegroundColor Green
Write-Host 'If problems persist: Docker Desktop -> Troubleshoot -> Clean / Purge data (last resort).' -ForegroundColor Yellow
