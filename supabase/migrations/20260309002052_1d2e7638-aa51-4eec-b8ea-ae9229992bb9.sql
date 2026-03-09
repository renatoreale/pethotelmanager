-- Ensure users cannot update their own profile - only admins can
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;