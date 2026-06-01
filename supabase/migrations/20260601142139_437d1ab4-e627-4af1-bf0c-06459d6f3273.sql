CREATE TABLE public.hubspot_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id TEXT NOT NULL UNIQUE,
  lead_name TEXT,
  lead_stage TEXT,
  disqualification_reason TEXT,
  product_requested TEXT,
  lead_source TEXT,
  lead_owner TEXT,
  associated_contact_id TEXT,
  hubspot_create_date TIMESTAMP WITH TIME ZONE,
  first_outreach_date TIMESTAMP WITH TIME ZONE,
  time_to_first_touch TEXT,
  open_deal_amount NUMERIC,
  closed_won_amount NUMERIC,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hubspot_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hubspot_leads TO authenticated;
GRANT ALL ON public.hubspot_leads TO service_role;

ALTER TABLE public.hubspot_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to hubspot_leads"
ON public.hubspot_leads
FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE INDEX idx_hubspot_leads_contact_id ON public.hubspot_leads(associated_contact_id);
CREATE INDEX idx_hubspot_leads_create_date ON public.hubspot_leads(hubspot_create_date);
CREATE INDEX idx_hubspot_leads_source ON public.hubspot_leads(lead_source);

CREATE TRIGGER update_hubspot_leads_updated_at
BEFORE UPDATE ON public.hubspot_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();