-- Create audit_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  actor_email text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert audit logs (from edge functions)
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Block anonymous access
CREATE POLICY "Block anonymous access to audit logs"
ON public.audit_logs
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Add pix_confirmed_by and pix_confirmed_at columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS pix_confirmed_by uuid,
ADD COLUMN IF NOT EXISTS pix_confirmed_at timestamp with time zone;