-- Add DELETE policy for profiles to comply with GDPR/CCPA
CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);