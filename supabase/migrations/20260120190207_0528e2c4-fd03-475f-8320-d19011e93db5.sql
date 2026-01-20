-- Add stock management columns to products
ALTER TABLE public.products 
ADD COLUMN stock_quantity integer NOT NULL DEFAULT 0,
ADD COLUMN low_stock_threshold integer NOT NULL DEFAULT 5;

-- Update existing products with initial stock
UPDATE public.products SET stock_quantity = 50, low_stock_threshold = 5;