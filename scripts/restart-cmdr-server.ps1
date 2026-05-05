param(
  [int]$Port = 4200,
  [string]$Model = "qwen2.5-coder:3b",
  [string]$OllamaUrl = "http://localhost:11434",
  [int]$StartupTimeoutSeconds = 25,
  [switch]$StopOnly,
  [switch]$StatusOnly
)

$ErrorActionPreference = "Stop"

function Get-CmdrServeProcesses {
  $all = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
  if (-not $all) {
    return @()
  }

  return @(
    $all | Where-Object {
      $_.CommandLine -and
      $_.CommandLine -match "cmdr-agent" -and
      $_.CommandLine -match "cmdr\.js" -and
      $_.CommandLine -match "\sserve\s"
    }
  )
}

function Test-CmdrHealth {
  param(
    [int]$HealthPort
  )

  try {
    $res = Invoke-WebRequest -Uri "http://127.0.0.1:$HealthPort/health" -UseBasicParsing -TimeoutSec 3
    return $res.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Stop-CmdrServe {
  $procs = Get-CmdrServeProcesses
  if (-not $procs -or $procs.Count -eq 0) {
    Write-Host "No running cmdr serve process found."
    return
  }

  foreach ($p in $procs) {
    Write-Host "Stopping cmdr serve process PID $($p.ProcessId)..."
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
  }

  Start-Sleep -Milliseconds 600
}

if (-not (Get-Command cmdr -ErrorAction SilentlyContinue)) {
  throw "cmdr command not found. Install globally with: npm install -g cmdr-agent"
}

$cmdrCommand = Get-Command cmdr -ErrorAction SilentlyContinue
$cmdrSource = $cmdrCommand.Source
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  throw "node command not found. Install Node.js and ensure it is in PATH."
}

$cmdrEntry = $null
try {
  $npmGlobalRoot = (npm root -g).Trim()
  $candidate = Join-Path $npmGlobalRoot "cmdr-agent\dist\bin\cmdr.js"
  if (Test-Path $candidate) {
    $cmdrEntry = $candidate
  }
} catch {
}

if ($StatusOnly) {
  $healthy = Test-CmdrHealth -HealthPort $Port
  if ($healthy) {
    Write-Host "cmdr status: healthy at http://127.0.0.1:$Port"
    exit 0
  }

  Write-Host "cmdr status: not healthy at http://127.0.0.1:$Port"
  exit 1
}

Stop-CmdrServe

if ($StopOnly) {
  Write-Host "cmdr stop complete."
  exit 0
}

$env:CMDR_PROVIDER = "ollama"
$env:CMDR_OLLAMA_URL = $OllamaUrl
$env:CMDR_MODEL = $Model

Write-Host "Starting cmdr serve on http://127.0.0.1:$Port with model $Model ..."
if ($cmdrEntry) {
  Start-Process -FilePath $nodeCommand.Source -ArgumentList @($cmdrEntry, "serve", "--port", "$Port", "--host", "127.0.0.1", "-m", "$Model") -WindowStyle Hidden
} elseif ($cmdrSource -and $cmdrSource.ToLower().EndsWith(".cmd")) {
  $cmdLine = ('"{0}" serve --port {1} --host 127.0.0.1 -m {2}' -f $cmdrSource, $Port, $Model)
  Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $cmdLine) -WindowStyle Hidden
} else {
  $fallbackCmdr = if ($cmdrSource) { $cmdrSource } else { "cmdr" }
  Start-Process -FilePath $fallbackCmdr -ArgumentList @("serve", "--port", "$Port", "--host", "127.0.0.1", "-m", "$Model") -WindowStyle Hidden
}

$deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
while ((Get-Date) -lt $deadline) {
  if (Test-CmdrHealth -HealthPort $Port) {
    Write-Host "cmdr is healthy at http://127.0.0.1:$Port"
    Write-Host "Tip: In VS Code, run 'Developer: Reload Window' if status bar still shows disconnected."
    exit 0
  }

  Start-Sleep -Milliseconds 800
}

Write-Host "cmdr did not become healthy within $StartupTimeoutSeconds seconds."
Write-Host "Check logs by starting foreground manually: cmdr serve --port $Port --host 127.0.0.1 -m $Model"
exit 1
