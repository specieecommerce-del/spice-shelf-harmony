-- Remove the overly permissive anonymous policy
DROP POLICY IF EXISTS "Anon can check order by nsu" ON public.orders;