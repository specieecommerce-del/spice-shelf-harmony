-- Add RESTRICTIVE policy to block anonymous access to orders table
-- This ensures only authenticated users can access any order data
CREATE POLICY "Block anonymous access to orders"
ON public.orders
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Also block anonymous INSERT, UPDATE, DELETE explicitly
CREATE POLICY "Block anonymous insert on orders"
ON public.orders
AS RESTRICTIVE
FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "Block anonymous update on orders"
ON public.orders
AS RESTRICTIVE
FOR UPDATE
TO anon
USING (false);

CREATE POLICY "Block anonymous delete on orders"
ON public.orders
AS RESTRICTIVE
FOR DELETE
TO anon
USING (false);