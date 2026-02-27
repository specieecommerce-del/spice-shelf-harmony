#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

$ASAAS_API_KEY = Read-Host "Cole o ASAAS_API_KEY"
if (-not $ASAAS_API_KEY) {
  Write-Host "ASAAS_API_KEY vazio. Abortando."
  exit 1
}

supabase secrets set ASAAS_API_KEY="$ASAAS_API_KEY"

Write-Host "Verificando secret..."
$secrets = supabase secrets list
if ($secrets -match "^ASAAS_API_KEY") {
  Write-Host "Secret ASAAS_API_KEY set successfully."
} else {
  Write-Host "Warning: não foi possível verificar ASAAS_API_KEY. Verifique login/contexto do Supabase CLI."
  exit 2
}
