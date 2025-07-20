
-- Add columns to the products table to store variation details
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS variant_options JSONB DEFAULT '{}';

-- Add columns to order_items table to store specific variation details
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS variant_title TEXT,
ADD COLUMN IF NOT EXISTS variant_options JSONB DEFAULT '{}';

-- Update the sync_shopify_order function to store variation details
CREATE OR REPLACE FUNCTION public.sync_shopify_order(shopify_order_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  order_id UUID;
  customer_id UUID;
  address_id UUID;
  product_id UUID;
  item_data JSONB;
BEGIN
  -- Extract basic order info
  RAISE LOG 'Syncing Shopify order: %', shopify_order_data->>'id';
  
  -- Create or find customer
  WITH customer_insert AS (
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
      COALESCE(
        shopify_order_data->'customer'->>'phone',
        shopify_order_data->'shipping_address'->>'phone'
      )
    )
    ON CONFLICT (shopify_customer_id) 
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, customers.phone),
      updated_at = now()
    RETURNING id
  )
  SELECT id INTO customer_id FROM customer_insert;
  
  -- Create shipping address
  INSERT INTO addresses (
    customer_id,
    address_line_1,
    address_line_2,
    city,
    state,
    postal_code,
    country,
    is_default
  ) VALUES (
    customer_id,
    shopify_order_data->'shipping_address'->>'address1',
    shopify_order_data->'shipping_address'->>'address2',
    shopify_order_data->'shipping_address'->>'city',
    shopify_order_data->'shipping_address'->>'province',
    shopify_order_data->'shipping_address'->>'zip',
    COALESCE(shopify_order_data->'shipping_address'->>'country', 'India'),
    true
  ) RETURNING id INTO address_id;
  
  -- Create order
  INSERT INTO orders (
    shopify_order_id,
    order_number,
    customer_id,
    shipping_address_id,
    stage,
    total_amount,
    currency,
    printed_at
  ) VALUES (
    (shopify_order_data->>'id')::BIGINT,
    COALESCE(shopify_order_data->>'order_number', shopify_order_data->>'name'),
    customer_id,
    address_id,
    'packing'::order_stage,
    COALESCE((shopify_order_data->>'current_total_price')::DECIMAL, 0),
    COALESCE(shopify_order_data->>'currency', 'INR'),
    now()
  ) RETURNING id INTO order_id;
  
  -- Create order items with variation details
  FOR item_data IN SELECT * FROM jsonb_array_elements(shopify_order_data->'line_items')
  LOOP
    -- Create or find product with variation details
    WITH product_insert AS (
      INSERT INTO products (
        shopify_product_id,
        title,
        sku,
        price,
        variations,
        variant_options
      ) VALUES (
        (item_data->>'product_id')::BIGINT,
        item_data->>'title',
        item_data->>'sku',
        (item_data->>'price')::DECIMAL,
        COALESCE(item_data->'variant_details', '{}'),
        COALESCE(item_data->'properties', '{}')
      )
      ON CONFLICT (shopify_product_id) 
      DO UPDATE SET
        title = EXCLUDED.title,
        sku = COALESCE(EXCLUDED.sku, products.sku),
        price = EXCLUDED.price,
        variations = COALESCE(EXCLUDED.variations, products.variations),
        variant_options = COALESCE(EXCLUDED.variant_options, products.variant_options)
      RETURNING id
    )
    SELECT id INTO product_id FROM product_insert;
    
    -- Create order item with variation details
    INSERT INTO order_items (
      order_id,
      product_id,
      shopify_variant_id,
      title,
      sku,
      quantity,
      price,
      total,
      packed,
      variant_title,
      variant_options
    ) VALUES (
      order_id,
      product_id,
      (item_data->>'variant_id')::BIGINT,
      item_data->>'title',
      item_data->>'sku',
      (item_data->>'quantity')::INTEGER,
      (item_data->>'price')::DECIMAL,
      ((item_data->>'quantity')::INTEGER * (item_data->>'price')::DECIMAL),
      false,
      item_data->>'variant_title',
      COALESCE(item_data->'properties', '{}')
    );
  END LOOP;
  
  RAISE LOG 'Successfully synced Shopify order % to Supabase order %', shopify_order_data->>'id', order_id;
  RETURN order_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error syncing Shopify order %: %', shopify_order_data->>'id', SQLERRM;
    RAISE;
END;
$function$;
