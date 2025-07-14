
-- First, drop all existing data and recreate tables with proper structure
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE addresses CASCADE;

-- Drop existing triggers and functions that might be causing issues
DROP TRIGGER IF EXISTS order_items_update_trigger ON order_items;
DROP FUNCTION IF EXISTS update_order_stage_on_item_change();

-- Recreate the order_items table with simpler structure
ALTER TABLE order_items DROP COLUMN IF EXISTS packed_quantity;
ALTER TABLE order_items DROP COLUMN IF EXISTS pending_quantity;

-- Add back packed column if it doesn't exist
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS packed BOOLEAN DEFAULT false;

-- Create a simple function to auto-move orders to tracking when all items are packed
CREATE OR REPLACE FUNCTION check_order_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all items in the order are packed
  IF NOT EXISTS (
    SELECT 1 FROM order_items 
    WHERE order_id = NEW.order_id AND packed = false
  ) THEN
    -- All items are packed, move order to tracking
    UPDATE orders 
    SET stage = 'tracking', 
        packed_at = now() 
    WHERE id = NEW.order_id AND stage = 'packing';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order completion
CREATE TRIGGER order_completion_trigger
  AFTER UPDATE OF packed ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION check_order_completion();

-- Insert sample data for testing
INSERT INTO customers (id, first_name, last_name, email, phone) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'John', 'Doe', 'john@example.com', '+91-9876543210'),
('550e8400-e29b-41d4-a716-446655440002', 'Jane', 'Smith', 'jane@example.com', '+91-9876543211');

INSERT INTO addresses (id, customer_id, address_line_1, city, state, postal_code, country) VALUES
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', '123 Main St', 'Mumbai', 'Maharashtra', '400001', 'India'),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', '456 Oak Ave', 'Delhi', 'Delhi', '110001', 'India');

INSERT INTO products (id, title, sku, price) VALUES
('550e8400-e29b-41d4-a716-446655440021', 'Co-ord sets kurtas', 'KURTA001', 1500.00),
('550e8400-e29b-41d4-a716-446655440022', 'Cotton T-Shirt', 'TSHIRT001', 800.00),
('550e8400-e29b-41d4-a716-446655440023', 'Denim Jeans', 'JEANS001', 2000.00);

INSERT INTO orders (id, order_number, customer_id, shipping_address_id, stage, total_amount) VALUES
('550e8400-e29b-41d4-a716-446655440031', '#ORD001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'packing', 3000.00),
('550e8400-e29b-41d4-a716-446655440032', '#ORD002', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440012', 'packing', 1600.00);

INSERT INTO order_items (id, order_id, product_id, title, sku, quantity, price, total, packed) VALUES
-- Order 1: Co-ord sets kurtas (quantity 2)
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440021', 'Co-ord sets kurtas', 'KURTA001', 2, 1500.00, 3000.00, false),
-- Order 2: Cotton T-Shirt (quantity 2)
('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440022', 'Cotton T-Shirt', 'TSHIRT001', 2, 800.00, 1600.00, false);
