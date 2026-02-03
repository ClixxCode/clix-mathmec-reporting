-- Create table for Google Ads geo performance data
CREATE TABLE public.google_ads_geo_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_month DATE NOT NULL,
  metro_area TEXT NOT NULL,
  location TEXT NOT NULL,
  region TEXT,
  conversions NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  cost_per_conversion NUMERIC,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC,
  impressions INTEGER NOT NULL DEFAULT 0,
  currency_code TEXT DEFAULT 'USD',
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_month, metro_area, region)
);

-- Enable Row Level Security
ALTER TABLE public.google_ads_geo_performance ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access" 
ON public.google_ads_geo_performance 
FOR SELECT 
USING (true);

-- Create policy for public insert access
CREATE POLICY "Allow public insert access" 
ON public.google_ads_geo_performance 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster month-based queries
CREATE INDEX idx_geo_performance_month ON public.google_ads_geo_performance(report_month);
CREATE INDEX idx_geo_performance_location ON public.google_ads_geo_performance(location);