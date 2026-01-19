-- Create orders table to track payments
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_nsu TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL,
  total_amount INTEGER NOT NULL, -- in cents
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  payment_method TEXT, -- 'credit_card' or 'pix'
  transaction_nsu TEXT,
  invoice_slug TEXT,
  receipt_url TEXT,
  payment_link TEXT,
  installments INTEGER DEFAULT 1,
  paid_amount INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policy for public insert (needed for checkout)
CREATE POLICY "Allow public insert on orders"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- Create policy for public select (needed for order status check)
CREATE POLICY "Allow public select on orders"
ON public.orders
FOR SELECT
USING (true);

-- Create policy for service role to update orders (for webhook)
CREATE POLICY "Allow service role update on orders"
ON public.orders
FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_orders_updated_at();