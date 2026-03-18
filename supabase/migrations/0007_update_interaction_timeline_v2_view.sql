-- Add creator name, company details, and subject to v_interaction_timeline_v2
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
    cu.full_name              AS creator_full_name
FROM public.contact_interactions ci
LEFT JOIN public.contacts   c  ON c.id  = ci.contact_id
LEFT JOIN public.companies  co ON co.id = c.company_id
LEFT JOIN public.crm_users  cu ON cu.id = ci.user_id
ORDER BY ci.interaction_at DESC NULLS LAST;
