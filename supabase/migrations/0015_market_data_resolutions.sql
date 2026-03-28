CREATE TABLE IF NOT EXISTS public.market_data_resolutions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vessel_name text NOT NULL,
  report_date date NOT NULL,
  field_name text NOT NULL,
  resolved_value text,
  remark text,
  resolved_by uuid REFERENCES public.crm_users(id),
  resolved_by_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resolutions_vessel_date ON public.market_data_resolutions (vessel_name, report_date);

ALTER TABLE public.market_data_resolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_resolutions" ON public.market_data_resolutions FOR SELECT USING (true);
CREATE POLICY "authenticated_write_resolutions" ON public.market_data_resolutions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_resolutions" ON public.market_data_resolutions FOR UPDATE TO authenticated USING (true);
