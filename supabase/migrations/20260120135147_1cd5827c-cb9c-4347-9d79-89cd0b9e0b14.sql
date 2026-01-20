-- Remove the email-based lookup policy that could expose customer data
-- An attacker who registers with a victim's email could see their orders
DROP POLICY IF EXISTS "Users can view own orders by email" ON public.orders;