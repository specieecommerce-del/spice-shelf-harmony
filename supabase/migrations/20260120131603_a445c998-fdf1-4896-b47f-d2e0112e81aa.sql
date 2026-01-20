-- Block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous insert on profiles"
ON public.profiles
AS RESTRICTIVE
FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "Block anonymous update on profiles"
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO anon
USING (false);

CREATE POLICY "Block anonymous delete on profiles"
ON public.profiles
AS RESTRICTIVE
FOR DELETE
TO anon
USING (false);