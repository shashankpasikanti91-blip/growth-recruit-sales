param(
  [string]$Model = "qwen2.5-coder:7b"
)

$ErrorActionPreference = "Stop"

Write-Host "Using local Ollama model: $Model"
Write-Host "Ensuring Docker context..."
docker context use desktop-linux | Out-Null

Write-Host "Checking Ollama API..."
try {
  Invoke-RestMethod -Method Get -Uri "http://localhost:11434/api/tags" -TimeoutSec 15 | Out-Null
} catch {
  throw "Ollama API is not reachable at http://localhost:11434. Run scripts/fix-ollama-docker.ps1 first."
}

Write-Host "Pulling model if needed (safe if already present)..."
Invoke-RestMethod -Method Post -Uri "http://localhost:11434/api/pull" -ContentType "application/json" -Body (@{ model = $Model; stream = $false } | ConvertTo-Json)

$env:NODE_ENV = "development"
$env:AI_PROVIDER = "ollama"
$env:OLLAMA_BASE_URL = "http://localhost:11434"
$env:OLLAMA_MODEL = $Model

Write-Host "Environment set for this shell: AI_PROVIDER=ollama, OLLAMA_MODEL=$Model"
Write-Host "Testing local AI..."
Set-Location "$PSScriptRoot\..\backend"
npm run ai:test -- "Return JSON with key status='local_ollama_ready'"
