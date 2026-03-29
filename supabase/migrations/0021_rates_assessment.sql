-- Bravo Tankers rates assessment grid
CREATE TABLE IF NOT EXISTS public.rates_assessment (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date     date NOT NULL,
  source          text DEFAULT 'bravo_tankers',
  source_email    text,             -- 'fixtures' or 'rates_grid' to distinguish emails
  size_kt         integer,          -- 80, 130, 145 etc
  vessel_class    text,             -- derived from size_kt
  load_port       text,             -- normalised via port_aliases
  discharge_port  text,             -- normalised via port_aliases
  route_raw       text,             -- original e.g. "CPC/MED"
  rate_ws         numeric,          -- WS value if given
  rate_lumpsum    numeric,          -- $ value if given
  rate_type       text,             -- WS or LUMPSUM
  confidence      text,             -- FIRM / FIRM_TO_BE_TESTED / UNTESTED
  notes           text,             -- C/C, S/S, etc
  created_at      timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rates_assessment_unique
  ON public.rates_assessment (report_date, source, size_kt, route_raw);
CREATE INDEX IF NOT EXISTS idx_rates_assessment_date
  ON public.rates_assessment (report_date DESC);

ALTER TABLE public.rates_assessment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_rates_assessment" ON public.rates_assessment FOR SELECT USING (true);
CREATE POLICY "auth_write_rates_assessment" ON public.rates_assessment FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_rates_assessment" ON public.rates_assessment FOR UPDATE TO authenticated USING (true);

-- Add source_email to baltic_routes and dirty_baltic_routes
ALTER TABLE public.baltic_routes ADD COLUMN IF NOT EXISTS source_email text;
ALTER TABLE public.dirty_baltic_routes ADD COLUMN IF NOT EXISTS source_email text;
