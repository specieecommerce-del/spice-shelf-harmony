-- Create admin_permissions table to store what each admin can access
CREATE TABLE public.admin_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    can_view_dashboard boolean NOT NULL DEFAULT true,
    can_manage_orders boolean NOT NULL DEFAULT false,
    can_manage_shipping boolean NOT NULL DEFAULT false,
    can_manage_products boolean NOT NULL DEFAULT false,
    can_manage_whatsapp boolean NOT NULL DEFAULT false,
    can_manage_admins boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins with can_manage_admins permission can view/manage permissions
CREATE POLICY "Admins can view permissions"
ON public.admin_permissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert permissions"
ON public.admin_permissions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update permissions"
ON public.admin_permissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete permissions"
ON public.admin_permissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous access
CREATE POLICY "Block anonymous access to admin_permissions"
ON public.admin_permissions
FOR ALL
USING (false)
WITH CHECK (false);

-- Create trigger for updated_at
CREATE TRIGGER update_admin_permissions_updated_at
BEFORE UPDATE ON public.admin_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();