-- Create table for Google Ads change history
CREATE TABLE public.google_ads_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  change_date timestamptz NOT NULL,
  user_email text,
  campaign text,
  ad_group text,
  change_description text NOT NULL,
  change_category text, -- 'keyword_added', 'keyword_removed', 'negative_keyword', 'bid_change', 'targeting', 'other'
  raw_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for AI-generated campaign narratives
CREATE TABLE public.campaign_narratives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year text NOT NULL, -- e.g., '2026-01'
  narrative_text text NOT NULL,
  ai_generated boolean NOT NULL DEFAULT true,
  is_edited boolean NOT NULL DEFAULT false,
  performance_context jsonb, -- Store spend, conversions, etc. used for generation
  change_summary jsonb, -- Summary of changes analyzed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(month_year)
);

-- Enable RLS
ALTER TABLE public.google_ads_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_narratives ENABLE ROW LEVEL SECURITY;

-- Public access policies (internal admin tool)
CREATE POLICY "Allow public access to google_ads_changes" 
ON public.google_ads_changes 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow public access to campaign_narratives" 
ON public.campaign_narratives 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Indexes for efficient querying
CREATE INDEX idx_google_ads_changes_date ON public.google_ads_changes(change_date);
CREATE INDEX idx_google_ads_changes_campaign ON public.google_ads_changes(campaign);
CREATE INDEX idx_google_ads_changes_category ON public.google_ads_changes(change_category);
CREATE INDEX idx_campaign_narratives_month ON public.campaign_narratives(month_year);

-- Trigger for updated_at on narratives
CREATE TRIGGER update_campaign_narratives_updated_at
BEFORE UPDATE ON public.campaign_narratives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();