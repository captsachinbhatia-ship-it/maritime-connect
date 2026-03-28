-- Extend market_data to support structured report sections:
-- Baltic routes, fixtures, enquiries, bunker prices

-- report_type: CPP / DPP / SNP / CHEMICAL
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS report_type text;

-- record_type: FIXTURE / ENQUIRY / BALTIC / BUNKER
-- (existing rows are all FIXTURE — backfill below)
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS record_type text DEFAULT 'FIXTURE';

-- Baltic route fields
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS baltic_route text;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS baltic_description text;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS baltic_size text;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS world_scale numeric;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS tc_earnings numeric;

-- Bunker price fields
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS bunker_region text;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS vlsfo_price numeric;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS vlsfo_change numeric;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS ifo380_price numeric;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS ifo380_change numeric;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS mgo_price numeric;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS mgo_change numeric;

-- source_broker: explicit broker name (Meiwa/Presco/Gibson/Vantage/Eastport/Yamamoto/Alliance)
-- We already have report_source, but this is the display-friendly name.
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS source_broker text;

-- Indexes for the new access patterns
CREATE INDEX IF NOT EXISTS idx_market_data_report_type  ON public.market_data (report_type);
CREATE INDEX IF NOT EXISTS idx_market_data_record_type  ON public.market_data (record_type);
CREATE INDEX IF NOT EXISTS idx_market_data_type_date    ON public.market_data (report_type, report_date DESC);

-- Backfill existing rows:
-- 1. record_type = 'FIXTURE' for all existing data
UPDATE public.market_data SET record_type = 'FIXTURE' WHERE record_type IS NULL;

-- 2. Infer report_type from cargo_type for existing rows
UPDATE public.market_data SET report_type = 'DPP'
  WHERE report_type IS NULL AND cargo_type IN ('Crude', 'DPP');
UPDATE public.market_data SET report_type = 'CPP'
  WHERE report_type IS NULL AND cargo_type IN ('CPP', 'Chemical', 'LPG', 'LNG', 'Vegetable Oil');
UPDATE public.market_data SET report_type = 'DPP'
  WHERE report_type IS NULL; -- default remaining to DPP

-- 3. Copy report_source to source_broker for existing rows
UPDATE public.market_data SET source_broker = report_source WHERE source_broker IS NULL;
