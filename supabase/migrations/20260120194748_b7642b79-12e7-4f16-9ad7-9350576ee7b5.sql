-- Create a function to trigger stock alert when product stock goes below threshold
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_stock integer;
  new_stock integer;
  threshold integer;
BEGIN
  old_stock := COALESCE(OLD.stock_quantity, 0);
  new_stock := NEW.stock_quantity;
  threshold := NEW.low_stock_threshold;
  
  -- Only trigger if:
  -- 1. Stock just went from above threshold to at or below threshold, OR
  -- 2. Stock just went to zero when it wasn't zero before
  IF (old_stock > threshold AND new_stock <= threshold) OR 
     (old_stock > 0 AND new_stock = 0) THEN
    -- Insert a notification record that can be processed by a scheduled job
    INSERT INTO public.stock_notifications (product_id, product_name, stock_quantity, threshold, notified)
    VALUES (NEW.id, NEW.name, new_stock, threshold, false);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create table to store pending stock notifications
CREATE TABLE public.stock_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  stock_quantity integer NOT NULL,
  threshold integer NOT NULL,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- Service role can manage notifications
CREATE POLICY "Service role can manage stock notifications"
ON public.stock_notifications
FOR ALL
USING (true)
WITH CHECK (true);

-- Block anonymous access
CREATE POLICY "Block anonymous access to stock notifications"
ON public.stock_notifications
FOR ALL
USING (false)
WITH CHECK (false);

-- Create trigger on products table
CREATE TRIGGER on_stock_change_notify
AFTER UPDATE OF stock_quantity ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.notify_low_stock();