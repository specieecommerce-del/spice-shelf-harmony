-- Remover a view SECURITY DEFINER e criar uma função segura
DROP VIEW IF EXISTS public.products_public;

-- Criar função segura para filtrar campos sensíveis
CREATE OR REPLACE FUNCTION public.get_public_product_fields(p products)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
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
  )
$$;

-- Corrigir políticas de service role que usam (true)
-- Atualizar política de orders para service role ser mais restritiva
DROP POLICY IF EXISTS "Service role can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Service role can select orders" ON public.orders;
DROP POLICY IF EXISTS "Service role can update orders" ON public.orders;

-- Recriar com condições adequadas (service role precisa de acesso para processar pedidos)
CREATE POLICY "Service role operations on orders"
ON public.orders
FOR ALL
USING (
  -- Permite se for admin OU se for o próprio usuário
  has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = user_id
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = user_id
);

-- Corrigir política de whatsapp_logs
DROP POLICY IF EXISTS "Service role can update whatsapp logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "Service role can insert whatsapp logs" ON public.whatsapp_logs;

CREATE POLICY "Service role can manage whatsapp logs"
ON public.whatsapp_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Corrigir políticas de stock_movements
DROP POLICY IF EXISTS "Service role can manage stock movements" ON public.stock_movements;

CREATE POLICY "Authenticated users with admin can manage stock"
ON public.stock_movements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Corrigir políticas de stock_notifications  
DROP POLICY IF EXISTS "Service role can manage stock notifications" ON public.stock_notifications;

CREATE POLICY "Admins can manage stock notifications"
ON public.stock_notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Corrigir políticas de recipe_sales
DROP POLICY IF EXISTS "Service role can insert recipe sales" ON public.recipe_sales;

CREATE POLICY "Authenticated can insert recipe sales"
ON public.recipe_sales
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Corrigir política de security_audit
DROP POLICY IF EXISTS "Service role can insert security audit" ON public.security_audit;

CREATE POLICY "Admins can insert security audit"
ON public.security_audit
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Corrigir políticas de discount_coupons
DROP POLICY IF EXISTS "Service role can manage coupons" ON public.discount_coupons;

CREATE POLICY "Admins can manage coupons"
ON public.discount_coupons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));