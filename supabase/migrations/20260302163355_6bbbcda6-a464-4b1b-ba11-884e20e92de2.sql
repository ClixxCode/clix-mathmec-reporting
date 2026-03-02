
CREATE POLICY "Allow public update access" ON public.google_ads_performance FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.google_ads_performance FOR DELETE USING (true);
