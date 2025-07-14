
-- Clear all orders currently in packing stage
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE stage = 'packing'
);

DELETE FROM orders WHERE stage = 'packing';

-- Also clear any test/sample orders to start fresh
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE order_number LIKE '#ORD%'
);

DELETE FROM orders WHERE order_number LIKE '#ORD%';
