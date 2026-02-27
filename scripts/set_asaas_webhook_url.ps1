#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

$ASAAS_WEBHOOK_URL = Read-Host "Cole a ASAAS_WEBHOOK_URL (ex.: https://speciesalimentos.com.br/_functions/asaas-webhook)"
if (-not $ASAAS_WEBHOOK_URL) {
  Write-Host "ASAAS_WEBHOOK_URL vazio. Abortando."
  exit 1
}

supabase secrets set ASAAS_WEBHOOK_URL="$ASAAS_WEBHOOK_URL"

Write-Host "Verificando secret..."
$secrets = supabase secrets list
if ($secrets -match "^ASAAS_WEBHOOK_URL") {
  Write-Host "Secret ASAAS_WEBHOOK_URL set successfully."
} else {
  Write-Host "Warning: não foi possível verificar ASAAS_WEBHOOK_URL. Verifique login/contexto do Supabase CLI."
  exit 2
}
