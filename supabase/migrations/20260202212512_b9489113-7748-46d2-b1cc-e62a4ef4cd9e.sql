-- Add column for user-uploaded document content (overrides AI when present)
ALTER TABLE public.campaign_narratives
ADD COLUMN uploaded_content TEXT DEFAULT NULL;

-- Add column to track when document was uploaded
ALTER TABLE public.campaign_narratives
ADD COLUMN uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add column for original filename reference
ALTER TABLE public.campaign_narratives
ADD COLUMN uploaded_filename TEXT DEFAULT NULL;