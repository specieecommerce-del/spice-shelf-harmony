-- Drop old constraint and add new one with "processing" status
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'pending_pix'::text, 'paid'::text, 'processing'::text, 'failed'::text, 'cancelled'::text, 'shipped'::text, 'delivered'::text]));