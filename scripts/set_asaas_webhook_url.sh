#!/usr/bin/env bash
set -euo pipefail

read -p "Cole a ASAAS_WEBHOOK_URL (ex.: https://speciesalimentos.com.br/_functions/asaas-webhook): " ASAAS_WEBHOOK_URL
if [[ -z "${ASAAS_WEBHOOK_URL}" ]]; then
  echo "ASAAS_WEBHOOK_URL vazio. Abortando."
  exit 1
fi

supabase secrets set ASAAS_WEBHOOK_URL="${ASAAS_WEBHOOK_URL}"

echo "Verificando secret..."
if supabase secrets list | grep -q '^ASAAS_WEBHOOK_URL'; then
  echo "Secret ASAAS_WEBHOOK_URL set successfully."
else
  echo "Warning: não foi possível verificar ASAAS_WEBHOOK_URL. Verifique login/contexto do Supabase CLI."
  exit 2
fi
