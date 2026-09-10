-- Applied to project fmhwcnjvlagoilicsmuw on 2026-09-10.
--
-- 1. Server-side stage aggregate: replaces 8 HEAD count requests per minute
--    (one per stage, ~5,200/day) with a single small RPC round-trip.
--    The migration adding this previously existed in the repo but had never
--    been applied, so useStageCounts was silently running its fallback path.
CREATE OR REPLACE FUNCTION public.get_stage_counts()
RETURNS TABLE (stage public.order_stage, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT stage, COUNT(*)::BIGINT
  FROM public.orders
  WHERE stage IS NOT NULL
  GROUP BY stage;
$$;

GRANT EXECUTE ON FUNCTION public.get_stage_counts() TO authenticated, anon, service_role;

-- 2. Covering indexes for the foreign keys the PostgREST embeds join on.
CREATE INDEX IF NOT EXISTS idx_orders_customer_id
  ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_address_id
  ON public.orders (shipping_address_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_addresses_customer_id
  ON public.addresses (customer_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_details_order_id
  ON public.order_tracking_details (order_id);

-- 3. Index for the shopify_order_id lookup the Printing sync does every cycle.
CREATE INDEX IF NOT EXISTS idx_orders_shopify_order_id
  ON public.orders (shopify_order_id)
  WHERE shopify_order_id IS NOT NULL;
