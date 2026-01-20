-- Create products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  original_price numeric,
  image_url text,
  rating numeric DEFAULT 5.0,
  reviews integer DEFAULT 0,
  badges text[] DEFAULT '{}',
  category text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public can view active products
CREATE POLICY "Anyone can view active products" 
ON public.products 
FOR SELECT 
USING (is_active = true);

-- Admins can do everything with products
CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Insert initial products with placeholder images
INSERT INTO public.products (name, description, price, original_price, rating, reviews, badges, category, sort_order) VALUES
('Mix Ervas Provence', 'Blend artesanal de ervas aromáticas', 34.90, 44.90, 4.9, 127, ARRAY['Best-seller', 'Sem Glúten'], 'Ervas', 1),
('Flor de Sal Premium', 'Sal gourmet com cristais delicados', 49.90, NULL, 4.8, 89, ARRAY['Premium', 'Artesanal'], 'Sais', 2),
('Kit Especiarias Chef', '6 temperos essenciais para sua cozinha', 129.90, 159.90, 5.0, 234, ARRAY['Kit', 'Oferta'], 'Kits', 3),
('Cúrcuma Orgânica', 'Açafrão-da-terra puro e natural', 29.90, NULL, 4.7, 156, ARRAY['Orgânico', 'Vegan'], 'Especiarias', 4);