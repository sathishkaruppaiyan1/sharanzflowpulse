-- Add columns to track packed and pending quantities for order items
ALTER TABLE public.order_items 
ADD COLUMN packed_quantity integer DEFAULT 0,
ADD COLUMN pending_quantity integer DEFAULT 0;

-- Update existing records to set packed_quantity based on current packed status
UPDATE public.order_items 
SET packed_quantity = CASE WHEN packed = true THEN quantity ELSE 0 END,
    pending_quantity = 0;

-- Create function to automatically update order stage based on item status
CREATE OR REPLACE FUNCTION public.update_order_stage_on_item_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the order stage based on item completion status
  WITH item_status AS (
    SELECT 
      order_id,
      SUM(quantity) as total_quantity,
      SUM(packed_quantity) as total_packed,
      SUM(pending_quantity) as total_pending
    FROM order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    GROUP BY order_id
  )
  UPDATE orders 
  SET stage = CASE 
    WHEN item_status.total_packed = 0 THEN 'packing'
    WHEN item_status.total_packed = item_status.total_quantity THEN 'tracking'
    ELSE 'packing'
  END,
  updated_at = now()
  FROM item_status 
  WHERE orders.id = item_status.order_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic order stage updates
CREATE TRIGGER trigger_update_order_stage_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_stage_on_item_change();

-- Add index for better performance on packed/pending quantity queries
CREATE INDEX idx_order_items_quantities ON public.order_items(order_id, packed_quantity, pending_quantity);