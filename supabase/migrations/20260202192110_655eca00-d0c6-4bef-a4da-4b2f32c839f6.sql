-- Create table for daily Google Ads performance data
CREATE TABLE public.google_ads_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  campaign TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  avg_cpc DECIMAL(10, 2) DEFAULT 0,
  conversions DECIMAL(10, 2) NOT NULL DEFAULT 0,
  conversion_rate DECIMAL(5, 2) DEFAULT 0,
  cost_per_conversion DECIMAL(10, 2) DEFAULT 0,
  currency_code TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, campaign)
);

-- Enable RLS (but allow public read for dashboard)
ALTER TABLE public.google_ads_performance ENABLE ROW LEVEL SECURITY;

-- Allow public read access for dashboard
CREATE POLICY "Allow public read access"
ON public.google_ads_performance
FOR SELECT
USING (true);

-- Allow public insert for imports (via edge function)
CREATE POLICY "Allow public insert access"
ON public.google_ads_performance
FOR INSERT
WITH CHECK (true);

-- Create index for common queries
CREATE INDEX idx_google_ads_performance_date ON public.google_ads_performance(date);
CREATE INDEX idx_google_ads_performance_campaign ON public.google_ads_performance(campaign);