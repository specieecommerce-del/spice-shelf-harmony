-- First add the missing columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_code text,
ADD COLUMN IF NOT EXISTS shipping_carrier text,
ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone;

-- Recreate the check_order_status function with correct columns
CREATE OR REPLACE FUNCTION public.check_order_status(p_order_nsu text)
 RETURNS TABLE(id uuid, order_nsu text, status text, total_amount integer, paid_amount integer, payment_method text, installments integer, receipt_url text, created_at timestamp with time zone, tracking_code text, shipping_carrier text, shipped_at timestamp with time zone, customer_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.order_nsu,
    o.status,
    o.total_amount,
    o.paid_amount,
    o.payment_method,
    o.installments,
    o.receipt_url,
    o.created_at,
    o.tracking_code,
    o.shipping_carrier,
    o.shipped_at,
    o.customer_name
  FROM public.orders o
  WHERE o.order_nsu = p_order_nsu;
END;
$function$;