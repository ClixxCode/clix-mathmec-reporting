-- Create table to store CTM calls with transcripts/summaries
CREATE TABLE public.ctm_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id TEXT NOT NULL UNIQUE,
  caller_number TEXT,
  tracking_number TEXT,
  duration INTEGER DEFAULT 0,
  talk_time INTEGER DEFAULT 0,
  answered BOOLEAN DEFAULT false,
  called_at TIMESTAMP WITH TIME ZONE,
  source TEXT,
  score INTEGER,
  recording_url TEXT,
  transcript TEXT,
  ai_summary TEXT,
  gclid TEXT,
  campaign TEXT,
  location_url TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ctm_calls ENABLE ROW LEVEL SECURITY;

-- Allow public access (same pattern as other tables)
CREATE POLICY "Allow public access to ctm_calls"
ON public.ctm_calls
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index on caller_number for matching to contacts
CREATE INDEX idx_ctm_calls_caller_number ON public.ctm_calls(caller_number);

-- Create index on called_at for date filtering
CREATE INDEX idx_ctm_calls_called_at ON public.ctm_calls(called_at);

-- Add updated_at trigger
CREATE TRIGGER update_ctm_calls_updated_at
BEFORE UPDATE ON public.ctm_calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();