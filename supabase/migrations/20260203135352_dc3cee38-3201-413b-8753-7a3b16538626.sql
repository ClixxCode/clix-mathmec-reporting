-- Add UPDATE and DELETE policies for google_ads_geo_performance
CREATE POLICY "Allow public update access" 
ON public.google_ads_geo_performance 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete access" 
ON public.google_ads_geo_performance 
FOR DELETE 
USING (true);