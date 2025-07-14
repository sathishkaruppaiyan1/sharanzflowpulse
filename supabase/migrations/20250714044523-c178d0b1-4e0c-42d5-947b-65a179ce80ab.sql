
-- Fix the trigger function to properly cast the stage value
CREATE OR REPLACE FUNCTION check_order_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all items in the order are packed
  IF NOT EXISTS (
    SELECT 1 FROM order_items 
    WHERE order_id = NEW.order_id AND packed = false
  ) THEN
    -- All items are packed, move order to tracking (properly cast the enum)
    UPDATE orders 
    SET stage = 'tracking'::order_stage, 
        packed_at = now() 
    WHERE id = NEW.order_id AND stage = 'packing'::order_stage;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
