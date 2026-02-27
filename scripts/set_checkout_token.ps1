#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

# Gera um token seguro (256 bits -> 64 hex chars)
$bytes = New-Object Byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$TOKEN = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""

# Mostra apenas instrução — NÃO mostraremos o token em logs remotos.
Write-Host "Generated token locally and will now set the secret CHECKOUT_TOKEN for the current Supabase project."
Write-Host "If you want to see the token locally, run: Write-Host `\$TOKEN"
$confirm = Read-Host "Continue and set secret now? (y/N)"
if ($confirm.ToLower() -ne "y") {
  Write-Host "Aborted by user. Token is kept in this shell session as `\$TOKEN."
  exit 1
}

# Define o secret usando supabase CLI (assume supabase CLI autenticada e configurada)
supabase secrets set CHECKOUT_TOKEN="$TOKEN"

# Verifica se foi criado
Write-Host "Verifying secret..."
$secrets = supabase secrets list
if ($secrets -match "^CHECKOUT_TOKEN") {
  Write-Host "Secret CHECKOUT_TOKEN set successfully."
} else {
  Write-Host "Warning: could not verify CHECKOUT_TOKEN in secrets list. Check supabase CLI login/project context or set via Dashboard."
  exit 2
}
