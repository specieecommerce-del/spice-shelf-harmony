-- Add proper user isolation policies for the orders table
-- Users can ONLY see their own orders (strict user_id matching)

-- SELECT: Users can only view their own orders
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Users can only create orders for themselves
CREATE POLICY "Users can insert own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own orders
CREATE POLICY "Users can update own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- DELETE: Users can only delete their own orders
CREATE POLICY "Users can delete own orders"
ON public.orders
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);