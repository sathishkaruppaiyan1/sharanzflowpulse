
-- Update the RLS policy for system_settings to allow access without authentication for now
-- This is needed since the app doesn't have full authentication implemented yet
DROP POLICY IF EXISTS "Authenticated users can manage system_settings" ON public.system_settings;

-- Create a more permissive policy that allows all operations
-- In a production environment, you would want to restrict this to authenticated admin users
CREATE POLICY "Allow all access to system_settings" 
  ON public.system_settings 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
