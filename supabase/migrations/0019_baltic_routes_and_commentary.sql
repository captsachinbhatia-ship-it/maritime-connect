-- Dedicated baltic_routes table (separate from market_data BALTIC records)
-- Stores Baltic Exchange TC route indices with change values

CREATE TABLE IF NOT EXISTS public.baltic_routes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date date NOT NULL,
  route text NOT NULL,               -- TC5, TC8, TC12, TC17
  description text,                  -- e.g. "MEG-JAPAN 55,000MT"
  size_mt text,                      -- e.g. "55,000MT"
  worldscale numeric,                -- e.g. 426.25
  ws_change numeric,                 -- e.g. +5.00 or -3.50
  tc_earnings_usd numeric,           -- e.g. 73205
  tc_change numeric,                 -- e.g. +2865 or -1200
  source_broker text,                -- which report provided this
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_baltic_routes_unique
  ON public.baltic_routes (report_date, route, source_broker);
CREATE INDEX IF NOT EXISTS idx_baltic_routes_date
  ON public.baltic_routes (report_date DESC);

ALTER TABLE public.baltic_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_baltic_routes" ON public.baltic_routes FOR SELECT USING (true);
CREATE POLICY "authenticated_write_baltic_routes" ON public.baltic_routes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_baltic_routes" ON public.baltic_routes FOR UPDATE TO authenticated USING (true);

-- Commentary cache for PDF section summaries
CREATE TABLE IF NOT EXISTS public.report_section_commentary (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date date NOT NULL,
  report_type text NOT NULL,          -- CPP / DPP
  section_key text NOT NULL,          -- e.g. "MR-MEG - RSEA - INDIA"
  commentary text,                    -- one-line AI-generated summary
  generated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commentary_unique
  ON public.report_section_commentary (report_date, report_type, section_key);

ALTER TABLE public.report_section_commentary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_commentary" ON public.report_section_commentary FOR SELECT USING (true);
CREATE POLICY "authenticated_write_commentary" ON public.report_section_commentary FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_commentary" ON public.report_section_commentary FOR UPDATE TO authenticated USING (true);
