-- Remove the public read policy that exposes coupon codes
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.discount_coupons;

-- Block all direct access for anonymous users
CREATE POLICY "Block anonymous access to coupons" 
ON public.discount_coupons 
FOR SELECT 
USING (false);

-- Block anonymous insert
CREATE POLICY "Block anonymous insert on coupons" 
ON public.discount_coupons 
FOR INSERT 
WITH CHECK (false);

-- Block anonymous update
CREATE POLICY "Block anonymous update on coupons" 
ON public.discount_coupons 
FOR UPDATE 
USING (false);

-- Block anonymous delete
CREATE POLICY "Block anonymous delete on coupons" 
ON public.discount_coupons 
FOR DELETE 
USING (false);

-- Keep service role full access for edge function operations
-- The existing "Service role can manage coupons" policy already handles this