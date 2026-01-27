-- Add confirmation_source column to track how payment was verified
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS confirmation_source text DEFAULT NULL;

-- Add confirmation_mode column (realtime vs periodic)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS confirmation_mode text DEFAULT NULL;

-- Add constraint for valid confirmation modes
ALTER TABLE public.orders 
ADD CONSTRAINT orders_confirmation_mode_check 
CHECK (confirmation_mode IS NULL OR confirmation_mode IN ('realtime', 'periodic', 'manual'));

-- Add constraint for valid confirmation sources
ALTER TABLE public.orders 
ADD CONSTRAINT orders_confirmation_source_check 
CHECK (confirmation_source IS NULL OR confirmation_source IN ('infinitepay_webhook', 'pagseguro_webhook', 'gateway_api', 'periodic_check', 'manual'));