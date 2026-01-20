-- Remove all authenticated user policies - only service_role (backend) can access orders
DROP POLICY IF EXISTS "Authenticated users can view own orders by user_id" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert own orders" ON public.orders;

-- Now only service_role policies remain, meaning:
-- - No direct client access to orders table
-- - All order operations must go through secure edge functions