-- ============================================================
-- NORMALISATION LAYER: aliases, vessel registry, repeat detection
-- ============================================================

-- 1. Charterer aliases — many-to-one mapping
CREATE TABLE IF NOT EXISTS public.charterer_aliases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_name text NOT NULL,
  alias text NOT NULL UNIQUE, -- the variant spelling
  source text, -- which broker typically uses this spelling
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_charterer_alias ON public.charterer_aliases (lower(alias));
CREATE INDEX IF NOT EXISTS idx_charterer_canonical ON public.charterer_aliases (lower(canonical_name));

-- Seed common variants
INSERT INTO public.charterer_aliases (canonical_name, alias, source) VALUES
  ('ECOPETROL', 'ECOPET', 'presco'),
  ('ECOPETROL', 'ECO PETROL', NULL),
  ('INDIAN OIL', 'IOC', NULL),
  ('INDIAN OIL', 'IOCL', NULL),
  ('HINDUSTAN PETROLEUM', 'HPCL', NULL),
  ('HINDUSTAN PETROLEUM', 'HINPET', NULL),
  ('BHARAT PETROLEUM', 'BPCL', NULL),
  ('SHELL', 'SHELL TRADING', NULL),
  ('SHELL', 'STASCO', NULL),
  ('BP', 'BP OIL', NULL),
  ('BP', 'BP SHIPPING', NULL),
  ('TOTAL', 'TOTAL ENERGIES', NULL),
  ('TOTAL', 'TOTALENERGIES', NULL),
  ('VITOL', 'VITOL SA', NULL),
  ('VITOL', 'VITOL ASIA', NULL),
  ('TRAFIGURA', 'TRAF', NULL),
  ('RELIANCE', 'RIL', NULL),
  ('RELIANCE', 'RELIANCE INDUSTRIES', NULL),
  ('UNIPEC', 'UNIPEC ASIA', NULL),
  ('PETROCHINA', 'PCIC', NULL),
  ('SK ENERGY', 'SK', NULL),
  ('KOCH', 'KOCH SUPPLY', NULL),
  ('GUNVOR', 'GUNVOR SA', NULL),
  ('MERCURIA', 'MERCURIA ENERGY', NULL),
  ('LITASCO', 'LITASCO SA', NULL),
  ('GLENCORE', 'GLEN', NULL),
  ('CEPSA', 'CEPSA TRADING', NULL),
  ('PERTAMINA', 'PERTAMINA ENERGY', NULL),
  ('ARAMCO', 'SAUDI ARAMCO', NULL),
  ('ARAMCO', 'ARAMCO TRADING', NULL),
  ('ADNOC', 'ADNOC L&S', NULL),
  ('CHEVRON', 'CHEVRON SHIPPING', NULL),
  ('EXXONMOBIL', 'EXXON', NULL),
  ('EXXONMOBIL', 'MOBIL', NULL),
  ('MITSUI', 'MITSUI & CO', NULL),
  ('CARGILL', 'CARGILL OIL', NULL),
  ('COSMO', 'COSMO OIL', NULL),
  ('ENEOS', 'JXTG', NULL),
  ('HENGLI', 'HENGLI PETROCHEM', NULL),
  ('RONGSHENG', 'RONGSHENG PETROCHEM', NULL)
ON CONFLICT (alias) DO NOTHING;

-- 2. Port aliases — many-to-one mapping
CREATE TABLE IF NOT EXISTS public.port_aliases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_name text NOT NULL,
  alias text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_port_alias ON public.port_aliases (lower(alias));
CREATE INDEX IF NOT EXISTS idx_port_canonical ON public.port_aliases (lower(canonical_name));

