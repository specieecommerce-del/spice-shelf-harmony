-- Create WhatsApp message logs table
CREATE TABLE public.whatsapp_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  message_type text NOT NULL, -- 'order_alert', 'stock_alert', 'test'
  destination_phone text NOT NULL,
  message_id text, -- Z-API messageId
  zaap_id text, -- Z-API zaapId
  status text NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message text,
  payload jsonb -- Original payload sent
);

-- Enable RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Policies for admins
CREATE POLICY "Admins can view whatsapp logs"
ON public.whatsapp_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert whatsapp logs"
ON public.whatsapp_logs
FOR INSERT
WITH CHECK (true);

-- Block anonymous access
CREATE POLICY "Block anonymous access to whatsapp logs"
ON public.whatsapp_logs
FOR ALL
USING (false)
WITH CHECK (false);

-- Create index for faster queries
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);
CREATE INDEX idx_whatsapp_logs_message_type ON public.whatsapp_logs(message_type);