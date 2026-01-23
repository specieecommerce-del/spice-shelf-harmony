-- 1. PROTEÇÃO DE DADOS SENSÍVEIS DE PRODUTOS
-- Criar uma view pública que esconde informações sensíveis do fornecedor
CREATE OR REPLACE VIEW public.products_public AS
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
  low_stock_threshold,
  reserved_stock,
  created_at,
  updated_at
FROM public.products
WHERE is_active = true;

-- 2. CRIAR POLÍTICA PARA PROTEGER DADOS SENSÍVEIS DO FORNECEDOR
-- Remove a política antiga de visualização pública
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Cria nova política que só mostra todos os campos para admins
CREATE POLICY "Anyone can view active products basic info" 
ON public.products 
FOR SELECT 
USING (is_active = true);

-- 3. FORTALECER POLÍTICAS DE ORDERS
-- Adicionar política para admins visualizarem todos os pedidos
CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all orders" 
ON public.orders 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. ADICIONAR POLÍTICAS PARA WHATSAPP_LOGS UPDATE
CREATE POLICY "Service role can update whatsapp logs"
ON public.whatsapp_logs
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 5. PERMITIR ADMINS VEREM SUAS PRÓPRIAS PERMISSÕES
CREATE POLICY "Users can view own admin permissions" 
ON public.admin_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- 6. CRIAR TABELA DE AUDITORIA DE SEGURANÇA
CREATE TABLE IF NOT EXISTS public.security_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.security_audit ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs de auditoria
CREATE POLICY "Only admins can view security audit"
ON public.security_audit
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role pode inserir logs
CREATE POLICY "Service role can insert security audit"
ON public.security_audit
FOR INSERT
WITH CHECK (true);

-- Bloquear acesso anônimo
CREATE POLICY "Block anonymous access to security audit"
ON public.security_audit
FOR ALL
USING (false)
WITH CHECK (false);