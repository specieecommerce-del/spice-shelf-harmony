-- Add reserved/safety stock field to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS reserved_stock integer NOT NULL DEFAULT 0;

-- Create stock movements table to track all stock changes
CREATE TABLE public.stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('entry', 'exit', 'adjustment', 'reservation', 'sale')),
  quantity integer NOT NULL,
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  reason text,
  reference_id uuid, -- Can reference order_id for sales
  reference_type text, -- 'order', 'manual', 'import', etc.
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_movements
CREATE POLICY "Admins can view stock movements"
  ON public.stock_movements FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert stock movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage stock movements"
  ON public.stock_movements FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Block anonymous access to stock movements"
  ON public.stock_movements FOR ALL
  USING (false)
  WITH CHECK (false);

-- Create a function to log stock movements automatically
CREATE OR REPLACE FUNCTION public.log_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only log if stock_quantity actually changed
  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity THEN
    INSERT INTO public.stock_movements (
      product_id,
      movement_type,
      quantity,
      previous_quantity,
      new_quantity,
      reason,
      reference_type
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.stock_quantity > OLD.stock_quantity THEN 'entry'
        ELSE 'exit'
      END,
      ABS(NEW.stock_quantity - OLD.stock_quantity),
      OLD.stock_quantity,
      NEW.stock_quantity,
      'Ajuste automático',
      'auto'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for automatic stock logging
CREATE TRIGGER log_product_stock_changes
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.log_stock_movement();