-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Allow public insert on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public select on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow service role update on orders" ON public.orders;

-- Create secure policies that only allow service role access
-- Service role is used by edge functions (webhook, create-payment, check-payment)

-- Only service role can insert orders (via edge functions)
CREATE POLICY "Service role can insert orders"
ON public.orders
FOR INSERT
TO service_role
WITH CHECK (true);

-- Only service role can select orders (via edge functions)
CREATE POLICY "Service role can select orders"
ON public.orders
FOR SELECT
TO service_role
USING (true);

-- Only service role can update orders (via webhook)
CREATE POLICY "Service role can update orders"
ON public.orders
FOR UPDATE
TO service_role
USING (true);

-- Create a secure view for public order status check (only shows minimal info)
CREATE OR REPLACE VIEW public.order_status_public
WITH (security_invoker = off) AS
SELECT 
  id,
  order_nsu,
  status,
  payment_method,
  installments,
  receipt_url,
  created_at
FROM public.orders;

-- Grant select on the view to anon/authenticated
GRANT SELECT ON public.order_status_public TO anon, authenticated;

-- Create a function to safely check order status with order_nsu verification
CREATE OR REPLACE FUNCTION public.check_order_status(p_order_nsu TEXT)
RETURNS TABLE (
  id UUID,
  order_nsu TEXT,
  status TEXT,
  total_amount INTEGER,
  paid_amount INTEGER,
  payment_method TEXT,
  installments INTEGER,
  receipt_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    o.created_at
  FROM public.orders o
  WHERE o.order_nsu = p_order_nsu;
END;
$$;

-- Grant execute on the function to anon/authenticated
GRANT EXECUTE ON FUNCTION public.check_order_status(TEXT) TO anon, authenticated;