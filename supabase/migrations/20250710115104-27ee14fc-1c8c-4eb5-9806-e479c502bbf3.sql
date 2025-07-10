
-- Update RLS policies to allow order syncing from Shopify
-- These policies need to allow the application to create orders and customers

-- Update customers table policy to allow inserts
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
CREATE POLICY "Allow all operations on customers" 
  ON public.customers 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Update orders table policy to allow inserts  
DROP POLICY IF EXISTS "Authenticated users can manage orders" ON public.orders;
CREATE POLICY "Allow all operations on orders" 
  ON public.orders 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Update order_items table policy to allow inserts
DROP POLICY IF EXISTS "Authenticated users can manage order_items" ON public.order_items;
CREATE POLICY "Allow all operations on order_items" 
  ON public.order_items 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Update addresses table policy to allow inserts
DROP POLICY IF EXISTS "Authenticated users can manage addresses" ON public.addresses;
CREATE POLICY "Allow all operations on addresses" 
  ON public.addresses 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
