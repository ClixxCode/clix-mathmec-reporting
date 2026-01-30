-- Create table to store data source configurations
CREATE TABLE public.data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'google_ads', 'call_tracking_metrics', 'csv_upload'
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public read/write since no auth needed
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

-- Allow all operations since this is an internal admin tool
CREATE POLICY "Allow public access to data sources"
ON public.data_sources
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_data_sources_updated_at
BEFORE UPDATE ON public.data_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default data sources
INSERT INTO public.data_sources (name, type, is_connected) VALUES
  ('Google Ads', 'google_ads', false),
  ('Call Tracking Metrics', 'call_tracking_metrics', false);