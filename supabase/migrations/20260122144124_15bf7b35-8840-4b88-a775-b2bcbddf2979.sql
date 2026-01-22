-- Drop the existing check constraint and recreate with pending_boleto status
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'pending_pix', 'pending_boleto', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'));