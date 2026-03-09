-- =============================================================================
-- MIGRATION 0006: user_notes — per-note multi-note system
-- =============================================================================
-- Replaces the single-row user_notepad model with a proper notes table where
-- each note has its own content, reminder, and completion status.
-- The old user_notepad table is left untouched (no data loss).
-- =============================================================================

CREATE TABLE public.user_notes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_user_id    UUID        NOT NULL REFERENCES public.crm_users(id) ON DELETE CASCADE,
  content        TEXT        NOT NULL DEFAULT '',
  is_completed   BOOLEAN     NOT NULL DEFAULT false,
  reminder_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE TRIGGER trg_user_notes_updated_at
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX idx_user_notes_crm_user_id ON public.user_notes (crm_user_id);
CREATE INDEX idx_user_notes_reminder_at  ON public.user_notes (reminder_at)
  WHERE reminder_at IS NOT NULL;

-- RLS
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_notes_select ON public.user_notes
  FOR SELECT USING (crm_user_id = public.current_crm_user_id());

CREATE POLICY user_notes_insert ON public.user_notes
  FOR INSERT WITH CHECK (crm_user_id = public.current_crm_user_id());

CREATE POLICY user_notes_update ON public.user_notes
  FOR UPDATE USING (crm_user_id = public.current_crm_user_id());

CREATE POLICY user_notes_delete ON public.user_notes
  FOR DELETE USING (crm_user_id = public.current_crm_user_id());
