-- Insert default admin email setting if not exists
INSERT INTO public.store_settings (key, value)
VALUES ('admin_email', '"admin@loja.com"'::jsonb)
ON CONFLICT (key) DO NOTHING;