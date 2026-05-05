param(
  [string]$OllamaContainerName = "ollama",
  [string]$OllamaVolumeName = "ollama_data",
  [string]$OllamaImage = "ollama/ollama"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

function Wait-DockerEngine {
  param([int]$Attempts = 30, [int]$DelaySeconds = 2)

  for ($i = 1; $i -le $Attempts; $i++) {
    try {
      docker version *> $null
      return $true
    } catch {
      Start-Sleep -Seconds $DelaySeconds
    }
  }

  return $false
}

function Stop-DockerDesktopProcesses {
  param([int]$Attempts = 10, [int]$DelayMilliseconds = 800)

  $names = @("Docker Desktop", "com.docker.backend", "com.docker.proxy", "vpnkit", "com.docker.build")
  for ($i = 1; $i -le $Attempts; $i++) {
    $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { $names -contains $_.ProcessName }
    if (-not $procs -or $procs.Count -eq 0) {
      return
    }

    $procs | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds $DelayMilliseconds
  }
}

Write-Host "[1/6] Switching Docker context to desktop-linux..."
cmd /c "docker context use desktop-linux >nul 2>nul"

Write-Host "[2/6] Restarting Docker Desktop processes (safe, no volume delete)..."
Stop-DockerDesktopProcesses
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

Write-Host "[3/6] Waiting for Docker engine..."
if (-not (Wait-DockerEngine)) {
  throw "Docker engine did not become ready. Open Docker Desktop and wait until it shows 'Engine running'."
}

Write-Host "[4/6] Ensuring Ollama volume exists..."
$volumeExists = docker volume ls --format "{{.Name}}" | Where-Object { $_ -eq $OllamaVolumeName }
if (-not $volumeExists) {
  docker volume create $OllamaVolumeName | Out-Null
}

Write-Host "[5/6] Ensuring Ollama container is running..."
$existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $OllamaContainerName }
if (-not $existing) {
  docker run -d --name $OllamaContainerName -p 11434:11434 -v "${OllamaVolumeName}:/root/.ollama" --restart unless-stopped $OllamaImage | Out-Null
} else {
  docker start $OllamaContainerName | Out-Null
}

Write-Host "[6/6] Verifying Ollama API..."
try {
  $tags = Invoke-RestMethod -Method Get -Uri "http://localhost:11434/api/tags" -TimeoutSec 20
  $count = if ($tags.models) { $tags.models.Count } else { 0 }
  Write-Host "Ollama is reachable. Installed models: $count"
} catch {
  Write-Host "Ollama container is running, but API is not ready yet. Wait 15-60 seconds and retry."
}

Write-Host "Done. Your Ollama data volume ($OllamaVolumeName) is preserved."
