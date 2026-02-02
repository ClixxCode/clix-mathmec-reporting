-- Create deals table with direct contact linkage
CREATE TABLE public.hubspot_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id TEXT NOT NULL UNIQUE,
  deal_name TEXT,
  deal_stage TEXT,
  pipeline TEXT,
  amount NUMERIC,
  closed_amount NUMERIC,
  create_date TIMESTAMP WITH TIME ZONE,
  close_date TIMESTAMP WITH TIME ZONE,
  days_to_close INTEGER,
  deal_owner TEXT,
  associated_contact_id TEXT,
  original_traffic_source TEXT,
  traffic_source_drill_down_1 TEXT,
  traffic_source_drill_down_2 TEXT,
  ip_city TEXT,
  ip_state TEXT,
  ip_country TEXT,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hubspot_deals ENABLE ROW LEVEL SECURITY;

-- Create public access policy (matching contacts pattern)
CREATE POLICY "Allow public access to hubspot_deals"
ON public.hubspot_deals
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index on associated_contact_id for fast joins
CREATE INDEX idx_hubspot_deals_contact_id ON public.hubspot_deals(associated_contact_id);

-- Create index on deal_id for upserts
CREATE INDEX idx_hubspot_deals_deal_id ON public.hubspot_deals(deal_id);

-- Create trigger for updated_at
CREATE TRIGGER update_hubspot_deals_updated_at
BEFORE UPDATE ON public.hubspot_deals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();