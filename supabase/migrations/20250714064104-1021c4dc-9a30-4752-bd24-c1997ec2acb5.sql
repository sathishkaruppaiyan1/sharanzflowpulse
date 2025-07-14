-- Fix RLS policies to allow service access for order syncing
DROP POLICY IF EXISTS "Allow all operations on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all operations on addresses" ON public.addresses;
DROP POLICY IF EXISTS "Allow all operations on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;
DROP POLICY IF EXISTS "Allow all operations on order_items" ON public.order_items;

-- Create more permissive policies for order management system
CREATE POLICY "Allow all operations on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on addresses" ON public.addresses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

-- Update the order completion trigger function to be more robust
CREATE OR REPLACE FUNCTION check_order_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the trigger execution
  RAISE LOG 'Order completion trigger fired for item: % in order: %', NEW.id, NEW.order_id;
  
  -- Only proceed if the item was marked as packed
  IF NEW.packed = true AND (OLD.packed IS NULL OR OLD.packed = false) THEN
    -- Check if all items in the order are now packed
    IF NOT EXISTS (
      SELECT 1 FROM order_items 
      WHERE order_id = NEW.order_id AND packed = false
    ) THEN
      -- All items are packed, move order to tracking stage
      UPDATE orders 
      SET stage = 'tracking'::order_stage, 
          packed_at = COALESCE(packed_at, now()),
          updated_at = now()
      WHERE id = NEW.order_id 
        AND stage = 'packing'::order_stage;
      
      RAISE LOG 'Order % moved to tracking stage', NEW.order_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS order_completion_trigger ON order_items;
CREATE TRIGGER order_completion_trigger
  AFTER UPDATE OF packed ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION check_order_completion();

-- Create a function to sync Shopify orders to Supabase
CREATE OR REPLACE FUNCTION sync_shopify_order(
  shopify_order_data JSONB
) RETURNS UUID AS $$
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
  
  -- Create order items
  FOR item_data IN SELECT * FROM jsonb_array_elements(shopify_order_data->'line_items')
  LOOP
    -- Create or find product
    WITH product_insert AS (
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
      RETURNING id
    )
    SELECT id INTO product_id FROM product_insert;
    
    -- Create order item
    INSERT INTO order_items (
      order_id,
      product_id,
      shopify_variant_id,
      title,
      sku,
      quantity,
      price,
      total,
      packed
    ) VALUES (
      order_id,
      product_id,
      (item_data->>'variant_id')::BIGINT,
      item_data->>'title',
      item_data->>'sku',
      (item_data->>'quantity')::INTEGER,
      (item_data->>'price')::DECIMAL,
      ((item_data->>'quantity')::INTEGER * (item_data->>'price')::DECIMAL),
      false
    );
  END LOOP;
  
  RAISE LOG 'Successfully synced Shopify order % to Supabase order %', shopify_order_data->>'id', order_id;
  RETURN order_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error syncing Shopify order %: %', shopify_order_data->>'id', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;