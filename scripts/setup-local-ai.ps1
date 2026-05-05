param(
  [string]$PrimaryModel = "qwen2.5-coder:3b",
  [string]$FallbackModel = "llama3.2:1b"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Recovering Docker and Ollama..."
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'fix-ollama-docker.ps1')

Write-Host "Setting global AI environment variables..."
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'set-global-ai-env.ps1') -PrimaryModel $PrimaryModel -FallbackModel $FallbackModel

Write-Host "Pulling primary local coding model if needed..."
docker exec -i ollama ollama pull $PrimaryModel

Write-Host "Pulling fallback local model if needed..."
docker exec -i ollama ollama pull $FallbackModel

Write-Host "Testing reusable local AI starter..."
Push-Location (Join-Path $repoRoot 'reusable-local-ai')
$env:AI_PROVIDER = 'ollama'
$env:OLLAMA_BASE_URL = 'http://localhost:11434'
$env:OLLAMA_MODEL = $PrimaryModel
$env:OLLAMA_FALLBACK_MODEL = $FallbackModel
node .\example.js "Return exactly LOCAL_AI_READY"
Pop-Location

Write-Host "Local AI setup complete. Open a new VS Code window or terminal to use global env defaults."
