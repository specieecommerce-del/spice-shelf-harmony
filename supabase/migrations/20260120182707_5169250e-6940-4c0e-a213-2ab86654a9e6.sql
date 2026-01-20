-- Drop the existing constraint and add a new one with pending_pix status
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'pending_pix'::text, 'paid'::text, 'failed'::text, 'cancelled'::text, 'shipped'::text, 'delivered'::text]));