-- Maritime Map: vessels, map_enquiries, port_pda tables
-- Note: using map_enquiries to avoid conflict with existing enquiries table

CREATE TABLE IF NOT EXISTS public.vessels (
  id uuid default gen_random_uuid() primary key,
  name text, imo text, type text,
  dwt_mt integer, open_port text,
  open_date date, lat numeric, lng numeric,
  region text, flag text, built_year integer,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.map_enquiries (
  id uuid default gen_random_uuid() primary key,
  ref_no text, cargo text,
  load_port text, load_lat numeric, load_lng numeric, load_region text,
  disch_port text, disch_lat numeric, disch_lng numeric, disch_region text,
  qty_mt integer, laycan text,
  charter_type text, status text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.port_pda (
  id uuid default gen_random_uuid() primary key,
  port_name text, country text, region text,
  lat numeric, lng numeric,
  port_dues numeric, pilotage numeric, towage numeric,
  agency_fees numeric, mooring numeric, misc numeric,
  created_at timestamptz default now()
);

-- RLS
ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.port_pda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_vessels" ON public.vessels FOR SELECT USING (true);
CREATE POLICY "public_read_map_enquiries" ON public.map_enquiries FOR SELECT USING (true);
CREATE POLICY "public_read_port_pda" ON public.port_pda FOR SELECT USING (true);

-- Seed vessels (8 records across regions)
INSERT INTO public.vessels (name, imo, type, dwt_mt, open_port, open_date, lat, lng, region, flag, built_year) VALUES
  ('MT GULF PEARL',    '9801001', 'Tanker',         75000,  'Fujairah',    CURRENT_DATE + 3,   25.12,  56.33,  'ME', 'Panama',     2019),
  ('MV ASIA STAR',     '9801002', 'Bulk Carrier',   62000,  'Singapore',   CURRENT_DATE + 5,    1.26, 103.84,  'SA', 'Marshall Is',2020),
  ('MT ORIENT SUN',    '9801003', 'Tanker',         50000,  'Yokohama',    CURRENT_DATE + 2,   35.44, 139.64,  'FE', 'Liberia',    2018),
  ('MV EURO TRADER',   '9801004', 'Bulk Carrier',   35000,  'Rotterdam',   CURRENT_DATE + 7,   51.90,   4.50,  'EU', 'Malta',      2021),
  ('MV ATLANTIC WING', '9801005', 'Bulk Carrier',   82000,  'Houston',     CURRENT_DATE + 4,   29.76, -95.36,  'AM', 'Bahamas',    2017),
  ('MT LAGOS WAVE',    '9801006', 'Tanker',         45000,  'Lagos',       CURRENT_DATE + 6,    6.45,   3.39,  'AF', 'Nigeria',    2022),
  ('MV PACIFIC CROWN', '9801007', 'Container',      28000,  'Busan',       CURRENT_DATE + 1,   35.10, 129.03,  'FE', 'Hong Kong',  2020),
  ('MT DESERT FALCON', '9801008', 'Tanker',        105000,  'Jebel Ali',   CURRENT_DATE + 8,   25.01,  55.06,  'ME', 'UAE',        2023);

-- Seed map_enquiries (8 records with realistic routes)
INSERT INTO public.map_enquiries (ref_no, cargo, load_port, load_lat, load_lng, load_region, disch_port, disch_lat, disch_lng, disch_region, qty_mt, laycan, charter_type, status) VALUES
  ('ENQ-2401', 'ULSD',       'Fujairah',   25.12,  56.33, 'ME', 'Zhoushan',   30.00, 122.10, 'FE', 65000,  'Mar 25-30', 'SPOT',  'open'),
  ('ENQ-2402', 'Naphtha',    'Singapore',   1.26, 103.84, 'SA', 'Chiba',      35.60, 140.10, 'FE', 40000,  'Mar 28-05 Apr', 'SPOT', 'open'),
  ('ENQ-2403', 'Crude Oil',  'Ras Tanura', 26.68,  50.16, 'ME', 'Sikka',      22.96,  69.84, 'SA', 95000,  'Apr 01-05', 'SPOT',  'pending'),
  ('ENQ-2404', 'Iron Ore',   'Tubarao',   -20.28, -40.25, 'AM', 'Qingdao',    36.07, 120.38, 'FE', 75000,  'Apr 05-10', 'VOY',   'open'),
  ('ENQ-2405', 'Fuel Oil',   'Rotterdam',  51.90,   4.50, 'EU', 'Lagos',       6.45,   3.39, 'AF', 30000,  'Mar 22-28', 'SPOT',  'fixed'),
  ('ENQ-2406', 'Wheat',      'Rouen',      49.44,   1.10, 'EU', 'Jeddah',     21.49,  39.17, 'ME', 25000,  'Apr 10-15', 'VOY',   'pending'),
  ('ENQ-2407', 'LPG',        'Yanbu',      24.09,  38.06, 'ME', 'Mumbai',     18.95,  72.84, 'SA', 44000,  'Mar 30-05 Apr', 'SPOT', 'open'),
  ('ENQ-2408', 'Jet Fuel',   'Houston',    29.76, -95.36, 'AM', 'Rotterdam',  51.90,   4.50, 'EU', 35000,  'Apr 08-12', 'SPOT',  'open');

-- Seed port_pda (8 ports with cost breakdown)
INSERT INTO public.port_pda (port_name, country, region, lat, lng, port_dues, pilotage, towage, agency_fees, mooring, misc) VALUES
  ('Fujairah',    'UAE',         'ME', 25.12,  56.33,  8500,  3200, 4500, 2800, 1200, 1500),
  ('Singapore',   'Singapore',   'SA',  1.26, 103.84, 12000,  4500, 6000, 3500, 1800, 2200),
  ('Yokohama',    'Japan',       'FE', 35.44, 139.64, 15000,  5500, 7000, 4200, 2000, 2800),
  ('Rotterdam',   'Netherlands', 'EU', 51.90,   4.50, 11000,  4000, 5500, 3200, 1500, 2000),
  ('Houston',     'USA',         'AM', 29.76, -95.36, 14000,  5000, 6500, 3800, 1700, 2500),
  ('Lagos',       'Nigeria',     'AF',  6.45,   3.39,  9000,  3500, 4800, 3000, 1300, 1800),
  ('Jebel Ali',   'UAE',         'ME', 25.01,  55.06,  9500,  3400, 4700, 2900, 1250, 1600),
  ('Busan',       'South Korea', 'FE', 35.10, 129.03, 10000,  3800, 5200, 3100, 1400, 1900);