-- Seed common port abbreviations
INSERT INTO public.port_aliases (canonical_name, alias) VALUES
  -- Singapore
  ('SINGAPORE', 'SPORE'),
  ('SINGAPORE', 'SIN'),
  ('SINGAPORE', 'SGP'),
  ('SINGAPORE', 'S''PORE'),
  -- Australia
  ('AUSTRALIA', 'OZ'),
  ('AUSTRALIA', 'AUSSIE'),
  ('AUSTRALIA', 'AUS'),
  -- Middle East / AG
  ('MEG', 'AG'),
  ('MEG', 'ARABIAN GULF'),
  ('MEG', 'PERSIAN GULF'),
  ('FUJAIRAH', 'FUJ'),
  ('FUJAIRAH', 'FUJI'),
  ('RAS TANURA', 'RT'),
  ('RAS TANURA', 'RASTANURA'),
  ('JEBEL ALI', 'JA'),
  ('JEBEL ALI', 'JEBEL DHANNA'),
  ('BASRA', 'BASRAH'),
  ('BASRA', 'BSR'),
  ('JUBAIL', 'JBL'),
  -- Far East
  ('EAST', 'FAR EAST'),
  ('EAST', 'FE'),
  ('EAST', 'FEAST'),
  ('CHINA', 'PRC'),
  ('JAPAN', 'JPN'),
  ('SOUTH KOREA', 'SKOREA'),
  ('SOUTH KOREA', 'S.KOREA'),
  ('TAIWAN', 'TWN'),
  ('YOKOHAMA', 'YOKO'),
  ('CHIBA', 'CHB'),
  -- India
  ('INDIA', 'IND'),
  ('MUMBAI', 'BOMBAY'),
  ('MUMBAI', 'MUM'),
  ('SIKKA', 'VADINAR'),
  -- Europe
  ('ROTTERDAM', 'RDAM'),
  ('ROTTERDAM', 'RTM'),
  ('AMSTERDAM', 'AMS'),
  ('ARA', 'ANTWERP-ROTTERDAM-AMSTERDAM'),
  ('UKC', 'UK CONTINENT'),
  ('UKC', 'UK-CONT'),
  ('MED', 'MEDITERRANEAN'),
  -- West Africa
  ('WAF', 'WEST AFRICA'),
  ('WAF', 'WAFR'),
  ('LAGOS', 'LOS'),
  ('BONNY', 'BNNY'),
  -- Americas
  ('USG', 'US GULF'),
  ('USG', 'USGC'),
  ('HOUSTON', 'HOU'),
  ('CARIBS', 'CARIBBEAN'),
  ('CARIBS', 'CARIB'),
  ('ECSA', 'EAST COAST SOUTH AMERICA'),
  ('BRAZIL', 'BRZ'),
  -- Black Sea
  ('BSEA', 'BLACK SEA'),
  ('BSEA', 'BLSEA'),
  ('NOVOROSSIYSK', 'NOVO'),
  ('NOVOROSSIYSK', 'NVRS'),
  -- Southeast Asia
  ('RSEA', 'RED SEA'),
  ('RSEA', 'REDSEA')
ON CONFLICT (alias) DO NOTHING;

-- 3. Vessel registry — learned vessel types
CREATE TABLE IF NOT EXISTS public.vessel_registry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vessel_name text NOT NULL UNIQUE,
  vessel_type text, -- e.g. VLCC, Suezmax, Aframax, MR ...
  dwt integer,
  built_year integer,
  flag text,
  owner text,
  confirmed_by_user boolean DEFAULT false,
  confirmed_by uuid REFERENCES public.crm_users(id),
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vessel_registry_name ON public.vessel_registry (lower(vessel_name));

-- RLS for all three tables
ALTER TABLE public.charterer_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.port_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_charterer_aliases" ON public.charterer_aliases FOR SELECT USING (true);
CREATE POLICY "authenticated_write_charterer_aliases" ON public.charterer_aliases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_charterer_aliases" ON public.charterer_aliases FOR UPDATE TO authenticated USING (true);

CREATE POLICY "public_read_port_aliases" ON public.port_aliases FOR SELECT USING (true);
CREATE POLICY "authenticated_write_port_aliases" ON public.port_aliases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_port_aliases" ON public.port_aliases FOR UPDATE TO authenticated USING (true);

CREATE POLICY "public_read_vessel_registry" ON public.vessel_registry FOR SELECT USING (true);
CREATE POLICY "authenticated_write_vessel_registry" ON public.vessel_registry FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_vessel_registry" ON public.vessel_registry FOR UPDATE TO authenticated USING (true);

-- 4. Add normalisation columns to market_data
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS rate_ws numeric;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS rate_lumpsum numeric;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS is_repeat boolean DEFAULT false;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS repeat_of_id uuid REFERENCES public.market_data(id);
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS status_discrepancy boolean DEFAULT false;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS normalised_charterer text;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS normalised_load_port text;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS normalised_discharge_port text;
ALTER TABLE public.market_data ADD COLUMN IF NOT EXISTS vessel_type_mismatch boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_market_data_repeat ON public.market_data (is_repeat) WHERE is_repeat = true;
CREATE INDEX IF NOT EXISTS idx_market_data_status_disc ON public.market_data (status_discrepancy) WHERE status_discrepancy = true;
CREATE INDEX IF NOT EXISTS idx_market_data_vessel_type_mm ON public.market_data (vessel_type_mismatch) WHERE vessel_type_mismatch = true;
CREATE INDEX IF NOT EXISTS idx_market_data_norm_charterer ON public.market_data (normalised_charterer);
