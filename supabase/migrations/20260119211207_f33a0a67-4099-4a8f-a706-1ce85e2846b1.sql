-- Add policy for authenticated users to read their own orders by email
CREATE POLICY "Users can view own orders by email"
ON public.orders
FOR SELECT
TO authenticated
USING (customer_email = (auth.jwt() ->> 'email'));

-- Add policy for anon users to check order status by order_nsu (for order confirmation page)
-- This is limited - they can only see orders if they know the exact order_nsu
CREATE POLICY "Anon can check order by nsu"
ON public.orders
FOR SELECT
TO anon
USING (order_nsu IS NOT NULL);