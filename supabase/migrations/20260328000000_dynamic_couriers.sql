-- ============================================================
-- Migration: Dynamic Courier Partners
-- Date: 2026-03-28
-- Changes:
--   1. Drop carrier_type enum → orders.carrier becomes TEXT
--   2. Add total_weight + notes columns to orders
--   3. Add grams column to order_items
--   4. Add UNIQUE constraint to parcel_panel_analytics.date
--   5. Create courier_partners table (user-managed couriers)
--   6. Add sync_shopify_order_to_db RPC (syncs weight)
--   7. Improved indexes
-- ============================================================


-- ── 1. Drop carrier_type enum, make orders.carrier plain TEXT ──────────────

-- First remove the column that references the enum
ALTER TABLE public.orders DROP COLUMN IF EXISTS carrier;

-- Now we can safely drop the enum
DROP TYPE IF EXISTS public.carrier_type;

-- Add carrier back as TEXT
ALTER TABLE public.orders
  ADD COLUMN carrier TEXT;


-- ── 2. Extra columns on orders ─────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_weight INTEGER DEFAULT 0,   -- grams, from Shopify
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;                -- resolved tracking link


-- ── 3. Weight per order item ───────────────────────────────────────────────

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS grams INTEGER DEFAULT 0;          -- per-item weight in grams


-- ── 4. Unique date on parcel_panel_analytics ──────────────────────────────

ALTER TABLE public.parcel_panel_analytics
  DROP CONSTRAINT IF EXISTS parcel_panel_analytics_date_unique;

ALTER TABLE public.parcel_panel_analytics
  ADD CONSTRAINT parcel_panel_analytics_date_unique UNIQUE (date);


