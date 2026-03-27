-- Market data table for storing structured fixture/enquiry rows
-- parsed from daily PDF broker reports (Meiwa VLCC, Meiwa Dirty,
-- Presco, Gibson, Vantage DPP).

CREATE TABLE IF NOT EXISTS public.market_data (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Report metadata
  report_source text        NOT NULL,  -- e.g. 'meiwa_vlcc', 'meiwa_dirty', 'presco', 'gibson', 'vantage_dpp'
  report_date   date        NOT NULL,  -- date the broker report covers
  raw_text      text,                  -- original line from PDF (for audit / re-parsing)

  -- Vessel
  vessel_name   text,
  vessel_class  text,                  -- VLCC | Suezmax | Aframax | MR | LR1 | LR2
  dwt           integer,
  built_year    integer,
  flag          text,
  owner         text,

  -- Cargo
  charterer     text,
  cargo_grade   text,                  -- e.g. 'Arabian Light', 'Naphtha', 'Fuel Oil 380'
  cargo_type    text,                  -- Crude | CPP | DPP | Chemical | LPG
  quantity_mt   integer,
  quantity_cbm  integer,

  -- Route
  load_port     text,
  load_region   text,                  -- AG | WAF | USG | UKC | MED | FE | SA | etc.
  discharge_port text,
  discharge_region text,

  -- Laycan
  laycan_from   date,
  laycan_to     date,

  -- Rate
  rate_type     text,                  -- WS | lumpsum | per_mt | tce
  rate_value    text,                  -- stored as text to handle 'WS 72', '$850k', '$28/MT'
  rate_numeric  numeric,               -- parsed numeric (WS points or USD amount) for sorting/filtering

  -- Status
  fixture_status text   DEFAULT 'reported',  -- reported | fixed | on_subs | failed | withdrawn

  -- Broker / source
  broker        text,

  -- Parsing audit
  confidence    numeric,               -- 0-1 score from Claude extraction
  uploaded_by   uuid     REFERENCES public.crm_users(id),
  pdf_filename  text,

  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Indexes for common access patterns
CREATE INDEX idx_market_data_report_date    ON public.market_data (report_date DESC);
CREATE INDEX idx_market_data_vessel_class   ON public.market_data (vessel_class);
CREATE INDEX idx_market_data_source_date    ON public.market_data (report_source, report_date DESC);
CREATE INDEX idx_market_data_fixture_status ON public.market_data (fixture_status);
CREATE INDEX idx_market_data_load_region    ON public.market_data (load_region);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_market_data_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_market_data_updated_at
  BEFORE UPDATE ON public.market_data
  FOR EACH ROW EXECUTE FUNCTION public.set_market_data_updated_at();

-- RLS
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "authenticated_read_market_data"
  ON public.market_data FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert (edge function uses service_role key, bypasses RLS)
CREATE POLICY "admin_insert_market_data"
  ON public.market_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role = 'admin')
    OR uploaded_by IS NULL  -- allow service_role inserts (edge function)
  );

-- Only admins can update
CREATE POLICY "admin_update_market_data"
  ON public.market_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can delete
CREATE POLICY "admin_delete_market_data"
  ON public.market_data FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role = 'admin')
  );
