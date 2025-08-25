
-- Add a new column to track Shopify sync status
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_synced_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance on Shopify order queries
CREATE INDEX IF NOT EXISTS idx_orders_shopify_order_id ON orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_stage_synced ON orders(stage, shopify_synced_at);

-- Create a function to sync Shopify orders to database
CREATE OR REPLACE FUNCTION sync_shopify_order_to_db(
  shopify_order_data JSONB
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  order_uuid UUID;
  customer_uuid UUID;
  address_uuid UUID;
  product_uuid UUID;
  item_data JSONB;
  phone_number TEXT;
BEGIN
  -- Extract phone number with priority: shipping_address.phone > customer.phone
  phone_number := COALESCE(
    shopify_order_data->'shipping_address'->>'phone',
    shopify_order_data->'customer'->>'phone'
  );

  -- Create or update customer if customer data exists
  IF shopify_order_data->'customer' IS NOT NULL THEN
    INSERT INTO customers (
      shopify_customer_id,
      first_name,
      last_name,
      email,
      phone
    ) VALUES (
      (shopify_order_data->'customer'->>'id')::BIGINT,
      shopify_order_data->'customer'->>'first_name',
      shopify_order_data->'customer'->>'last_name',
      shopify_order_data->'customer'->>'email',
      phone_number
    )
    ON CONFLICT (shopify_customer_id) 
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, customers.phone),
      updated_at = now()
    RETURNING id INTO customer_uuid;
  END IF;

  -- Create shipping address if address data exists
  IF shopify_order_data->'shipping_address' IS NOT NULL THEN
    INSERT INTO addresses (
      customer_id,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country
    ) VALUES (
      customer_uuid,
      shopify_order_data->'shipping_address'->>'address1',
      shopify_order_data->'shipping_address'->>'address2',
      shopify_order_data->'shipping_address'->>'city',
      shopify_order_data->'shipping_address'->>'province',
      shopify_order_data->'shipping_address'->>'zip',
      COALESCE(shopify_order_data->'shipping_address'->>'country', 'India')
    ) RETURNING id INTO address_uuid;
  END IF;

  -- Insert or update order
  INSERT INTO orders (
    shopify_order_id,
    order_number,
    customer_id,
    shipping_address_id,
    stage,
    total_amount,
    currency,
    shopify_synced_at,
    created_at
  ) VALUES (
    (shopify_order_data->>'id')::BIGINT,
    COALESCE(shopify_order_data->>'name', shopify_order_data->>'order_number'),
    customer_uuid,
    address_uuid,
    'printing'::order_stage,
    COALESCE((shopify_order_data->>'current_total_price')::DECIMAL, 0),
    COALESCE(shopify_order_data->>'currency', 'INR'),
    now(),
    COALESCE((shopify_order_data->>'created_at')::TIMESTAMP WITH TIME ZONE, now())
  )
  ON CONFLICT (shopify_order_id)
  DO UPDATE SET
    order_number = EXCLUDED.order_number,
    total_amount = EXCLUDED.total_amount,
    currency = EXCLUDED.currency,
    shopify_synced_at = now(),
    updated_at = now()
  RETURNING id INTO order_uuid;

  -- Delete existing order items for this order to avoid duplicates
  DELETE FROM order_items WHERE order_id = order_uuid;

  -- Insert order items
  FOR item_data IN SELECT * FROM jsonb_array_elements(shopify_order_data->'line_items')
  LOOP
    -- Create or update product
    INSERT INTO products (
      shopify_product_id,
      title,
      sku,
      price
    ) VALUES (
      (item_data->>'product_id')::BIGINT,
      item_data->>'title',
      item_data->>'sku',
      (item_data->>'price')::DECIMAL
    )
    ON CONFLICT (shopify_product_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      sku = COALESCE(EXCLUDED.sku, products.sku),
      price = EXCLUDED.price
    RETURNING id INTO product_uuid;

    -- Insert order item
    INSERT INTO order_items (
      order_id,
      product_id,
      shopify_variant_id,
      title,
      sku,
      quantity,
      price,
      total,
      variant_title,
      variant_options,
      packed
    ) VALUES (
      order_uuid,
      product_uuid,
      (item_data->>'variant_id')::BIGINT,
      item_data->>'title',
      item_data->>'sku',
      (item_data->>'quantity')::INTEGER,
      (item_data->>'price')::DECIMAL,
      ((item_data->>'quantity')::INTEGER * (item_data->>'price')::DECIMAL),
      item_data->>'variant_title',
      COALESCE(item_data->'properties', '{}'::jsonb),
      false
    );
  END LOOP;

  RETURN order_uuid;
END;
$$;