-- ── 5. courier_partners table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.courier_partners (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,                       -- display name, e.g. "Delhivery"
  code            TEXT NOT NULL UNIQUE,                -- slug, e.g. "delhivery"
  tracking_url    TEXT,                                -- e.g. "https://example.com/track/{number}"
  tracking_prefix TEXT,                                -- e.g. "2158" or "A1" for auto-detect
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.courier_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on courier_partners"
  ON public.courier_partners
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- updated_at trigger
CREATE TRIGGER courier_partners_updated_at
  BEFORE UPDATE ON public.courier_partners
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for active + sort queries
CREATE INDEX IF NOT EXISTS idx_courier_partners_active_sort
  ON public.courier_partners (is_active, sort_order);


-- ── 6. Improved indexes on orders ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_stage
  ON public.orders (stage);

CREATE INDEX IF NOT EXISTS idx_orders_stage_created
  ON public.orders (stage, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_tracking_number
  ON public.orders (tracking_number)
  WHERE tracking_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_packed
  ON public.order_items (order_id, packed);


-- ── 7. sync_shopify_order_to_db RPC ───────────────────────────────────────
-- Updated version of sync_shopify_order that also syncs weight fields
-- and uses 'pending' stage instead of 'packing' so print → packing flow works

CREATE OR REPLACE FUNCTION public.sync_shopify_order_to_db(
  shopify_order_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_order_id    UUID;
  v_customer_id UUID;
  v_address_id  UUID;
  v_product_id  UUID;
  v_item        JSONB;
  v_total_weight INTEGER := 0;
BEGIN
  RAISE LOG 'sync_shopify_order_to_db: order %', shopify_order_data->>'id';

  -- ── Customer upsert ────────────────────────────────────────────────────
  INSERT INTO public.customers (
    shopify_customer_id, first_name, last_name, email, phone
  ) VALUES (
    (shopify_order_data->'customer'->>'id')::BIGINT,
    shopify_order_data->'customer'->>'first_name',
    shopify_order_data->'customer'->>'last_name',
    shopify_order_data->'customer'->>'email',
    COALESCE(
      shopify_order_data->'customer'->>'phone',
      shopify_order_data->'shipping_address'->>'phone'
    )
  )
  ON CONFLICT (shopify_customer_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name  = EXCLUDED.last_name,
    email      = EXCLUDED.email,
    phone      = COALESCE(EXCLUDED.phone, customers.phone),
    updated_at = now()
  RETURNING id INTO v_customer_id;

  -- ── Shipping address insert ────────────────────────────────────────────
  INSERT INTO public.addresses (
    customer_id, address_line_1, address_line_2,
    city, state, postal_code, country, is_default
  ) VALUES (
    v_customer_id,
    shopify_order_data->'shipping_address'->>'address1',
    shopify_order_data->'shipping_address'->>'address2',
    shopify_order_data->'shipping_address'->>'city',
    shopify_order_data->'shipping_address'->>'province',
    shopify_order_data->'shipping_address'->>'zip',
    COALESCE(shopify_order_data->'shipping_address'->>'country', 'India'),
    true
  ) RETURNING id INTO v_address_id;

  -- ── Compute total weight from line items ───────────────────────────────
  SELECT COALESCE(SUM(
    COALESCE((item->>'grams')::INTEGER, 0) *
    COALESCE((item->>'quantity')::INTEGER, 1)
  ), 0)
  INTO v_total_weight
  FROM jsonb_array_elements(shopify_order_data->'line_items') AS item;

  -- ── Order insert ───────────────────────────────────────────────────────
  INSERT INTO public.orders (
    shopify_order_id, order_number, customer_id, shipping_address_id,
    stage, total_amount, currency, total_weight, notes, printed_at
  ) VALUES (
    (shopify_order_data->>'id')::BIGINT,
    COALESCE(shopify_order_data->>'order_number', shopify_order_data->>'name'),
    v_customer_id,
    v_address_id,
    'pending'::order_stage,
    COALESCE((shopify_order_data->>'current_total_price')::DECIMAL, 0),
    COALESCE(shopify_order_data->>'currency', 'INR'),
    v_total_weight,
    shopify_order_data->>'note',
    now()
  ) RETURNING id INTO v_order_id;

  -- ── Line items ─────────────────────────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(shopify_order_data->'line_items')
  LOOP
    -- Product upsert
    INSERT INTO public.products (
      shopify_product_id, title, sku, price, variations, variant_options
    ) VALUES (
      (v_item->>'product_id')::BIGINT,
      v_item->>'title',
      v_item->>'sku',
      (v_item->>'price')::DECIMAL,
      COALESCE(v_item->'variant_details', '{}'),
      COALESCE(v_item->'properties', '{}')
    )
    ON CONFLICT (shopify_product_id) DO UPDATE SET
      title           = EXCLUDED.title,
      sku             = COALESCE(EXCLUDED.sku, products.sku),
      price           = EXCLUDED.price,
      variations      = COALESCE(EXCLUDED.variations, products.variations),
      variant_options = COALESCE(EXCLUDED.variant_options, products.variant_options)
    RETURNING id INTO v_product_id;

    -- Order item insert
    INSERT INTO public.order_items (
      order_id, product_id, shopify_variant_id,
      title, sku, quantity, price, total,
      packed, variant_title, variant_options, grams
    ) VALUES (
      v_order_id,
      v_product_id,
      (v_item->>'variant_id')::BIGINT,
      v_item->>'title',
      v_item->>'sku',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::DECIMAL,
      (v_item->>'quantity')::INTEGER * (v_item->>'price')::DECIMAL,
      false,
      v_item->>'variant_title',
      COALESCE(v_item->'properties', '{}'),
      COALESCE((v_item->>'grams')::INTEGER, 0)
    );
  END LOOP;

  RAISE LOG 'sync_shopify_order_to_db: created order %', v_order_id;
  RETURN v_order_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'sync_shopify_order_to_db error for %: %', shopify_order_data->>'id', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Keep old name as alias so existing code that calls sync_shopify_order still works
CREATE OR REPLACE FUNCTION public.sync_shopify_order(shopify_order_data JSONB)
RETURNS UUID AS $$
  SELECT public.sync_shopify_order_to_db(shopify_order_data);
$$ LANGUAGE sql;
