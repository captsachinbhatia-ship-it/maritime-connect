-- 1. Create interaction_comments table
CREATE TABLE IF NOT EXISTS public.interaction_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interaction_id UUID NOT NULL REFERENCES public.contact_interactions(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by interaction
CREATE INDEX IF NOT EXISTS ix_ic_interaction ON public.interaction_comments(interaction_id, created_at);

-- 2. RLS on interaction_comments
ALTER TABLE public.interaction_comments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read comments
CREATE POLICY "interaction_comments_select"
    ON public.interaction_comments FOR SELECT
    USING (true);

-- Any authenticated user can insert comments
CREATE POLICY "interaction_comments_insert"
    ON public.interaction_comments FOR INSERT
    WITH CHECK (true);

-- Only comment author or admin can delete
CREATE POLICY "interaction_comments_delete"
    ON public.interaction_comments FOR DELETE
    USING (
        user_id = public.current_crm_user_id()
        OR public.is_admin()
    );

-- 3. Allow maker or admin to UPDATE contact_interactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'contact_interactions'
        AND policyname = 'contact_interactions_update_maker_or_admin'
    ) THEN
        CREATE POLICY "contact_interactions_update_maker_or_admin"
            ON public.contact_interactions FOR UPDATE
            USING (
                user_id = public.current_crm_user_id()
                OR public.is_admin()
            )
            WITH CHECK (
                user_id = public.current_crm_user_id()
                OR public.is_admin()
            );
    END IF;
END $$;

-- 4. Update the view to include comment_count
CREATE OR REPLACE VIEW v_interaction_timeline_v2 AS
SELECT
    ci.id,
    ci.contact_id,
    ci.user_id,
    ci.interaction_type,
    ci.direction,
    ci.interaction_at,
    ci.outcome,
    ci.notes,
    ci.created_at,
    ci.meta->>'subject'       AS subject,
    c.full_name               AS contact_name,
    c.company_id,
    co.company_name,
    cu.full_name              AS creator_full_name,
    COALESCE(cc.comment_count, 0) AS comment_count
FROM public.contact_interactions ci
LEFT JOIN public.contacts   c  ON c.id  = ci.contact_id
LEFT JOIN public.companies  co ON co.id = c.company_id
LEFT JOIN public.crm_users  cu ON cu.id = ci.user_id
LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS comment_count
    FROM public.interaction_comments ic
    WHERE ic.interaction_id = ci.id
) cc ON true
ORDER BY ci.interaction_at DESC NULLS LAST;
