-- Create hubspot_contacts table with hybrid schema approach
CREATE TABLE public.hubspot_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  email text,
  phone_number text,
  company_name text,
  city text,
  state_region text,
  country text,
  original_traffic_source text,
  traffic_source_drill_down_1 text,
  traffic_source_drill_down_2 text,
  lifecycle_stage text,
  lead_status text,
  message text,
  hubspot_create_date timestamptz,
  quality_score integer,
  quality_analysis jsonb,
  raw_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_hubspot_contacts_traffic_source ON public.hubspot_contacts(original_traffic_source);
CREATE INDEX idx_hubspot_contacts_create_date ON public.hubspot_contacts(hubspot_create_date);
CREATE INDEX idx_hubspot_contacts_quality_score ON public.hubspot_contacts(quality_score);
CREATE INDEX idx_hubspot_contacts_record_id ON public.hubspot_contacts(record_id);

-- Enable RLS
ALTER TABLE public.hubspot_contacts ENABLE ROW LEVEL SECURITY;

-- Create public access policy for internal admin use
CREATE POLICY "Allow public access to hubspot contacts"
  ON public.hubspot_contacts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_hubspot_contacts_updated_at
  BEFORE UPDATE ON public.hubspot_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();