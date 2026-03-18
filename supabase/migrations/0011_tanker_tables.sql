-- Tanker-specific tables for chartering

CREATE TABLE IF NOT EXISTS public.tanker_vessels (
  id uuid default gen_random_uuid() primary key,
  vessel_name text,
  imo text,
  vessel_class text,
  cargo_type text,
  dwt_mt integer,
  cbm integer,
  built_year integer,
  flag text,
  owner text,
  open_port text,
  open_area text,
  open_date date,
  lat numeric,
  lng numeric,
  region text,
  last_cargo text,
  coated text,
  heating boolean,
  ice_class text,
  status text,
  tc_rate_usd integer,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.tanker_enquiries (
  id uuid default gen_random_uuid() primary key,
  ref_no text,
  charterer text,
  cargo_grade text,
  cargo_category text,
  quantity_mt integer,
  quantity_cbm integer,
  load_port text,
  load_area text,
  load_lat numeric,
  load_lng numeric,
  load_region text,
  disch_port text,
  disch_area text,
  disch_lat numeric,
  disch_lng numeric,
  disch_region text,
  laycan_from date,
  laycan_to date,
  charter_type text,
  freight_type text,
  freight_indication text,
  demurrage_rate integer,
  status text,
  broker text,
  special_requirements text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.voyage_calculations (
  id uuid default gen_random_uuid() primary key,
  enquiry_id uuid references tanker_enquiries(id),
  vessel_id uuid references tanker_vessels(id),
  load_port text,
  disch_port text,
  distance_nm integer,
  sea_days numeric,
  port_days_load numeric,
  port_days_disch numeric,
  bunker_ifo_mt numeric,
  bunker_mgo_mt numeric,
  ifo_price_usd numeric,
  mgo_price_usd numeric,
  bunker_cost numeric,
  port_cost_load numeric,
  port_cost_disch numeric,
  canal_dues numeric,
  total_voyage_cost numeric,
  freight_revenue numeric,
  tce_usd_day numeric,
  created_at timestamptz default now()
);

-- RLS
ALTER TABLE public.tanker_vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tanker_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voyage_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_tanker_vessels" ON public.tanker_vessels FOR SELECT USING (true);
CREATE POLICY "public_read_tanker_enquiries" ON public.tanker_enquiries FOR SELECT USING (true);
CREATE POLICY "public_read_voyage_calculations" ON public.voyage_calculations FOR SELECT USING (true);
CREATE POLICY "authenticated_insert_voyage_calculations" ON public.voyage_calculations FOR INSERT WITH CHECK (true);

-- Seed tanker_vessels
INSERT INTO public.tanker_vessels (vessel_name, imo, vessel_class, cargo_type, dwt_mt, cbm, built_year, flag, owner, open_port, open_area, open_date, lat, lng, region, last_cargo, coated, heating, status) VALUES
('MT Khalij Pioneer', '9234501', 'VLCC', 'Crude', 298000, 340000, 2019, 'Marshall Islands', 'Gulf Tankers', 'Ras Tanura', 'AG', CURRENT_DATE + 5, 26.65, 50.16, 'ME', 'Arabian Light', 'None', false, 'available'),
('MT Oceanic Virtue', '9345612', 'Suezmax', 'Crude', 158000, 180000, 2020, 'Greece', 'Olympic Tankers', 'Fujairah', 'AG', CURRENT_DATE + 3, 25.12, 56.34, 'ME', 'Basra Light', 'None', false, 'available'),
('MT Pacific Harmony', '9456723', 'Aframax', 'DPP', 115000, 128000, 2018, 'Panama', 'Pacific Carriers', 'Singapore', 'Singapore', CURRENT_DATE + 4, 1.29, 103.85, 'SA', 'Fuel Oil 380', 'None', true, 'available'),
('MT Clean Breeze', '9567834', 'LR2', 'CPP', 110000, 125000, 2021, 'Hong Kong', 'Eastern Petroleum', 'Fujairah', 'AG', CURRENT_DATE + 2, 25.12, 56.34, 'ME', 'Naphtha', 'Epoxy', false, 'available'),
('MT Nordic Trader', '9678945', 'MR', 'CPP', 50000, 57000, 2022, 'Norway', 'Nordic Tankers', 'Rotterdam', 'ARA', CURRENT_DATE + 7, 51.9, 4.5, 'EU', 'Jet A1', 'Epoxy', false, 'available'),
('MT Gulf Express', '9789056', 'LR1', 'CPP', 74000, 85000, 2020, 'UAE', 'Emirates Maritime', 'Singapore', 'Singapore', CURRENT_DATE + 1, 1.29, 103.85, 'SA', 'Gasoil', 'Epoxy', false, 'available'),
('MT Chem Star', '9890167', 'Chemical', 'Chemical', 25000, 30000, 2021, 'Japan', 'Iino Lines', 'Yokohama', 'Japan', CURRENT_DATE + 6, 35.44, 139.64, 'FE', 'Methanol', 'Stainless', false, 'available'),
('MT Atlas Voyager', '9901278', 'VLGC', 'LPG', 84000, 98000, 2023, 'South Korea', 'Avance Gas', 'Ras Tanura', 'AG', CURRENT_DATE + 3, 26.65, 50.16, 'ME', 'Propane', 'None', false, 'available');

-- Seed tanker_enquiries
INSERT INTO public.tanker_enquiries (ref_no, charterer, cargo_grade, cargo_category, quantity_mt, quantity_cbm, load_port, load_area, load_lat, load_lng, load_region, disch_port, disch_area, disch_lat, disch_lng, disch_region, laycan_from, laycan_to, charter_type, freight_type, freight_indication, demurrage_rate, status, broker) VALUES
('ENQ-T001', 'Shell Trading', 'Arabian Light Crude', 'Crude', 270000, 310000, 'Ras Tanura', 'AG', 26.65, 50.16, 'ME', 'Ningbo, China', 'Far East', 29.87, 121.55, 'FE', CURRENT_DATE + 10, CURRENT_DATE + 14, 'Voyage', 'WS', 'WS 72', 65000, 'open', 'Galbraith'),
('ENQ-T002', 'Vitol', 'Basra Light Crude', 'Crude', 140000, 160000, 'Basra, Iraq', 'AG', 29.52, 48.18, 'ME', 'Rotterdam', 'ARA', 51.9, 4.5, 'EU', CURRENT_DATE + 7, CURRENT_DATE + 11, 'Voyage', 'WS', 'WS 85', 55000, 'open', 'Braemar'),
('ENQ-T003', 'Trafigura', 'Naphtha', 'CPP', 90000, 105000, 'Jubail, KSA', 'AG', 27.0, 49.65, 'ME', 'Chiba, Japan', 'Far East', 35.59, 140.07, 'FE', CURRENT_DATE + 5, CURRENT_DATE + 9, 'Voyage', 'WS', 'WS 120', 30000, 'open', 'Poten'),
('ENQ-T004', 'BP Oil', 'Jet A1', 'CPP', 38000, 44000, 'Fujairah', 'AG', 25.12, 56.34, 'ME', 'Mumbai', 'India', 18.92, 72.83, 'ME', CURRENT_DATE + 2, CURRENT_DATE + 5, 'Voyage', 'Lumpsum', '$850,000', 20000, 'on_subs', 'SSY'),
('ENQ-T005', 'Glencore', 'Fuel Oil 380', 'DPP', 80000, 88000, 'Singapore', 'Singapore', 1.29, 103.85, 'SA', 'Guangzhou, China', 'Far East', 23.1, 113.3, 'FE', CURRENT_DATE + 12, CURRENT_DATE + 16, 'Voyage', 'Lumpsum', '$1.2M', 28000, 'open', 'Howe Robinson'),
('ENQ-T006', 'Mitsui', 'Propane (LPG)', 'LPG', 44000, 98000, 'Ras Tanura', 'AG', 26.65, 50.16, 'ME', 'Chiba, Japan', 'Far East', 35.59, 140.07, 'FE', CURRENT_DATE + 8, CURRENT_DATE + 12, 'Voyage', 'Per MT', '$28/MT', 35000, 'open', 'Clarksons'),
('ENQ-T007', 'Total Energies', 'Methanol', 'Chemical', 18000, 22500, 'Rotterdam', 'ARA', 51.9, 4.5, 'EU', 'Lagos, Nigeria', 'WAF', 6.45, 3.4, 'AF', CURRENT_DATE + 14, CURRENT_DATE + 18, 'Voyage', 'Lumpsum', '$680,000', 18000, 'open', 'Fearnley'),
('ENQ-T008', 'CEPSA', 'Gasoil', 'CPP', 55000, 63000, 'Rotterdam', 'ARA', 51.9, 4.5, 'EU', 'Dakar, Senegal', 'WAF', 14.73, -17.47, 'AF', CURRENT_DATE + 10, CURRENT_DATE + 14, 'Voyage', 'WS', 'WS 145', 22000, 'open', 'Poten');
