-- Update RLS policies to allow DELETE operations on order_items and orders
DROP POLICY IF EXISTS "Allow all operations on order_items" ON public.order_items;
CREATE POLICY "Allow all operations on order_items" ON public.order_items
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on orders" ON public.orders;
CREATE POLICY "Allow all operations on orders" ON public.orders
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on addresses" ON public.addresses;
CREATE POLICY "Allow all operations on addresses" ON public.addresses
  FOR ALL USING (true) WITH CHECK (true);