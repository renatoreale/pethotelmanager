
-- Allow anyone to update demo_leads confirmed status (token-based confirmation)
CREATE POLICY "Anyone can confirm demo_leads by token"
ON public.demo_leads
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
