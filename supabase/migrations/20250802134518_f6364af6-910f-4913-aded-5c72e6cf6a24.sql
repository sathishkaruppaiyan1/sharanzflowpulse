
-- Create order_tracking_details table for storing tracking information
CREATE TABLE public.order_tracking_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tracking_number TEXT,
  courier_code TEXT,
  courier_name TEXT,
  status TEXT,
  sub_status TEXT,
  origin_country TEXT,
  destination_country TEXT,
  estimated_delivery_date TEXT,
  delivered_at TEXT,
  shipped_at TEXT,
  tracking_events JSONB DEFAULT '[]'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Add RLS policies for order_tracking_details
ALTER TABLE public.order_tracking_details ENABLE ROW LEVEL SECURITY;

-- Allow all operations on order_tracking_details
CREATE POLICY "Allow all operations on order_tracking_details" 
  ON public.order_tracking_details 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at_order_tracking_details
  BEFORE UPDATE ON public.order_tracking_details
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
