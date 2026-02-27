#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory=$true)][string]$Url,
  [string]$Token
)

if ($Token) {
  if ($Url.Contains("?")) {
    $Url = "$Url&token=$Token"
  } else {
    $Url = "$Url?token=$Token"
  }
}

$body = @{
  event = "PAYMENT_RECEIVED"
  payment = @{
    id = "pay_test"
    externalReference = "ORDER_TEST"
    value = 10.00
    status = "RECEIVED"
  }
} | ConvertTo-Json

Invoke-WebRequest -Method POST -Uri $Url -ContentType "application/json" -Body $body -UseBasicParsing
