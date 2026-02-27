#!/usr/bin/env bash
set -euo pipefail

# Solicita e define ASAAS_API_KEY como secret no Supabase
read -p "Cole o ASAAS_API_KEY: " ASAAS_API_KEY
if [[ -z "${ASAAS_API_KEY}" ]]; then
  echo "ASAAS_API_KEY vazio. Abortando."
  exit 1
fi

supabase secrets set ASAAS_API_KEY="${ASAAS_API_KEY}"

echo "Verificando secret..."
if supabase secrets list | grep -q '^ASAAS_API_KEY'; then
  echo "Secret ASAAS_API_KEY set successfully."
else
  echo "Warning: não foi possível verificar ASAAS_API_KEY. Verifique login/contexto do Supabase CLI."
  exit 2
fi
