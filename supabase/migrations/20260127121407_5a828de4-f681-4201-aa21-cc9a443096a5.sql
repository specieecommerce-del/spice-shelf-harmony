-- Grant public access to products_public view
-- The view only exposes non-sensitive columns so it's safe for public access
GRANT SELECT ON public.products_public TO anon, authenticated;

-- Add explicit RLS policy for public view access (if RLS is enabled on view)
-- Note: Views with security_invoker inherit base table policies, so we need to either:
-- 1. Recreate view without security_invoker, OR
-- 2. Add a policy on base table for public read of non-sensitive data

-- Drop and recreate view WITHOUT security_invoker so it runs with definer privileges
DROP VIEW IF EXISTS public.products_public;

CREATE VIEW public.products_public AS
SELECT 
  id,
  name,
  description,
  short_description,
  long_description,
  price,
  original_price,
  image_url,
  additional_images,
  category,
  category_id,
  stock_quantity,
  reserved_stock,
  low_stock_threshold,
  is_active,
  is_featured,
  is_bestseller,
  rating,
  reviews,
  badges,
  weight,
  dimensions,
  nutritional_info,
  sku,
  sort_order,
  created_at,
  updated_at
FROM public.products;

-- Grant select on the new view to anonymous and authenticated users
GRANT SELECT ON public.products_public TO anon, authenticated;