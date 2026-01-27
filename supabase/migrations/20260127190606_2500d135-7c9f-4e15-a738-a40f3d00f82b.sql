-- Add is_sealed column to products table
ALTER TABLE public.products 
ADD COLUMN is_sealed boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.products.is_sealed IS 'Indicates if the product is factory sealed (lacrado de fábrica)';