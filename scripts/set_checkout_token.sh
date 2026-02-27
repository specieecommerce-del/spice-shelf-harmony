#!/usr/bin/env bash
set -euo pipefail

# Gera um token seguro (256 bits -> 64 hex chars)
TOKEN="$(openssl rand -hex 32)"

# Mostra apenas instrução — NÃO mostraremos o token em logs remotos.
echo "Generated token locally and will now set the secret CHECKOUT_TOKEN for the current Supabase project."
echo "If you want to see the token locally, run: echo \$TOKEN"
read -p "Continue and set secret now? (y/N) " confirm
if [[ "${confirm,,}" != "y" ]]; then
  echo "Aborted by user. Token is kept in this shell session as \$TOKEN."
  exit 1
fi

# Define o secret usando supabase CLI (assume supabase CLI autenticada e configurada)
supabase secrets set CHECKOUT_TOKEN="${TOKEN}"

# Verifica se foi criado
echo "Verifying secret..."
if supabase secrets list | grep -q '^CHECKOUT_TOKEN'; then
  echo "Secret CHECKOUT_TOKEN set successfully."
else
  echo "Warning: could not verify CHECKOUT_TOKEN in secrets list. Check supabase CLI login/project context or set via Dashboard."
  exit 2
fi
