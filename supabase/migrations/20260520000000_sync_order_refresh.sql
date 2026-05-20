-- ============================================================
-- Migration: sync_shopify_order_to_db now refreshes existing orders
-- Date: 2026-05-20
-- Changes:
--   - For existing orders in pre-print stages (pending/printing/hold),
--     UPDATE the joined addresses row in place, upsert the order row
--     without touching stage, and DELETE+INSERT order_items so that
--     Shopify edits (address, items, weight) propagate on next sync.
--   - For orders already past pre-print (packing/tracking/shipped/
--     delivered), the function is a no-op that returns the existing id.
--   - New orders behave as before.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_shopify_order_to_db(
  shopify_order_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_order_id            UUID;
  v_customer_id         UUID;
  v_address_id          UUID;
  v_product_id          UUID;
  v_item                JSONB;
  v_total_weight        INTEGER := 0;
  v_existing_order_id   UUID;
  v_existing_address_id UUID;
  v_existing_stage      TEXT;
  v_shopify_order_id    BIGINT;
BEGIN
  v_shopify_order_id := (shopify_order_data->>'id')::BIGINT;

  RAISE LOG 'sync_shopify_order_to_db: order %', v_shopify_order_id;

  SELECT id, shipping_address_id, stage::TEXT
    INTO v_existing_order_id, v_existing_address_id, v_existing_stage
    FROM public.orders
    WHERE shopify_order_id = v_shopify_order_id;

  IF v_existing_order_id IS NOT NULL
     AND v_existing_stage NOT IN ('pending', 'printing', 'hold') THEN
    RAISE LOG 'sync_shopify_order_to_db: skip refresh, order % in stage %',
              v_existing_order_id, v_existing_stage;
    RETURN v_existing_order_id;
  END IF;

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

  IF v_existing_address_id IS NOT NULL THEN
    UPDATE public.addresses SET
      address_line_1 = shopify_order_data->'shipping_address'->>'address1',
      address_line_2 = shopify_order_data->'shipping_address'->>'address2',
      city           = shopify_order_data->'shipping_address'->>'city',
      state          = shopify_order_data->'shipping_address'->>'province',
      postal_code    = shopify_order_data->'shipping_address'->>'zip',
      country        = COALESCE(shopify_order_data->'shipping_address'->>'country', 'India')
    WHERE id = v_existing_address_id;
    v_address_id := v_existing_address_id;
  ELSE
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
  END IF;

  SELECT COALESCE(SUM(
    COALESCE((item->>'grams')::INTEGER, 0) *
    COALESCE((item->>'quantity')::INTEGER, 1)
  ), 0)
  INTO v_total_weight
  FROM jsonb_array_elements(shopify_order_data->'line_items') AS item;

  INSERT INTO public.orders (
    shopify_order_id, order_number, customer_id, shipping_address_id,
    stage, total_amount, currency, total_weight, notes, printed_at
  ) VALUES (
    v_shopify_order_id,
    COALESCE(shopify_order_data->>'order_number', shopify_order_data->>'name'),
    v_customer_id,
    v_address_id,
    'pending'::order_stage,
    COALESCE((shopify_order_data->>'current_total_price')::DECIMAL, 0),
    COALESCE(shopify_order_data->>'currency', 'INR'),
    v_total_weight,
    shopify_order_data->>'note',
    now()
  )
  ON CONFLICT (shopify_order_id) DO UPDATE SET
    order_number        = EXCLUDED.order_number,
    customer_id         = EXCLUDED.customer_id,
    shipping_address_id = EXCLUDED.shipping_address_id,
    total_amount        = EXCLUDED.total_amount,
    currency            = EXCLUDED.currency,
    total_weight        = EXCLUDED.total_weight,
    notes               = EXCLUDED.notes,
    updated_at          = now()
  RETURNING id INTO v_order_id;

  DELETE FROM public.order_items WHERE order_id = v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(shopify_order_data->'line_items')
  LOOP
    INSERT INTO public.products (
      shopify_product_id, title, sku, price, variations, variant_options
    ) VALUES (
      (v_item->>'product_id')::BIGINT,
      v_item->>'title',
      v_item->>'sku',
      (v_item->>'price')::DECIMAL,
      COALESCE(v_item->'variant_details', '{}'::jsonb),
      COALESCE(v_item->'properties', '{}'::jsonb)
    )
    ON CONFLICT (shopify_product_id) DO UPDATE SET
      title           = EXCLUDED.title,
      sku             = COALESCE(EXCLUDED.sku, products.sku),
      price           = EXCLUDED.price,
      variations      = COALESCE(EXCLUDED.variations, products.variations),
      variant_options = COALESCE(EXCLUDED.variant_options, products.variant_options)
    RETURNING id INTO v_product_id;

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
      COALESCE(v_item->'properties', '{}'::jsonb),
      COALESCE((v_item->>'grams')::INTEGER, 0)
    );
  END LOOP;

  RAISE LOG 'sync_shopify_order_to_db: synced order %', v_order_id;
  RETURN v_order_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'sync_shopify_order_to_db error for %: %',
              shopify_order_data->>'id', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;
