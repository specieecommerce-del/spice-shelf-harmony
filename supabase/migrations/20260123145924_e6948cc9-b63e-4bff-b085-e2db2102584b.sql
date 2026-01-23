
-- Add new columns to recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS prep_time text,
ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'Fácil',
ADD COLUMN IF NOT EXISTS nutritional_info jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS recipe_category text DEFAULT 'caseira',
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS views integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false;

-- Create recipe_products junction table for linking recipes to products
CREATE TABLE IF NOT EXISTS public.recipe_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity numeric DEFAULT 1,
  unit text DEFAULT 'unidade',
  is_optional boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, product_id)
);

-- Enable RLS on recipe_products
ALTER TABLE public.recipe_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for recipe_products
CREATE POLICY "Anyone can view recipe products" 
ON public.recipe_products 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage recipe products" 
ON public.recipe_products 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create recipe_sales table for tracking sales from recipes
CREATE TABLE IF NOT EXISTS public.recipe_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  products_sold jsonb DEFAULT '[]'::jsonb,
  total_amount numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on recipe_sales
ALTER TABLE public.recipe_sales ENABLE ROW LEVEL SECURITY;

-- RLS policies for recipe_sales
CREATE POLICY "Admins can view recipe sales" 
ON public.recipe_sales 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert recipe sales" 
ON public.recipe_sales 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Block anonymous access to recipe sales" 
ON public.recipe_sales 
FOR ALL 
USING (false)
WITH CHECK (false);
