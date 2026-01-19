-- Drop the SECURITY DEFINER view and replace with a secure function approach
DROP VIEW IF EXISTS public.order_status_public;

-- The check_order_status function is already SECURITY DEFINER which is acceptable
-- for functions when properly scoped (it only returns minimal data for a specific order_nsu)
-- This is the recommended pattern for controlled data access