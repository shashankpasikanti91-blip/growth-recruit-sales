param(
  [string]$PrimaryModel = "qwen2.5-coder:3b",
  [string]$FallbackModel = "llama3:latest",
  [string]$FallbackProvider = "openrouter"
)

$ErrorActionPreference = "Stop"

[Environment]::SetEnvironmentVariable('AI_PROVIDER', 'ollama', 'User')
[Environment]::SetEnvironmentVariable('OLLAMA_BASE_URL', 'http://localhost:11434', 'User')
[Environment]::SetEnvironmentVariable('OLLAMA_MODEL', $PrimaryModel, 'User')
[Environment]::SetEnvironmentVariable('OLLAMA_FALLBACK_MODEL', $FallbackModel, 'User')
[Environment]::SetEnvironmentVariable('AI_FALLBACK_PROVIDER', $FallbackProvider, 'User')

Write-Host "Global user AI environment variables saved."
Write-Host "Open a new terminal/VS Code window to pick them up."
Write-Host "AI_PROVIDER=ollama"
Write-Host "OLLAMA_BASE_URL=http://localhost:11434"
Write-Host "OLLAMA_MODEL=$PrimaryModel"
Write-Host "OLLAMA_FALLBACK_MODEL=$FallbackModel"
Write-Host "AI_FALLBACK_PROVIDER=$FallbackProvider"
