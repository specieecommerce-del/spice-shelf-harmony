-- Fix the overly permissive INSERT policy on audit_logs
-- Drop the current permissive policy
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;

-- Create a more restrictive policy that only allows authenticated service role operations
-- Since edge functions use service_role key, they bypass RLS anyway.
-- For the table itself, we only allow admins to insert (in case of future direct inserts)
CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));