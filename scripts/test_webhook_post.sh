#!/usr/bin/env bash
set -euo pipefail

URL="${1:-}"
TOKEN="${2:-}"

if [[ -z "${URL}" ]]; then
  echo "Uso: ./scripts/test_webhook_post.sh <WEBHOOK_URL> [CHECKOUT_TOKEN]"
  echo "Ex.: ./scripts/test_webhook_post.sh https://egsmzlcrthydfrcmqiww.supabase.co/functions/v1/asaas-webhook mytoken"
  exit 1
fi

if [[ -n "${TOKEN}" ]]; then
  if [[ "${URL}" == *"?"* ]]; then
    URL="${URL}&token=${TOKEN}"
  else
    URL="${URL}?token=${TOKEN}"
  fi
fi

curl -i -X POST "${URL}" \
  -H "Content-Type: application/json" \
  --data '{"event":"PAYMENT_RECEIVED","payment":{"id":"pay_test","externalReference":"ORDER_TEST","value":10.00,"status":"RECEIVED"}}'
