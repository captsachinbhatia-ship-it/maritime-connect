-- Composite index for fast dedup lookups in the edge function
CREATE INDEX IF NOT EXISTS idx_market_data_dedup_lookup
  ON public.market_data (report_source, report_date, vessel_name);
