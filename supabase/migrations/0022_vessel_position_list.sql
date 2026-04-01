-- Migration: vessel_position_list
-- Stores structured vessel position data imported from owner/operator
-- daily position list emails (Fearnleys, Heidmar, Maersk, Hafnia, etc.)

CREATE TABLE IF NOT EXISTS public.vessel_position_list (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Source metadata
  report_date       date        NOT NULL DEFAULT CURRENT_DATE,
  source_name       text,       -- e.g. 'Heidmar', 'Maersk Tankers', 'Hafnia'
  source_email      text,       -- sender email address
  email_subject     text,       -- original email subject
  thread_id         text,       -- Gmail thread ID for deduplication
  import_method     text        DEFAULT 'email_scan', -- 'email_scan' | 'manual' | 'upload'
  imported_by       uuid        REFERENCES public.crm_users(id),

  -- Vessel identity
  vessel_name       text        NOT NULL,
  imo               text,
  vessel_class      text,       -- VLCC | Suezmax | Aframax | LR2 | LR1 | MR | Handy | Specialized
  cargo_type        text,       -- DPP | CPP | Chemical | LPG | Gas
  dwt               integer,
  cbm               integer,
  built_year        integer,
  flag              text,
  owner             text,
  operator          text,
  manager           text,

  -- Open position
  open_port         text,
  open_region       text,       -- AG | Med | Black Sea | UKC | Baltic | WAF | USG | USEC | Far East | India | Caribbean
  open_date         date,
  open_date_text    text,       -- raw text e.g. "31-Mar" for reference

  -- Direction / ballasting
  direction         text,       -- where the vessel is heading / looking for cargo
  direction_region  text,

  -- Last cargoes (L3C)
  last_cargo_1      text,
  last_cargo_2      text,
  last_cargo_3      text,
  cargo_history     text,       -- combined string e.g. "CRUDE/FO/NAP"

  -- Technical specs
  coating           text,       -- EPOXY | MARINELINE | STAINLESS STEEL | ZINC
  ice_class         text,       -- 1A | 1B | 1C | None
  imo_class         text,       -- IMO 2 | IMO 3 | IMO 2/3
  heating           boolean,
  nitrogen          boolean,
  sire_date         date,
  cap_rating        text,

  -- Status
  status            text        DEFAULT 'open', -- open | on_subs | fixed | ballasting | in_dock
  comments          text,       -- additional remarks from the position list
  raw_text          text,       -- original line from email for audit

  -- Timestamps
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vpl_report_date    ON public.vessel_position_list(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_vpl_vessel_class   ON public.vessel_position_list(vessel_class);
CREATE INDEX IF NOT EXISTS idx_vpl_open_region    ON public.vessel_position_list(open_region);
CREATE INDEX IF NOT EXISTS idx_vpl_open_date      ON public.vessel_position_list(open_date);
CREATE INDEX IF NOT EXISTS idx_vpl_status         ON public.vessel_position_list(status);
CREATE INDEX IF NOT EXISTS idx_vpl_source         ON public.vessel_position_list(source_name);
CREATE INDEX IF NOT EXISTS idx_vpl_thread_id      ON public.vessel_position_list(thread_id);

-- Dedup index: same vessel from same source on same report date
CREATE UNIQUE INDEX IF NOT EXISTS idx_vpl_dedup
  ON public.vessel_position_list(vessel_name, source_name, report_date)
  WHERE thread_id IS NOT NULL;

-- RLS
ALTER TABLE public.vessel_position_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vessel_positions_select_all_active"
  ON public.vessel_position_list FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.crm_users
    WHERE crm_users.auth_user_id = auth.uid() AND crm_users.active = true
  ));

CREATE POLICY "vessel_positions_insert_active"
  ON public.vessel_position_list FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.crm_users
    WHERE crm_users.auth_user_id = auth.uid() AND crm_users.active = true
  ));

CREATE POLICY "vessel_positions_update_active"
  ON public.vessel_position_list FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.crm_users
    WHERE crm_users.auth_user_id = auth.uid() AND crm_users.active = true
  ));

CREATE POLICY "vessel_positions_delete_admin"
  ON public.vessel_position_list FOR DELETE
  USING (is_admin());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_vpl_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_vpl_updated_at
  BEFORE UPDATE ON public.vessel_position_list
  FOR EACH ROW EXECUTE FUNCTION public.set_vpl_updated_at();
