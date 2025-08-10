
-- Create table for storing Parcel Panel analytics data
CREATE TABLE public.parcel_panel_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  delivered_orders INTEGER DEFAULT 0,
  in_transit_orders INTEGER DEFAULT 0,
  out_for_delivery_orders INTEGER DEFAULT 0,
  exception_orders INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,2) DEFAULT 0,
  avg_delivery_time_days DECIMAL(5,2) DEFAULT 0,
  top_carriers JSONB DEFAULT '[]'::jsonb,
  top_destinations JSONB DEFAULT '[]'::jsonb,
  status_breakdown JSONB DEFAULT '{}'::jsonb,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_parcel_panel_analytics_date ON public.parcel_panel_analytics(date);

-- Enable RLS
ALTER TABLE public.parcel_panel_analytics ENABLE ROW LEVEL SECURITY;

-- Create policy for full access (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on parcel_panel_analytics" 
  ON public.parcel_panel_analytics 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER handle_updated_at_parcel_panel_analytics
  BEFORE UPDATE ON public.parcel_panel_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
