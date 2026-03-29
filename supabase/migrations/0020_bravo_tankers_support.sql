-- Dirty Baltic routes (TD indices from Bravo Tankers)
CREATE TABLE IF NOT EXISTS public.dirty_baltic_routes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date date NOT NULL,
  route text NOT NULL,              -- TD2, TD3C, TD6, TD9, TD20, TD22, TD25
  description text,                 -- e.g. "VLCC Middle East Gulf to Japan"
  size_mt text,                     -- e.g. "270,000MT"
  worldscale numeric,               -- WS value
  ws_change numeric,                -- daily WS change
  tc_earnings_usd numeric,          -- TCE $/day
  tc_change numeric,                -- daily TCE change
  source_broker text,               -- BRAVO_TANKERS
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dirty_baltic_unique
  ON public.dirty_baltic_routes (report_date, route, source_broker);
CREATE INDEX IF NOT EXISTS idx_dirty_baltic_date
  ON public.dirty_baltic_routes (report_date DESC);

ALTER TABLE public.dirty_baltic_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_dirty_baltic" ON public.dirty_baltic_routes FOR SELECT USING (true);
CREATE POLICY "auth_write_dirty_baltic" ON public.dirty_baltic_routes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_dirty_baltic" ON public.dirty_baltic_routes FOR UPDATE TO authenticated USING (true);

-- New port aliases for Bravo Tankers format
INSERT INTO public.port_aliases (canonical_name, alias) VALUES
  ('Hound Point', 'HP'),
  ('West Coast Norway', 'WCN'),
  ('East Coast Mexico', 'ECM'),
  ('Caribbean Sea', 'CBS'),
  ('Corpus Grande', 'C.GRANDE'),
  ('US East Coast', 'ECI'),
  ('US West Coast', 'WCI'),
  ('Transatlantic', 'TA'),
  ('Black Sea', 'B.SEA'),
  ('West Africa', 'WAFRICA'),
  ('Far East', 'F.EAST'),
  ('Baltic/Continent', 'BALTIC/CONT'),
  ('Red Sea', 'RSEA'),
  ('South America', 'S.AMERICA'),
  ('Indonesia', 'INDO')
ON CONFLICT (alias) DO NOTHING;

-- New charterer alias
INSERT INTO public.charterer_aliases (canonical_name, alias, source) VALUES
  ('PKN ORLEN', 'PKN', 'bravo_tankers')
ON CONFLICT (alias) DO NOTHING;
