-- Update the get_public_product_fields function to ensure sensitive pricing fields are NEVER exposed
CREATE OR REPLACE FUNCTION public.get_public_product_fields(p products)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'short_description', p.short_description,
    'long_description', p.long_description,
    'price', p.price,
    'original_price', p.original_price,
    'image_url', p.image_url,
    'additional_images', p.additional_images,
    'category', p.category,
    'category_id', p.category_id,
    'stock_quantity', p.stock_quantity,
    'is_active', p.is_active,
    'is_featured', p.is_featured,
    'is_bestseller', p.is_bestseller,
    'rating', p.rating,
    'reviews', p.reviews,
    'badges', p.badges,
    'weight', p.weight,
    'dimensions', p.dimensions,
    'nutritional_info', p.nutritional_info,
    'sku', p.sku,
    'sort_order', p.sort_order,
    'created_at', p.created_at,
    'updated_at', p.updated_at
    -- EXCLUDED: cost_price, profit_margin, tax_percentage, icms_percentage, supplier_name, supplier_cnpj
  )
$$;

-- Create a secure public view for products that excludes sensitive pricing data
CREATE OR REPLACE VIEW public.products_public
WITH (security_invoker = on) AS
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
  -- EXCLUDED: cost_price, profit_margin, tax_percentage, icms_percentage, supplier_name, supplier_cnpj
FROM public.products;

-- Drop existing permissive policy for public access
DROP POLICY IF EXISTS "Anyone can view active products basic info" ON public.products;

-- Create a restrictive policy that only allows admins to see full product data
-- Non-admins get NO direct access - they must use products_public view
CREATE POLICY "Only admins can access products directly"
ON public.products
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow public read access to the secure view
GRANT SELECT ON public.products_public TO anon, authenticated;

COMMENT ON VIEW public.products_public IS 'Public-safe view of products that excludes sensitive pricing and supplier data';