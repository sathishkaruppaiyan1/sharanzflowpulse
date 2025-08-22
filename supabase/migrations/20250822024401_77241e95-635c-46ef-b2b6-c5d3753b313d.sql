
-- Create a table for delivery tracking details
CREATE TABLE public.delivery_tracking_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.delivery_tracking_details ENABLE ROW LEVEL SECURITY;

-- Create policy that allows all operations (since this is for delivery tracking)
CREATE POLICY "Allow all operations on delivery_tracking_details" 
  ON public.delivery_tracking_details 
  FOR ALL 
  USING (true)
  WITH CHECK (true);
