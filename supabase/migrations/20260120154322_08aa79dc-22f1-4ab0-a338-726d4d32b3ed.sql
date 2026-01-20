-- Create table for storing admin bank account settings (for reference only)
CREATE TABLE public.store_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read store settings
CREATE POLICY "Admins can view store settings" 
ON public.store_settings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert store settings
CREATE POLICY "Admins can insert store settings" 
ON public.store_settings 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update store settings
CREATE POLICY "Admins can update store settings" 
ON public.store_settings 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete store settings
CREATE POLICY "Admins can delete store settings" 
ON public.store_settings 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Block anonymous access
CREATE POLICY "Block anonymous access to store settings" 
ON public.store_settings 
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();