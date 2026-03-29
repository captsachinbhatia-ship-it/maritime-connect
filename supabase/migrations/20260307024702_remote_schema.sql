drop trigger if exists "trg_sync_enquiry_feed" on "public"."enquiries";

drop trigger if exists "interactions_defaults" on "public"."interactions__legacy";

drop trigger if exists "trg_block_legacy_interactions_write" on "public"."interactions__legacy";

drop trigger if exists "trg_interactions_set_created_by" on "public"."interactions__legacy";

drop trigger if exists "trg_update_contact_on_interaction" on "public"."interactions__legacy";

drop trigger if exists "trg_interactions_log_updated_at" on "public"."interactions_log";

drop policy "admin_ceo_can_insert_assignments" on "public"."contact_assignments";

drop policy "admin_ceo_can_update_assignments" on "public"."contact_assignments";

drop policy "ca_insert_admin_only" on "public"."contact_assignments";

drop policy "ca_update_admin_only" on "public"."contact_assignments";

drop policy "contact_assignments_update_admin_only" on "public"."contact_assignments";

drop policy "contact_assignments_update_stage" on "public"."contact_assignments";

drop policy "contact_assignments_update_stage_safe" on "public"."contact_assignments";

drop policy "contact_assignments_write_admin_only" on "public"."contact_assignments";

drop policy "contacts_update" on "public"."contacts";

drop policy "contacts_update_assigned_or_admin" on "public"."contacts";

drop policy "contacts_update_creator_or_admin" on "public"."contacts";

drop policy "contacts_update_safe" on "public"."contacts";

drop policy "contacts_update_stage_creator_or_assignee" on "public"."contacts";

drop policy "enquiries_insert_failsafe_authenticated" on "public"."enquiries";

drop policy "enquiry_feed_block_write" on "public"."enquiry_feed";

drop policy "enquiry_feed_insert" on "public"."enquiry_feed";

drop policy "enquiry_feed_select" on "public"."enquiry_feed";

drop policy "enquiry_feed_update" on "public"."enquiry_feed";

drop policy "No deletes on interactions" on "public"."interactions__legacy";

drop policy "No updates on interactions" on "public"."interactions__legacy";

drop policy "Users can view interactions of assigned contacts" on "public"."interactions__legacy";

drop policy "interactions_insert_safe" on "public"."interactions__legacy";

drop policy "interactions_insert_unified" on "public"."interactions__legacy";

drop policy "interactions_linked_delete" on "public"."interactions__legacy";

drop policy "interactions_linked_insert" on "public"."interactions__legacy";

drop policy "interactions_linked_select" on "public"."interactions__legacy";

drop policy "interactions_linked_update" on "public"."interactions__legacy";

drop policy "interactions_no_delete" on "public"."interactions__legacy";

drop policy "interactions_no_update" on "public"."interactions__legacy";

drop policy "interactions_select_safe" on "public"."interactions__legacy";

drop policy "interactions_select_unified" on "public"."interactions__legacy";

drop policy "interactions_log_insert_own" on "public"."interactions_log";

drop policy "interactions_log_select_admin" on "public"."interactions_log";

drop policy "interactions_log_select_own" on "public"."interactions_log";

drop policy "interactions_log_update_own" on "public"."interactions_log";

drop policy "contact_interactions_insert" on "public"."contact_interactions";

drop policy "contact_interactions_select" on "public"."contact_interactions";

drop policy "contact_private_details_insert" on "public"."contact_private_details";

drop policy "contact_private_details_select" on "public"."contact_private_details";

drop policy "contact_private_details_update" on "public"."contact_private_details";

revoke delete on table "public"."enquiry_feed" from "anon";

revoke insert on table "public"."enquiry_feed" from "anon";

revoke references on table "public"."enquiry_feed" from "anon";

revoke select on table "public"."enquiry_feed" from "anon";

revoke trigger on table "public"."enquiry_feed" from "anon";

revoke truncate on table "public"."enquiry_feed" from "anon";

revoke update on table "public"."enquiry_feed" from "anon";

revoke delete on table "public"."enquiry_feed" from "authenticated";

revoke insert on table "public"."enquiry_feed" from "authenticated";

revoke references on table "public"."enquiry_feed" from "authenticated";

revoke select on table "public"."enquiry_feed" from "authenticated";

revoke trigger on table "public"."enquiry_feed" from "authenticated";

revoke truncate on table "public"."enquiry_feed" from "authenticated";

revoke update on table "public"."enquiry_feed" from "authenticated";

revoke delete on table "public"."enquiry_feed" from "service_role";

revoke insert on table "public"."enquiry_feed" from "service_role";

revoke references on table "public"."enquiry_feed" from "service_role";

revoke select on table "public"."enquiry_feed" from "service_role";

revoke trigger on table "public"."enquiry_feed" from "service_role";

revoke truncate on table "public"."enquiry_feed" from "service_role";

revoke update on table "public"."enquiry_feed" from "service_role";

revoke references on table "public"."interactions__legacy" from "anon";

revoke select on table "public"."interactions__legacy" from "anon";

revoke trigger on table "public"."interactions__legacy" from "anon";

revoke truncate on table "public"."interactions__legacy" from "anon";

revoke references on table "public"."interactions__legacy" from "authenticated";

revoke select on table "public"."interactions__legacy" from "authenticated";

revoke trigger on table "public"."interactions__legacy" from "authenticated";

revoke truncate on table "public"."interactions__legacy" from "authenticated";

revoke delete on table "public"."interactions__legacy" from "service_role";

revoke insert on table "public"."interactions__legacy" from "service_role";

revoke references on table "public"."interactions__legacy" from "service_role";

revoke select on table "public"."interactions__legacy" from "service_role";

revoke trigger on table "public"."interactions__legacy" from "service_role";

revoke truncate on table "public"."interactions__legacy" from "service_role";

revoke update on table "public"."interactions__legacy" from "service_role";

revoke delete on table "public"."interactions_log" from "anon";

revoke insert on table "public"."interactions_log" from "anon";

revoke references on table "public"."interactions_log" from "anon";

revoke select on table "public"."interactions_log" from "anon";

revoke trigger on table "public"."interactions_log" from "anon";

revoke truncate on table "public"."interactions_log" from "anon";

revoke update on table "public"."interactions_log" from "anon";

revoke delete on table "public"."interactions_log" from "authenticated";

revoke insert on table "public"."interactions_log" from "authenticated";

revoke references on table "public"."interactions_log" from "authenticated";

revoke select on table "public"."interactions_log" from "authenticated";

revoke trigger on table "public"."interactions_log" from "authenticated";

revoke truncate on table "public"."interactions_log" from "authenticated";

revoke update on table "public"."interactions_log" from "authenticated";

revoke delete on table "public"."interactions_log" from "service_role";

revoke insert on table "public"."interactions_log" from "service_role";

revoke references on table "public"."interactions_log" from "service_role";

revoke select on table "public"."interactions_log" from "service_role";

revoke trigger on table "public"."interactions_log" from "service_role";

revoke truncate on table "public"."interactions_log" from "service_role";

revoke update on table "public"."interactions_log" from "service_role";

alter table "public"."contact_assignments" drop constraint "contact_assignments_assigned_by_fkey";

alter table "public"."contact_assignments" drop constraint "contact_assignments_assigned_to_fkey";

alter table "public"."contact_assignments" drop constraint "contact_assignments_stage_changed_by_fkey";

alter table "public"."contact_followups" drop constraint "contact_followups_interaction_id_new_fkey";

alter table "public"."contacts" drop constraint "contacts_assigned_to_fkey";

alter table "public"."contacts" drop constraint "fk_contacts_assigned_user";

alter table "public"."enquiry_feed" drop constraint "enquiry_feed_created_by_fkey";

alter table "public"."enquiry_feed" drop constraint "enquiry_feed_enquiry_id_fkey";

alter table "public"."enquiry_feed" drop constraint "enquiry_feed_enquiry_mode_check";

alter table "public"."interactions__legacy" drop constraint "interactions__legacy_related_enquiry_id_fkey";

alter table "public"."interactions__legacy" drop constraint "interactions_assignment_id_fkey";

alter table "public"."interactions__legacy" drop constraint "interactions_contact_id_fkey";

alter table "public"."interactions__legacy" drop constraint "interactions_created_by_fk";

alter table "public"."interactions__legacy" drop constraint "interactions_created_by_fkey";

alter table "public"."interactions__legacy" drop constraint "interactions_duration_positive";

alter table "public"."interactions__legacy" drop constraint "interactions_outcome_check";

alter table "public"."interactions__legacy" drop constraint "interactions_type_check";

drop function if exists "public"."find_contacts_needing_followup"(p_days_threshold integer);

drop function if exists "public"."get_interaction_stats"(p_start_date date, p_end_date date, p_user_id uuid);

drop view if exists "public"."active_contacts";

drop function if exists "public"."admin_activity_feed"(p_from timestamp with time zone, p_to timestamp with time zone);

drop view if exists "public"."contact_duplicate_risk";

drop view if exists "public"."v_contact_interaction_summary";

drop view if exists "public"."v_contact_interactions_timeline";

drop view if exists "public"."v_contact_timewaster_watchlist";

drop view if exists "public"."v_contact_workability_score";

drop view if exists "public"."v_contacts_with_assignments";

drop view if exists "public"."v_contacts_workbench_all";

drop view if exists "public"."v_directory_owner_snapshot";

drop view if exists "public"."v_directory_stage_counts";

drop view if exists "public"."v_enquiry_pipeline";

drop view if exists "public"."v_enquiry_summary_by_status";

drop view if exists "public"."v_followup_queue_all__legacy";

drop view if exists "public"."v_followup_queue_all_v2";

drop view if exists "public"."v_interaction_timeline__legacy";

drop view if exists "public"."v_interaction_timeline_v2";

drop view if exists "public"."v_my_added_unassigned";

drop view if exists "public"."v_my_contacts";

drop view if exists "public"."v_my_pending_nudges";

drop view if exists "public"."v_my_primary_contacts";

drop view if exists "public"."v_my_primary_pipeline";

drop view if exists "public"."v_my_recommended_contacts";

drop view if exists "public"."v_my_secondary_contacts";

drop view if exists "public"."v_nudges_i_created";

drop view if exists "public"."v_owner_contact_counts";

drop view if exists "public"."v_owner_summary_ui";

drop view if exists "public"."v_pending_inactive_requests";

drop view if exists "public"."v_recommended_contacts";

drop view if exists "public"."v_recommended_contacts_ranked";

drop view if exists "public"."v_recommended_contacts_weighted";

drop view if exists "public"."v_recurring_followup_chains";

drop view if exists "public"."v_team_activity_snapshot";

drop view if exists "public"."v_unassigned_active_contacts";

drop view if exists "public"."v_unassigned_contacts";

drop view if exists "public"."v_user_activity_summary";

drop view if exists "public"."v_user_stage_contacts";

drop view if exists "public"."contacts_with_primary_phone";

drop view if exists "public"."v_all_followups";

drop view if exists "public"."v_contact_enquiry_performance";

drop view if exists "public"."v_contact_score_by_enq_type";

drop view if exists "public"."v_contacts_last_interaction";

drop view if exists "public"."v_directory_contacts";

drop view if exists "public"."v_owner_summary";

alter table "public"."enquiry_feed" drop constraint "enquiry_feed_pkey";

alter table "public"."interactions__legacy" drop constraint "interactions_pkey";

alter table "public"."interactions_log" drop constraint "interactions_log_pkey";

drop index if exists "public"."enquiry_feed_pkey";

drop index if exists "public"."idx_contacts_assigned_to";

drop index if exists "public"."idx_enquiry_feed_updated";

drop index if exists "public"."idx_interactions_contact_date";

drop index if exists "public"."idx_interactions_created_by_date";

drop index if exists "public"."idx_interactions_legacy_enquiry";

drop index if exists "public"."idx_interactions_log_channel_time";

drop index if exists "public"."idx_interactions_log_contact_time";

drop index if exists "public"."idx_interactions_log_user_time";

drop index if exists "public"."idx_interactions_next_action";

drop index if exists "public"."idx_interactions_outcome";

drop index if exists "public"."idx_interactions_type";

drop index if exists "public"."interactions_contact_idx";

drop index if exists "public"."interactions_created_by_idx";

drop index if exists "public"."interactions_log_pkey";

drop index if exists "public"."interactions_pkey";

drop index if exists "public"."ix_contact_assignments_user";

drop index if exists "public"."ix_contacts_assigned_user";

drop index if exists "public"."ux_contact_assignments_contact_user";

drop table "public"."enquiry_feed";

drop table "public"."interactions__legacy";

drop table "public"."interactions_log";

alter table "public"."contact_assignments" drop column "assigned_by";

alter table "public"."contact_assignments" drop column "assigned_to";

alter table "public"."contact_assignments" drop column "stage_changed_by";

alter table "public"."contact_followups" drop column "interaction_id_new";

alter table "public"."contact_interactions" add column "assignment_id" uuid;

alter table "public"."contact_interactions" add column "attachments" jsonb default '[]'::jsonb;

alter table "public"."contact_interactions" add column "duration_minutes" integer;

alter table "public"."contact_interactions" add column "subject" text;

alter table "public"."contacts" drop column "assigned_to";

alter table "public"."contacts" drop column "assigned_to_user_id";

alter table "public"."user_notepad" add column "reminder_at" timestamp with time zone;

CREATE UNIQUE INDEX uq_contact_assignments_active_primary ON public.contact_assignments USING btree (contact_id) WHERE ((lower(TRIM(BOTH FROM assignment_role)) = 'primary'::text) AND (status = 'ACTIVE'::text));

alter table "public"."contact_interactions" add constraint "ci_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES public.contact_assignments(id) ON DELETE SET NULL not valid;

alter table "public"."contact_interactions" validate constraint "ci_assignment_id_fkey";

alter table "public"."contact_interactions" add constraint "ci_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_interactions" validate constraint "ci_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_activity_feed(p_limit integer DEFAULT 20)
 RETURNS TABLE(event_type text, contact_id uuid, contact_name text, actor_name text, notes text, occurred_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    'INTERACTION'              AS event_type,
    ci.contact_id,
    c.full_name                AS contact_name,
    cu.full_name               AS actor_name,
    ci.notes,
    ci.interaction_at          AS occurred_at
  FROM public.contact_interactions ci
  JOIN public.contacts   c  ON c.id  = ci.contact_id
  JOIN public.crm_users  cu ON cu.id = ci.user_id
  ORDER BY ci.interaction_at DESC
  LIMIT p_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.find_contacts_needing_followup(p_days_stale integer DEFAULT 14)
 RETURNS TABLE(contact_id uuid, contact_name text, last_interaction_at timestamp with time zone, days_stale integer, assigned_to_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.id                                                    AS contact_id,
    c.full_name                                             AS contact_name,
    max(ci.interaction_at)                                  AS last_interaction_at,
    EXTRACT(day FROM now() - max(ci.interaction_at))::integer AS days_stale,
    cu.full_name                                            AS assigned_to_name
  FROM public.contacts c
  JOIN public.contact_assignments ca
    ON ca.contact_id = c.id
    AND ca.status = 'ACTIVE'
    AND lower(trim(ca.assignment_role)) = 'primary'
  JOIN public.crm_users cu ON cu.id = ca.assigned_to_crm_user_id
  LEFT JOIN public.contact_interactions ci ON ci.contact_id = c.id
  WHERE c.is_deleted = false
  GROUP BY c.id, c.full_name, cu.full_name
  HAVING max(ci.interaction_at) < now() - (p_days_stale || ' days')::interval
      OR max(ci.interaction_at) IS NULL
  ORDER BY max(ci.interaction_at) ASC NULLS FIRST;
$function$
;

CREATE OR REPLACE FUNCTION public.get_interaction_stats(p_contact_id uuid)
 RETURNS TABLE(total_interactions bigint, last_interaction_at timestamp with time zone, last_interaction_type text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    count(*)              AS total_interactions,
    max(interaction_at)   AS last_interaction_at,
    (SELECT interaction_type FROM public.contact_interactions
     WHERE contact_id = p_contact_id
     ORDER BY interaction_at DESC LIMIT 1) AS last_interaction_type
  FROM public.contact_interactions
  WHERE contact_id = p_contact_id;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_report_a_activity_summary(p_start timestamp with time zone, p_end timestamp with time zone, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(crm_user_id uuid, user_name text, user_role text, total_interactions bigint, calls_made bigint, emails_sent bigint, whatsapp_sent bigint, meetings_notes bigint, unique_contacts_touched bigint, enquiries_handled bigint, tasks_due bigint, tasks_completed bigint, task_completion_rate numeric, avg_interactions_per_day numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  v_caller uuid := current_crm_user_id();
  v_is_admin boolean := is_admin();
BEGIN
  -- Non-admin callers are always scoped to themselves regardless of p_user_id
  IF NOT v_is_admin THEN
    p_user_id := v_caller;
  END IF;

  RETURN QUERY
  WITH
  -- Users in scope
  users AS (
    SELECT id, full_name, role
    FROM crm_users
    WHERE active = true
      AND (p_user_id IS NULL OR id = p_user_id)
  ),
  -- Interaction aggregates per user
  inter AS (
    SELECT
      ci.user_id,
      COUNT(*)                                                          AS total_interactions,
      COUNT(*) FILTER (WHERE ci.interaction_type IN ('CALL','COLD_CALL')) AS calls_made,
      COUNT(*) FILTER (WHERE ci.interaction_type = 'EMAIL_SENT')        AS emails_sent,
      COUNT(*) FILTER (WHERE ci.interaction_type IN ('WHATSAPP_SENT','WHATSAPP_REPLY')) AS whatsapp_sent,
      COUNT(*) FILTER (WHERE ci.interaction_type IN ('MEETING','NOTE')) AS meetings_notes,
      COUNT(DISTINCT ci.contact_id)                                    AS unique_contacts_touched,
      -- Active days = distinct calendar days with at least one interaction
      COUNT(DISTINCT DATE(ci.interaction_at))                          AS active_days
    FROM contact_interactions ci
    WHERE ci.interaction_at >= p_start
      AND ci.interaction_at <  p_end
      AND ci.user_id IS NOT NULL
      AND (p_user_id IS NULL OR ci.user_id = p_user_id)
    GROUP BY ci.user_id
  ),
  -- Enquiries assigned to each user in the period
  enq AS (
    SELECT
      e.assigned_to AS user_id,
      COUNT(*)      AS enquiries_handled
    FROM enquiries e
    WHERE e.assigned_to IS NOT NULL
      AND e.created_at >= p_start
      AND e.created_at <  p_end
      AND (p_user_id IS NULL OR e.assigned_to = p_user_id)
    GROUP BY e.assigned_to
  ),
  -- Tasks due in period
  tasks_due_cte AS (
    SELECT
      cf.assigned_to_crm_user_id AS user_id,
      COUNT(*)                   AS tasks_due
    FROM contact_followups cf
    WHERE cf.assigned_to_crm_user_id IS NOT NULL
      AND cf.due_at >= p_start
      AND cf.due_at <  p_end
      AND (p_user_id IS NULL OR cf.assigned_to_crm_user_id = p_user_id)
    GROUP BY cf.assigned_to_crm_user_id
  ),
  -- Tasks completed in period (completed_at in range)
  tasks_done_cte AS (
    SELECT
      cf.assigned_to_crm_user_id AS user_id,
      COUNT(*)                   AS tasks_completed
    FROM contact_followups cf
    WHERE cf.assigned_to_crm_user_id IS NOT NULL
      AND cf.status = 'COMPLETED'
      AND cf.completed_at >= p_start
      AND cf.completed_at <  p_end
      AND (p_user_id IS NULL OR cf.assigned_to_crm_user_id = p_user_id)
    GROUP BY cf.assigned_to_crm_user_id
  )
  SELECT
    u.id                                                                  AS crm_user_id,
    u.full_name                                                           AS user_name,
    u.role                                                                AS user_role,
    COALESCE(i.total_interactions, 0)                                     AS total_interactions,
    COALESCE(i.calls_made, 0)                                             AS calls_made,
    COALESCE(i.emails_sent, 0)                                            AS emails_sent,
    COALESCE(i.whatsapp_sent, 0)                                          AS whatsapp_sent,
    COALESCE(i.meetings_notes, 0)                                         AS meetings_notes,
    COALESCE(i.unique_contacts_touched, 0)                                AS unique_contacts_touched,
    COALESCE(e.enquiries_handled, 0)                                      AS enquiries_handled,
    COALESCE(td.tasks_due, 0)                                             AS tasks_due,
    COALESCE(tc.tasks_completed, 0)                                       AS tasks_completed,
    -- Completion rate: NULL when no tasks due (not 0% — avoids misleading display)
    CASE
      WHEN COALESCE(td.tasks_due, 0) = 0 THEN NULL
      ELSE ROUND(
        COALESCE(tc.tasks_completed, 0)::numeric
        / td.tasks_due::numeric * 100.0, 1
      )
    END                                                                   AS task_completion_rate,
    -- Avg per active day: NULL when no interactions logged
    CASE
      WHEN COALESCE(i.active_days, 0) = 0 THEN NULL
      ELSE ROUND(
        i.total_interactions::numeric / i.active_days::numeric, 1
      )
    END                                                                   AS avg_interactions_per_day
  FROM users u
  LEFT JOIN inter        i  ON i.user_id  = u.id
  LEFT JOIN enq          e  ON e.user_id  = u.id
  LEFT JOIN tasks_due_cte td ON td.user_id = u.id
  LEFT JOIN tasks_done_cte tc ON tc.user_id = u.id
  ORDER BY COALESCE(i.total_interactions, 0) DESC, u.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_report_b_coverage(p_owner_id uuid DEFAULT NULL::uuid, p_stage text DEFAULT NULL::text, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(total_active_contacts bigint, assigned_contacts bigint, unassigned_contacts bigint, assigned_pct numeric, stage_cold_calling bigint, stage_aspiration bigint, stage_achievement bigint, stage_inactive bigint, stage_unknown bigint, not_touched_30d bigint, not_touched_60d bigint, not_touched_90d bigint, never_contacted bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  v_caller   uuid    := current_crm_user_id();
  v_is_admin boolean := is_admin();
  v_owner    uuid;
BEGIN
  -- Access scoping
  IF NOT v_is_admin THEN
    -- Broker always sees only their own assigned contacts
    v_owner := v_caller;
  ELSE
    v_owner := p_owner_id;  -- NULL = all users
  END IF;

  RETURN QUERY
  WITH
  -- Base: active (non-deleted, non-archived) contacts matching filters
  base_contacts AS (
    SELECT c.id, c.stage
    FROM contacts c
    WHERE c.is_deleted  = false
      AND c.is_archived = false
      AND (p_stage      IS NULL OR c.stage      = p_stage)
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
      -- Owner filter: if scoped, only contacts with active assignment to that user
      AND (
        v_owner IS NULL
        OR EXISTS (
          SELECT 1 FROM contact_assignments ca
          WHERE ca.contact_id = c.id
            AND ca.assigned_to_crm_user_id = v_owner
            AND ca.status = 'ACTIVE'
        )
      )
  ),
  -- Which of those contacts have an active PRIMARY assignment to an active broker
  assigned_ids AS (
    SELECT DISTINCT ca.contact_id
    FROM contact_assignments ca
    JOIN crm_users cu ON cu.id = ca.assigned_to_crm_user_id AND cu.active = true
    WHERE ca.status = 'ACTIVE'
      AND lower(trim(ca.assignment_role)) = 'primary'
      AND ca.contact_id IN (SELECT id FROM base_contacts)
  ),
  -- Last interaction per contact
  last_touch AS (
    SELECT ci.contact_id, MAX(ci.interaction_at) AS last_at
    FROM contact_interactions ci
    WHERE ci.contact_id IN (SELECT id FROM base_contacts)
    GROUP BY ci.contact_id
  )
  SELECT
    COUNT(bc.id)                                               AS total_active_contacts,
    COUNT(bc.id) FILTER (WHERE ai.contact_id IS NOT NULL)     AS assigned_contacts,
    COUNT(bc.id) FILTER (WHERE ai.contact_id IS NULL)         AS unassigned_contacts,
    CASE WHEN COUNT(bc.id) = 0 THEN NULL
      ELSE ROUND(
        COUNT(bc.id) FILTER (WHERE ai.contact_id IS NOT NULL)::numeric
        / COUNT(bc.id)::numeric * 100.0, 1)
    END                                                        AS assigned_pct,
    COUNT(bc.id) FILTER (WHERE bc.stage = 'COLD_CALLING')     AS stage_cold_calling,
    COUNT(bc.id) FILTER (WHERE bc.stage = 'ASPIRATION')       AS stage_aspiration,
    COUNT(bc.id) FILTER (WHERE bc.stage = 'ACHIEVEMENT')      AS stage_achievement,
    COUNT(bc.id) FILTER (WHERE bc.stage = 'INACTIVE')         AS stage_inactive,
    COUNT(bc.id) FILTER (WHERE bc.stage IS NULL OR bc.stage NOT IN
      ('COLD_CALLING','ASPIRATION','ACHIEVEMENT','INACTIVE'))  AS stage_unknown,
    -- Not touched: last interaction older than N days, OR never touched
    COUNT(bc.id) FILTER (
      WHERE lt.last_at IS NULL OR lt.last_at < NOW() - INTERVAL '30 days'
    )                                                          AS not_touched_30d,
    COUNT(bc.id) FILTER (
      WHERE lt.last_at IS NULL OR lt.last_at < NOW() - INTERVAL '60 days'
    )                                                          AS not_touched_60d,
    COUNT(bc.id) FILTER (
      WHERE lt.last_at IS NULL OR lt.last_at < NOW() - INTERVAL '90 days'
    )                                                          AS not_touched_90d,
    COUNT(bc.id) FILTER (WHERE lt.last_at IS NULL)            AS never_contacted
  FROM base_contacts bc
  LEFT JOIN assigned_ids ai ON ai.contact_id = bc.id
  LEFT JOIN last_touch   lt ON lt.contact_id = bc.id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_report_c_pipeline(p_start timestamp with time zone, p_end timestamp with time zone, p_mode text DEFAULT NULL::text)
 RETURNS TABLE(total_enquiries bigint, open_active bigint, draft_not_issued bigint, closed_won bigint, closed_lost bigint, closed_cancelled bigint, closed_other bigint, win_rate_pct numeric, status_received bigint, status_screening bigint, status_in_market bigint, status_offer_out bigint, status_countering bigint, status_subjects bigint, status_fixed bigint, status_failed bigint, status_cancelled bigint, status_withdrawn bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  v_caller   uuid    := current_crm_user_id();
  v_is_admin boolean := is_admin();
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      e.id,
      e.lifecycle_state,
      e.closed_status,
      e.status
    FROM enquiries e
    WHERE e.created_at >= p_start
      AND e.created_at <  p_end
      AND (p_mode   IS NULL OR e.enquiry_mode = p_mode)
      -- Access scoping
      AND (v_is_admin OR e.assigned_to = v_caller)
  )
  SELECT
    COUNT(*)                                                   AS total_enquiries,
    -- Open: issued and not in a terminal status
    COUNT(*) FILTER (
      WHERE lifecycle_state = 'ISSUED'
        AND status NOT IN ('FAILED','CANCELLED','WITHDRAWN')
    )                                                          AS open_active,
    COUNT(*) FILTER (WHERE lifecycle_state = 'DRAFT')         AS draft_not_issued,
    COUNT(*) FILTER (WHERE lifecycle_state = 'CLOSED' AND closed_status = 'WON')   AS closed_won,
    COUNT(*) FILTER (WHERE lifecycle_state = 'CLOSED' AND closed_status IN ('LOST','NO_OFFER','EXPIRED')) AS closed_lost,
    COUNT(*) FILTER (WHERE lifecycle_state = 'CLOSED' AND closed_status = 'CANCELLED')                   AS closed_cancelled,
    -- Closed but closed_status is NULL or an unexpected value
    COUNT(*) FILTER (
      WHERE lifecycle_state = 'CLOSED'
        AND (closed_status IS NULL OR closed_status NOT IN
          ('WON','LOST','NO_OFFER','EXPIRED','CANCELLED','COMPLETED'))
    )                                                          AS closed_other,
    -- Win rate: won / (won + lost). NULL when denominator = 0
    CASE
      WHEN COUNT(*) FILTER (WHERE lifecycle_state = 'CLOSED'
        AND closed_status IN ('WON','LOST','NO_OFFER','EXPIRED')) = 0
      THEN NULL
      ELSE ROUND(
        COUNT(*) FILTER (WHERE lifecycle_state='CLOSED' AND closed_status='WON')::numeric
        / COUNT(*) FILTER (WHERE lifecycle_state='CLOSED'
            AND closed_status IN ('WON','LOST','NO_OFFER','EXPIRED'))::numeric * 100.0,
        1
      )
    END                                                        AS win_rate_pct,
    -- Status breakdown (all values; zero = 0 not absent)
    COUNT(*) FILTER (WHERE status = 'RECEIVED')               AS status_received,
    COUNT(*) FILTER (WHERE status = 'SCREENING')              AS status_screening,
    COUNT(*) FILTER (WHERE status = 'IN_MARKET')              AS status_in_market,
    COUNT(*) FILTER (WHERE status = 'OFFER_OUT')              AS status_offer_out,
    COUNT(*) FILTER (WHERE status = 'COUNTERING')             AS status_countering,
    COUNT(*) FILTER (WHERE status = 'SUBJECTS')               AS status_subjects,
    COUNT(*) FILTER (WHERE status = 'FIXED')                  AS status_fixed,
    COUNT(*) FILTER (WHERE status = 'FAILED')                 AS status_failed,
    COUNT(*) FILTER (WHERE status = 'CANCELLED')              AS status_cancelled,
    COUNT(*) FILTER (WHERE status = 'WITHDRAWN')              AS status_withdrawn
  FROM base;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_report_c_response_stats(p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS TABLE(total_responses bigint, avg_responses_per_enquiry numeric, total_shortlisted bigint, enquiries_with_shortlist bigint, conversion_proxy bigint, median_time_to_first_resp_hrs numeric, fastest_response_hrs numeric, slowest_response_hrs numeric, enquiries_no_response bigint, excluded_negative_response bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  RETURN QUERY
  WITH

  issued_enq AS (
    SELECT e.id, e.issued_at, e.lifecycle_state, e.closed_status
    FROM enquiries e
    WHERE e.issued_at BETWEEN p_start AND p_end
      AND e.issued_at IS NOT NULL
  ),

  all_resp AS (
    SELECT er.enquiry_id, er.response_at
    FROM enquiry_responses er
    JOIN issued_enq ie ON ie.id = er.enquiry_id
    WHERE er.response_at IS NOT NULL
  ),

  first_resp AS (
    SELECT ar.enquiry_id, MIN(ar.response_at) AS first_at
    FROM all_resp ar
    JOIN issued_enq ie ON ie.id = ar.enquiry_id
    WHERE ar.response_at > ie.issued_at
    GROUP BY ar.enquiry_id
  ),

  -- FIX: was EXTRACT(hours FROM ...) — invalid. Correct: EPOCH/3600
  resp_hrs AS (
    SELECT
      fr.enquiry_id,
      ROUND((EXTRACT(EPOCH FROM (fr.first_at - ie.issued_at)) / 3600.0)::numeric, 1) AS hrs
    FROM first_resp fr
    JOIN issued_enq ie ON ie.id = fr.enquiry_id
  ),

  -- Renamed from shortlist_stats to sl_stats to avoid 42702 ambiguity
  sl_stats AS (
    SELECT
      COUNT(DISTINCT es.enquiry_id)::bigint AS enq_with_sl,
      COUNT(es.id)::bigint                  AS total_sl_rows
    FROM enquiry_shortlist es
    JOIN issued_enq ie ON ie.id = es.enquiry_id
  ),

  conv AS (
    SELECT COUNT(DISTINCT ie.id)::bigint AS cnt
    FROM issued_enq ie
    WHERE ie.lifecycle_state = 'CLOSED'
      AND ie.closed_status = 'WON'
      AND EXISTS (SELECT 1 FROM enquiry_shortlist es WHERE es.enquiry_id = ie.id)
  ),

  no_resp AS (
    SELECT COUNT(DISTINCT ie.id)::bigint AS cnt
    FROM issued_enq ie
    WHERE NOT EXISTS (SELECT 1 FROM all_resp ar WHERE ar.enquiry_id = ie.id)
  ),

  resp_counts AS (
    SELECT enquiry_id, COUNT(*) AS cnt
    FROM all_resp
    GROUP BY enquiry_id
  )

  SELECT
    (SELECT COUNT(*) FROM all_resp)::bigint,
    ROUND((SELECT AVG(cnt) FROM resp_counts)::numeric, 1),
    (SELECT total_sl_rows  FROM sl_stats),
    (SELECT enq_with_sl    FROM sl_stats),
    (SELECT cnt            FROM conv),
    (SELECT ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hrs)::numeric, 1) FROM resp_hrs),
    (SELECT ROUND(MIN(hrs)::numeric, 1) FROM resp_hrs),
    (SELECT ROUND(MAX(hrs)::numeric, 1) FROM resp_hrs),
    (SELECT cnt FROM no_resp),
    (SELECT COUNT(*)::bigint FROM all_resp ar JOIN issued_enq ie ON ie.id=ar.enquiry_id WHERE ar.response_at <= ie.issued_at);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_report_d_gap_list(p_owner_id uuid DEFAULT NULL::uuid, p_bucket text DEFAULT NULL::text, p_stage text DEFAULT NULL::text, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(contact_id uuid, full_name text, company_name text, stage text, primary_owner_id uuid, primary_owner_name text, last_interaction_at timestamp with time zone, days_silent integer, inactivity_bucket text, is_high_value_gap boolean, open_tasks_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  v_caller   uuid    := current_crm_user_id();
  v_is_admin boolean := is_admin();
  v_owner    uuid;
BEGIN
  IF NOT v_is_admin THEN
    v_owner := v_caller;
  ELSE
    v_owner := p_owner_id;
  END IF;

  RETURN QUERY
  WITH
  -- Active assigned contacts matching filters
  base_contacts AS (
    SELECT DISTINCT
      c.id,
      c.full_name,
      c.stage,
      c.company_id
    FROM contacts c
    -- Must have at least one ACTIVE assignment (primary or secondary)
    WHERE EXISTS (
      SELECT 1 FROM contact_assignments ca
      WHERE ca.contact_id = c.id
        AND ca.status = 'ACTIVE'
        AND (v_owner IS NULL OR ca.assigned_to_crm_user_id = v_owner)
    )
    AND c.is_deleted  = false
    AND c.is_archived = false
    AND (p_stage      IS NULL OR c.stage      = p_stage)
    AND (p_company_id IS NULL OR c.company_id = p_company_id)
  ),
  -- Active primary assignment per contact (most recent)
  primary_owner AS (
    SELECT DISTINCT ON (ca.contact_id)
      ca.contact_id,
      ca.assigned_to_crm_user_id,
      cu.full_name AS owner_name
    FROM contact_assignments ca
    JOIN crm_users cu ON cu.id = ca.assigned_to_crm_user_id
    WHERE ca.status = 'ACTIVE'
      AND lower(trim(ca.assignment_role)) = 'primary'
      AND ca.contact_id IN (SELECT id FROM base_contacts)
    ORDER BY ca.contact_id, ca.assigned_at DESC
  ),
  -- Last interaction per contact
  last_touch AS (
    SELECT
      ci.contact_id,
      MAX(ci.interaction_at) AS last_at
    FROM contact_interactions ci
    WHERE ci.contact_id IN (SELECT id FROM base_contacts)
      AND ci.interaction_at IS NOT NULL
    GROUP BY ci.contact_id
  ),
  -- Open tasks count per contact
  open_tasks AS (
    SELECT
      cf.contact_id,
      COUNT(*) AS cnt
    FROM contact_followups cf
    WHERE cf.status = 'OPEN'
      AND cf.contact_id IN (SELECT id FROM base_contacts)
    GROUP BY cf.contact_id
  ),
  -- Compute days_silent and bucket
  enriched AS (
    SELECT
      bc.id                                        AS contact_id,
      bc.full_name,
      bc.stage,
      bc.company_id,
      po.assigned_to_crm_user_id                  AS primary_owner_id,
      po.owner_name                                AS primary_owner_name,
      lt.last_at                                   AS last_interaction_at,
      CASE
        WHEN lt.last_at IS NULL THEN NULL
        ELSE (CURRENT_DATE - lt.last_at::date)
      END                                          AS days_silent,
      CASE
        WHEN lt.last_at IS NULL
          THEN 'never'
        WHEN (CURRENT_DATE - lt.last_at::date) <= 30
          THEN '0-30'
        WHEN (CURRENT_DATE - lt.last_at::date) <= 60
          THEN '31-60'
        WHEN (CURRENT_DATE - lt.last_at::date) <= 90
          THEN '61-90'
        ELSE '90+'
      END                                          AS inactivity_bucket,
      COALESCE(ot.cnt, 0)                          AS open_tasks_count
    FROM base_contacts bc
    LEFT JOIN primary_owner po ON po.contact_id = bc.id
    LEFT JOIN last_touch    lt ON lt.contact_id  = bc.id
    LEFT JOIN open_tasks    ot ON ot.contact_id  = bc.id
  )
  SELECT
    e.contact_id,
    e.full_name,
    COALESCE(co.company_name, '')                  AS company_name,
    e.stage,
    e.primary_owner_id,
    e.primary_owner_name,
    e.last_interaction_at,
    e.days_silent,
    e.inactivity_bucket,
    -- High-value gap: ASPIRATION or ACHIEVEMENT, and either never contacted or 30d+ silent
    (e.stage IN ('ASPIRATION','ACHIEVEMENT')
      AND (e.last_interaction_at IS NULL
           OR e.days_silent > 30))                 AS is_high_value_gap,
    e.open_tasks_count
  FROM enriched e
  LEFT JOIN companies co ON co.id = e.company_id
  -- Apply bucket filter
  WHERE (p_bucket IS NULL OR e.inactivity_bucket = p_bucket)
  ORDER BY
    -- Never contacted first, then longest silent
    CASE WHEN e.last_interaction_at IS NULL THEN 0 ELSE 1 END,
    e.days_silent DESC NULLS FIRST,
    e.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_audit_contact_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action text;
  v_meta   jsonb := '{}'::jsonb;
BEGIN
  BEGIN  -- inner block: audit failure must not roll back the parent write

    IF TG_OP = 'INSERT' THEN
      v_action := 'ASSIGNED';
      v_meta   := jsonb_build_object(
        'role',   NEW.assignment_role,
        'stage',  NEW.stage,
        'status', NEW.status
      );

    ELSIF TG_OP = 'UPDATE' THEN

      -- Status transition takes precedence in naming
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        CASE NEW.status
          WHEN 'CLOSED'  THEN v_action := 'CLOSED';
          WHEN 'PAUSED'  THEN v_action := 'PAUSED';
          WHEN 'ACTIVE'  THEN
            -- Was it unpaused or reopened?
            v_action := CASE OLD.status WHEN 'PAUSED' THEN 'UNPAUSED' ELSE 'REOPENED' END;
          ELSE v_action := 'STATUS_CHANGED';
        END CASE;
        v_meta := jsonb_build_object(
          'from_status', OLD.status,
          'to_status',   NEW.status
        );

      ELSIF OLD.assigned_to_crm_user_id IS DISTINCT FROM NEW.assigned_to_crm_user_id THEN
        v_action := 'REASSIGNED';
        v_meta   := jsonb_build_object(
          'from_assignee', OLD.assigned_to_crm_user_id,
          'to_assignee',   NEW.assigned_to_crm_user_id
        );

      ELSIF OLD.stage IS DISTINCT FROM NEW.stage THEN
        v_action := 'STAGE_CHANGED';
        v_meta   := jsonb_build_object(
          'from_stage', OLD.stage,
          'to_stage',   NEW.stage
        );

      ELSIF OLD.assignment_role IS DISTINCT FROM NEW.assignment_role THEN
        v_action := 'ROLE_CHANGED';
        v_meta   := jsonb_build_object(
          'from_role', OLD.assignment_role,
          'to_role',   NEW.assignment_role
        );

      ELSE
        -- No auditable change (e.g. updated_by_crm_user_id only) — skip
        RETURN NEW;
      END IF;
    END IF;

    INSERT INTO public.contact_assignment_audit (
      contact_id,
      assignment_id,
      action,
      actor_crm_user_id,
      assignee_crm_user_id,
      stage,
      occurred_at,
      meta
    ) VALUES (
      NEW.contact_id,
      NEW.id,
      v_action,
      COALESCE(NEW.updated_by_crm_user_id, NEW.assigned_by_crm_user_id, public.current_crm_user_id()),
      NEW.assigned_to_crm_user_id,
      NEW.stage,
      now(),
      v_meta
    );

  EXCEPTION WHEN OTHERS THEN
    -- Audit failure must never roll back the parent transaction
    -- In production, consider logging to a dedicated error table
    NULL;
  END;

  RETURN NEW;
END;
$function$
;

create or replace view "public"."active_contacts" as  SELECT id,
    company_id,
    full_name,
    designation,
    country_code,
    phone,
    phone_type,
    email,
    ice_handle,
    preferred_channel,
    interests,
    notes,
    created_at,
    updated_at,
    is_active,
    created_by_crm_user_id,
    additional_emails,
    import_batch_id,
    stage,
    duplicate_status,
    merged_into_contact_id,
    resolved_by,
    resolved_at,
    is_archived,
    archived_at,
    is_deleted,
    deleted_at,
    deleted_by_crm_user_id
   FROM public.contacts c
  WHERE ((is_deleted = false) AND (public.is_admin() OR (EXISTS ( SELECT 1
           FROM public.contact_assignments ca
          WHERE ((ca.contact_id = c.id) AND (ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()))))));


CREATE OR REPLACE FUNCTION public.admin_activity_feed(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS TABLE(activity_at timestamp with time zone, actor_crm_user_id uuid, actor_name text, actor_email text, contact_id uuid, contact_name text, company_name text, activity_type text, assignment_role text, to_stage text, detail_1 text, detail_2 text, detail_3 text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ci.interaction_at                                     AS activity_at,
    ci.user_id                                            AS actor_crm_user_id,
    COALESCE(cu.full_name, cu.email, 'Unknown')           AS actor_name,
    cu.email                                              AS actor_email,
    ci.contact_id                                         AS contact_id,
    COALESCE(c.full_name, 'Unknown Contact')              AS contact_name,
    COALESCE(co.company_name, '')                         AS company_name,
    'INTERACTION'                                         AS activity_type,
    -- assignment_role: active primary assignment at time of interaction
    COALESCE(
      (SELECT lower(trim(ca.assignment_role))
       FROM contact_assignments ca
       WHERE ca.contact_id = ci.contact_id
         AND ca.status = 'ACTIVE'
         AND lower(trim(ca.assignment_role)) = 'primary'
       LIMIT 1),
      ''
    )                                                     AS assignment_role,
    -- to_stage: contact's current stage
    COALESCE(c.stage, '')                                 AS to_stage,
    -- detail_1: interaction type
    COALESCE(ci.interaction_type, '')                     AS detail_1,
    -- detail_2: outcome
    COALESCE(ci.outcome, '')                              AS detail_2,
    -- detail_3: subject / notes (first 120 chars)
    COALESCE(left(ci.notes, 120), '')                     AS detail_3

  FROM contact_interactions ci
  JOIN crm_users cu ON cu.id = ci.user_id
  JOIN contacts c   ON c.id  = ci.contact_id
  LEFT JOIN companies co ON co.id = c.company_id

  WHERE ci.interaction_at BETWEEN p_from AND p_to
    AND c.is_deleted = false

  ORDER BY ci.interaction_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_company_delete_preview(p_company_id uuid)
 RETURNS TABLE(contacts_total bigint, contacts_active bigint, contacts_inactive bigint, contacts_archived bigint, assignments_active bigint, phones bigint, interactions bigint, followups_open bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  WITH c AS (
    SELECT id, is_active, deleted_at
    FROM public.contacts
    WHERE company_id = p_company_id
  )
  SELECT
    (SELECT count(*)  FROM c),
    (SELECT count(*)  FROM c WHERE deleted_at IS NULL AND is_active IS DISTINCT FROM false),
    (SELECT count(*)  FROM c WHERE deleted_at IS NULL AND is_active = false),
    (SELECT count(*)  FROM c WHERE deleted_at IS NOT NULL),
    (SELECT count(*)  FROM public.contact_assignments a  JOIN c ON c.id = a.contact_id WHERE a.status = 'ACTIVE'),
    (SELECT count(*)  FROM public.contact_phones p       JOIN c ON c.id = p.contact_id),
    (SELECT count(*)  FROM public.interactions__legacy i JOIN c ON c.id = i.contact_id),  -- FIX: was public.interactions
    (SELECT count(*)  FROM public.contact_followups f    JOIN c ON c.id = f.contact_id WHERE f.status = 'OPEN');
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_company_purge_contacts(p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Delete child rows in dependency order
  DELETE FROM public.contact_followups f
  USING public.contacts c
  WHERE f.contact_id = c.id AND c.company_id = p_company_id;

  DELETE FROM public.contact_stage_requests r
  USING public.contacts c
  WHERE r.contact_id = c.id AND c.company_id = p_company_id;

  DELETE FROM public.contact_stage_events e
  USING public.contacts c
  WHERE e.contact_id = c.id AND c.company_id = p_company_id;

  -- FIX: was DELETE FROM public.interactions — table does not exist
  DELETE FROM public.interactions__legacy i
  USING public.contacts c
  WHERE i.contact_id = c.id AND c.company_id = p_company_id;

  -- Also clean contact_interactions (V2 table) if it has rows
  DELETE FROM public.contact_interactions li
  USING public.contacts c
  WHERE li.contact_id = c.id AND c.company_id = p_company_id;

  DELETE FROM public.contact_phones p
  USING public.contacts c
  WHERE p.contact_id = c.id AND c.company_id = p_company_id;

  DELETE FROM public.contact_assignments a
  USING public.contacts c
  WHERE a.contact_id = c.id AND c.company_id = p_company_id;

  -- Finally delete the contacts and the company
  DELETE FROM public.contacts WHERE company_id = p_company_id;
  DELETE FROM public.companies WHERE id = p_company_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_primary_contact_owner(p_contact_id uuid, p_assignee_id uuid, p_stage text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_crm_user_id uuid;
  v_existing_id       uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only Admin/CEO can assign contacts';
  END IF;

  SELECT cu.id
    INTO v_admin_crm_user_id
  FROM public.crm_users cu
  WHERE cu.auth_user_id = auth.uid()
    AND cu.active = true
  LIMIT 1;

  IF v_admin_crm_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin CRM user not found for current session';
  END IF;

  -- FIX D: use lowercase 'primary' and 'ACTIVE' (uppercase) to match constraint
  -- FIX A: was 'Active' (title case) — constraint requires 'ACTIVE'
  SELECT ca.id
    INTO v_existing_id
  FROM public.contact_assignments ca
  WHERE ca.contact_id = p_contact_id
    AND lower(TRIM(ca.assignment_role)) = 'primary'
    AND ca.status = 'ACTIVE'
  ORDER BY ca.assigned_at DESC NULLS LAST
  LIMIT 1;

  -- If assigning to the same person who already holds the active primary, just
  -- update stage/audit fields and return
  IF v_existing_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.contact_assignments ca
    WHERE ca.id = v_existing_id
      AND ca.assigned_to_crm_user_id = p_assignee_id
  ) THEN
    UPDATE public.contact_assignments
       SET stage                  = COALESCE(p_stage, stage),
           updated_by_crm_user_id = v_admin_crm_user_id
     WHERE id = v_existing_id;

    RETURN;
  END IF;

  -- End the previous active primary assignment
  -- FIX A: was SET status = 'Ended' — constraint requires 'CLOSED'
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.contact_assignments
       SET status                 = 'CLOSED',
           ended_at               = now(),
           ended_by_crm_user_id   = v_admin_crm_user_id,
           updated_by_crm_user_id = v_admin_crm_user_id
     WHERE id = v_existing_id;
  END IF;

  -- Insert the new active primary assignment
  -- FIX B: was status = 'Active' — constraint requires 'ACTIVE'
  -- FIX C: was stage = 'Cold Calling' — constraint requires 'COLD_CALLING'
  -- FIX D: was assignment_role = 'Primary' — stored consistently as 'primary'
  INSERT INTO public.contact_assignments (
    contact_id,
    assigned_to_crm_user_id,
    assignment_role,
    stage,
    status,
    assigned_at,
    assigned_by_crm_user_id,
    updated_by_crm_user_id,
    created_by_crm_user_id
  ) VALUES (
    p_contact_id,
    p_assignee_id,
    'primary',        -- lowercase; matches constraint lower(TRIM(role)) = 'primary'
    COALESCE(p_stage, 'COLD_CALLING'),  -- was 'Cold Calling'; constraint: uppercase underscore
    'ACTIVE',         -- was 'Active'; constraint: ARRAY['ACTIVE','PAUSED','CLOSED']
    now(),
    v_admin_crm_user_id,
    v_admin_crm_user_id,
    v_admin_crm_user_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_add_contact_interaction(p_contact_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  SELECT exists (
    SELECT 1
    FROM public.contact_assignments ca
    WHERE ca.contact_id = p_contact_id
      AND ca.assigned_to_crm_user_id = public.current_crm_user_id()
      AND ca.status = 'ACTIVE'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_contact_interactions(p_contact_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.contact_assignments ca
      WHERE ca.contact_id = p_contact_id
        AND ca.status = 'ACTIVE'
        AND ca.assigned_to_crm_user_id = public.current_crm_user_id()  -- FIX: was assigned_to = auth.uid()
    )
    OR EXISTS (
      -- Also allow if the user created the contact
      SELECT 1
      FROM public.contacts c
      WHERE c.id = p_contact_id
        AND c.created_by_crm_user_id = public.current_crm_user_id()
    );
$function$
;

create or replace view "public"."contact_duplicate_risk" as  WITH p AS (
         SELECT contact_phones.contact_id,
            contact_phones.phone_number,
            row_number() OVER (PARTITION BY contact_phones.contact_id ORDER BY contact_phones.is_primary DESC, contact_phones.created_at) AS rn
           FROM public.contact_phones
          WHERE ((contact_phones.phone_number IS NOT NULL) AND (length(regexp_replace(contact_phones.phone_number, '[^0-9]'::text, ''::text, 'g'::text)) >= 7))
        ), primary_p AS (
         SELECT p.contact_id,
            p.phone_number
           FROM p
          WHERE (p.rn = 1)
        ), dup AS (
         SELECT primary_p.phone_number,
            count(*) AS cnt
           FROM primary_p
          GROUP BY primary_p.phone_number
         HAVING (count(*) > 1)
        )
 SELECT c.id AS contact_id,
    c.full_name,
    c.email,
    co.company_name,
    pp.phone_number AS primary_phone,
    d.cnt AS duplicate_count
   FROM (((public.contacts c
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
     JOIN primary_p pp ON ((pp.contact_id = c.id)))
     JOIN dup d ON ((d.phone_number = pp.phone_number)));


create or replace view "public"."contacts_with_primary_phone" as  SELECT c.id,
    c.company_id,
    co.company_name,
    c.full_name,
    c.designation,
    c.email,
    c.country_code,
    c.ice_handle,
    c.preferred_channel,
    c.interests,
    c.notes,
    c.is_active,
    c.created_at,
    c.updated_at,
    c.created_by_crm_user_id,
    p.phone_number AS primary_phone,
    p.phone_type AS primary_phone_type
   FROM ((public.contacts c
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
     LEFT JOIN LATERAL ( SELECT cp.phone_number,
            cp.phone_type
           FROM public.contact_phones cp
          WHERE ((cp.contact_id = c.id) AND (cp.is_primary = true))
          ORDER BY cp.created_at
         LIMIT 1) p ON (true));


CREATE OR REPLACE FUNCTION public.get_assignment_summary()
 RETURNS TABLE(user_id uuid, user_name text, total_contacts bigint, primary_count bigint, secondary_count bigint, unassigned_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.id          AS user_id,
    u.full_name   AS user_name,
    count(DISTINCT ca.contact_id)  AS total_contacts,
    count(DISTINCT ca.contact_id) FILTER (WHERE lower(ca.assignment_role) = 'primary')   AS primary_count,
    count(DISTINCT ca.contact_id) FILTER (WHERE lower(ca.assignment_role) = 'secondary') AS secondary_count,
    (
      SELECT count(*)::bigint
      FROM contacts c2
      WHERE c2.created_by_crm_user_id = u.id
        AND c2.is_archived = false
        AND NOT EXISTS (
          SELECT 1 FROM contact_assignments ca2
          WHERE ca2.contact_id = c2.id
            AND lower(ca2.assignment_role) = 'primary'
            AND ca2.status = 'ACTIVE'
        )
    ) AS unassigned_count
  FROM crm_users u
  LEFT JOIN contact_assignments ca
    ON ca.assigned_to_crm_user_id = u.id AND ca.status = 'ACTIVE'
  LEFT JOIN contacts c ON ca.contact_id = c.id AND c.is_archived = false
  WHERE u.active = true
  GROUP BY u.id, u.full_name
  ORDER BY u.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_linked_active_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_users cu
    WHERE cu.auth_user_id = auth.uid()
      AND cu.active = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.log_interaction(p_contact_id uuid, p_interaction_type text, p_notes text, p_subject text DEFAULT NULL::text, p_outcome text DEFAULT NULL::text, p_duration_minutes integer DEFAULT NULL::integer, p_next_action text DEFAULT NULL::text, p_next_action_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_crm_user_id     uuid;
  v_assignment_id   uuid;
  v_interaction_id  uuid;
  v_mapped_type     text;
  v_followup_type   text;
BEGIN
  v_crm_user_id := public.current_crm_user_id();
  IF v_crm_user_id IS NULL THEN
    RAISE EXCEPTION 'No CRM user found for current auth session';
  END IF;

  -- Resolve active assignment for this user+contact
  SELECT id INTO v_assignment_id
  FROM public.contact_assignments
  WHERE contact_id = p_contact_id
    AND assigned_to_crm_user_id = v_crm_user_id
    AND status = 'ACTIVE'
  ORDER BY assigned_at DESC
  LIMIT 1;

  -- Map legacy interaction_type vocabulary to V2
  v_mapped_type := CASE p_interaction_type
    WHEN 'EMAIL'    THEN 'EMAIL_SENT'
    WHEN 'WHATSAPP' THEN 'WHATSAPP_SENT'
    ELSE p_interaction_type  -- CALL, COLD_CALL, MEETING, NOTE pass through unchanged
  END;

  -- Validate mapped type against V2 constraint
  IF v_mapped_type NOT IN (
    'COLD_CALL','CALL','EMAIL_SENT','WHATSAPP_SENT','WHATSAPP_REPLY','MEETING','NOTE'
  ) THEN
    RAISE EXCEPTION 'Invalid interaction_type: %. Valid values: COLD_CALL, CALL, EMAIL_SENT, WHATSAPP_SENT, WHATSAPP_REPLY, MEETING, NOTE', p_interaction_type;
  END IF;

  INSERT INTO public.contact_interactions (
    contact_id,
    user_id,
    assignment_id,
    interaction_type,
    subject,
    notes,
    outcome,
    duration_minutes,
    next_follow_up_at,
    interaction_at,
    created_at,
    updated_at
  ) VALUES (
    p_contact_id,
    v_crm_user_id,
    v_assignment_id,
    v_mapped_type,
    p_subject,
    p_notes,
    p_outcome,
    p_duration_minutes,
    p_next_action_date,
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_interaction_id;

  -- Create followup if a next action date is specified
  IF p_next_action_date IS NOT NULL AND v_assignment_id IS NOT NULL THEN
    -- Map interaction type to followup type (constraint: CALL/EMAIL/MEETING/WHATSAPP/OTHER)
    v_followup_type := CASE v_mapped_type
      WHEN 'CALL'           THEN 'CALL'
      WHEN 'COLD_CALL'      THEN 'CALL'
      WHEN 'EMAIL_SENT'     THEN 'EMAIL'
      WHEN 'WHATSAPP_SENT'  THEN 'WHATSAPP'
      WHEN 'WHATSAPP_REPLY' THEN 'WHATSAPP'
      WHEN 'MEETING'        THEN 'MEETING'
      ELSE                       'OTHER'
    END;

    INSERT INTO public.contact_followups (
      contact_id,
      assignment_id,
      interaction_id,
      followup_type,
      followup_reason,
      notes,
      due_at,
      status,
      created_by
    ) VALUES (
      p_contact_id,
      v_assignment_id,
      v_interaction_id,
      v_followup_type,
      COALESCE(p_next_action, 'Follow up'),
      'Auto-created from interaction: ' || COALESCE(p_subject, v_mapped_type),
      p_next_action_date,
      'OPEN',
      v_crm_user_id
    );
  END IF;

  RETURN v_interaction_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_duplicate_contact(p_action text, p_keep_contact_id uuid, p_other_contact_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now              timestamptz := now();
  v_uid              uuid        := auth.uid();
  v_has_assignments  boolean     := false;
  v_has_interactions boolean     := false;
  v_has_followups    boolean     := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_action NOT IN ('keep_this', 'keep_both', 'delete') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  IF p_action IN ('keep_this', 'delete') AND p_keep_contact_id IS NULL THEN
    RAISE EXCEPTION 'keep_contact_id is required for action %', p_action;
  END IF;

  IF p_other_contact_id IS NULL THEN
    RAISE EXCEPTION 'other_contact_id is required';
  END IF;

  -- Existence checks
  IF NOT EXISTS (SELECT 1 FROM public.contacts WHERE id = p_other_contact_id) THEN
    RAISE EXCEPTION 'Other contact not found: %', p_other_contact_id;
  END IF;

  IF p_keep_contact_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.contacts WHERE id = p_keep_contact_id) THEN
    RAISE EXCEPTION 'Keep contact not found: %', p_keep_contact_id;
  END IF;

  -- Detect linked data (guards the delete path)
  IF to_regclass('public.contact_assignments') IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.contact_assignments
      WHERE contact_id = p_other_contact_id
    ) INTO v_has_assignments;
  END IF;

  -- FIX: was to_regclass('public.interactions') which always returns NULL
  IF to_regclass('public.interactions__legacy') IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.interactions__legacy
      WHERE contact_id = p_other_contact_id
    ) INTO v_has_interactions;
  END IF;

  -- Also check contact_interactions (V2) table
  IF to_regclass('public.contact_interactions') IS NOT NULL THEN
    v_has_interactions := v_has_interactions OR EXISTS(
      SELECT 1 FROM public.contact_interactions
      WHERE contact_id = p_other_contact_id
    );
  END IF;

  IF to_regclass('public.contact_followups') IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.contact_followups
      WHERE contact_id = p_other_contact_id
    ) INTO v_has_followups;
  END IF;

  -- KEEP BOTH: clear duplicate flags on both contacts
  IF p_action = 'keep_both' THEN
    UPDATE public.contacts
       SET duplicate_status      = 'cleared',
           merged_into_contact_id = NULL,
           resolved_by            = v_uid,
           resolved_at            = v_now
     WHERE id IN (p_other_contact_id, COALESCE(p_keep_contact_id, p_other_contact_id));

    RETURN jsonb_build_object(
      'ok',     true,
      'action', p_action,
      'kept',   p_keep_contact_id,
      'other',  p_other_contact_id
    );
  END IF;

  -- KEEP THIS: soft-archive the other contact
  IF p_action = 'keep_this' THEN
    IF p_keep_contact_id = p_other_contact_id THEN
      RAISE EXCEPTION 'keep_contact_id and other_contact_id cannot be the same';
    END IF;

    UPDATE public.contacts
       SET duplicate_status = 'cleared',
           resolved_by      = v_uid,
           resolved_at      = v_now
     WHERE id = p_keep_contact_id;

    UPDATE public.contacts
       SET duplicate_status       = 'resolved',
           merged_into_contact_id = p_keep_contact_id,
           resolved_by            = v_uid,
           resolved_at            = v_now,
           is_archived            = true,
           archived_at            = v_now
     WHERE id = p_other_contact_id;

    RETURN jsonb_build_object(
      'ok',             true,
      'action',         p_action,
      'kept',           p_keep_contact_id,
      'other',          p_other_contact_id,
      'archived_other', true
    );
  END IF;

  -- DELETE: only allowed when there is no linked data
  IF p_action = 'delete' THEN
    IF (v_has_assignments OR v_has_interactions OR v_has_followups) THEN
      RAISE EXCEPTION
        'Delete blocked: contact has linked data (assignments=% interactions=% followups=%). Use Keep This instead.',
        v_has_assignments, v_has_interactions, v_has_followups;
    END IF;

    DELETE FROM public.contacts WHERE id = p_other_contact_id;

    UPDATE public.contacts
       SET duplicate_status = 'cleared',
           resolved_by      = v_uid,
           resolved_at      = v_now
     WHERE id = p_keep_contact_id;

    RETURN jsonb_build_object(
      'ok',            true,
      'action',        p_action,
      'kept',          p_keep_contact_id,
      'deleted_other', p_other_contact_id
    );
  END IF;

  RAISE EXCEPTION 'Unhandled action';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_close_enquiry(p_enquiry_id uuid, p_closed_status text DEFAULT 'COMPLETED'::text, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor uuid;
BEGIN
  -- Validate closed_status against constraint
  IF p_closed_status NOT IN ('WON','LOST','CANCELLED','EXPIRED','NO_OFFER','COMPLETED') THEN
    RAISE EXCEPTION 'Invalid closed_status: %. Use WON, LOST, CANCELLED, EXPIRED, NO_OFFER, or COMPLETED', p_closed_status;
  END IF;

  v_actor := public.current_crm_user_id();

  UPDATE public.enquiries
  SET
    lifecycle_state    = 'CLOSED',
    closed_status      = p_closed_status,
    closed_at          = now(),
    cancellation_reason = coalesce(cancellation_reason, p_reason),
    updated_at         = now()
  WHERE id = p_enquiry_id
    AND (created_by = v_actor OR public.is_admin());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized or enquiry not found: %', p_enquiry_id;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_create_enquiry(p_subject text, p_description text DEFAULT NULL::text, p_enquiry_type text DEFAULT NULL::text, p_enq_type text DEFAULT NULL::text, p_vessel_type text DEFAULT NULL::text, p_cargo_type text DEFAULT NULL::text, p_quantity numeric DEFAULT NULL::numeric, p_quantity_unit text DEFAULT NULL::text, p_loading_port text DEFAULT NULL::text, p_discharge_port text DEFAULT NULL::text, p_laycan_from date DEFAULT NULL::date, p_laycan_to date DEFAULT NULL::date, p_currency text DEFAULT NULL::text, p_budget_min numeric DEFAULT NULL::numeric, p_budget_max numeric DEFAULT NULL::numeric, p_priority text DEFAULT NULL::text, p_is_draft boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor uuid;
  v_id    uuid;
BEGIN
  v_actor := public.current_crm_user_id();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'CRM user mapping missing for this auth user';
  END IF;

  INSERT INTO public.enquiries (
    subject, description, enquiry_type, enq_type,
    vessel_type, cargo_type, quantity, quantity_unit,
    loading_port, discharge_port, laycan_from, laycan_to,
    currency, budget_min, budget_max, priority,
    is_draft, lifecycle_state, status,
    created_by, created_at, updated_at
  ) VALUES (
    p_subject, p_description, p_enquiry_type, p_enq_type,
    p_vessel_type, p_cargo_type, p_quantity, p_quantity_unit,
    p_loading_port, p_discharge_port, p_laycan_from, p_laycan_to,
    p_currency, p_budget_min, p_budget_max, p_priority,
    coalesce(p_is_draft, false),
    CASE WHEN coalesce(p_is_draft,false) THEN 'DRAFT' ELSE 'ISSUED' END,
    'RECEIVED',   -- was 'OPEN' which violated the constraint
    v_actor, now(), now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_create_enquiry_fast(p_mode text, p_subject text, p_cargo_type text DEFAULT NULL::text, p_quantity numeric DEFAULT NULL::numeric, p_quantity_unit text DEFAULT NULL::text, p_vessel_type text DEFAULT NULL::text, p_vessel_name text DEFAULT NULL::text, p_lp text DEFAULT NULL::text, p_dp text DEFAULT NULL::text, p_laycan_from date DEFAULT NULL::date, p_laycan_to date DEFAULT NULL::date, p_priority text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_other_requirements jsonb DEFAULT NULL::jsonb, p_is_draft boolean DEFAULT false, p_actor_crm_user_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor          uuid;
  v_enquiry_id     uuid;
  v_lifecycle      text;
  v_status         text;
  v_issued_at      timestamptz;
BEGIN
  v_actor := coalesce(p_actor_crm_user_id, public.current_crm_user_id());
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'CRM user mapping missing';
  END IF;

  p_mode := upper(trim(p_mode));
  IF p_mode NOT IN ('SPOT','VOY','TC','CVC','BB','SNP') THEN
    RAISE EXCEPTION 'Invalid enquiry mode: %', p_mode;
  END IF;

  IF p_subject IS NULL OR length(trim(p_subject)) = 0 THEN
    RAISE EXCEPTION 'Subject is required';
  END IF;

  IF coalesce(p_is_draft, false) THEN
    v_lifecycle := 'DRAFT';
    v_status    := 'RECEIVED';   -- valid value; lifecycle_state signals draft
    v_issued_at := NULL;
  ELSE
    v_lifecycle := 'ISSUED';
    v_status    := 'RECEIVED';   -- first valid workflow status
    v_issued_at := now();

    -- Required field validation (non-draft only)
    IF p_mode IN ('SPOT','VOY','CVC','BB') THEN
      IF p_cargo_type IS NULL OR p_quantity IS NULL OR p_quantity_unit IS NULL
         OR p_lp IS NULL OR p_dp IS NULL OR p_laycan_from IS NULL OR p_laycan_to IS NULL THEN
        RAISE EXCEPTION 'cargo_type, quantity, quantity_unit, LP, DP, laycan required for %', p_mode;
      END IF;
    END IF;
    IF p_mode = 'TC' THEN
      IF p_vessel_type IS NULL OR p_lp IS NULL OR p_dp IS NULL
         OR p_laycan_from IS NULL OR p_laycan_to IS NULL THEN
        RAISE EXCEPTION 'vessel_type, delivery/redelivery ports, laycan required for TC';
      END IF;
    END IF;
    IF p_mode = 'SNP' THEN
      IF p_vessel_name IS NULL OR p_vessel_type IS NULL OR p_lp IS NULL
         OR p_dp IS NULL OR p_laycan_from IS NULL OR p_laycan_to IS NULL THEN
        RAISE EXCEPTION 'vessel_name, vessel_type, ports, laycan required for SNP';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.enquiries (
    subject, notes, enquiry_mode,
    cargo_type, quantity, quantity_unit,
    vessel_type, vessel_name,
    loading_port, discharge_port, laycan_from, laycan_to,
    priority, other_requirements,
    lifecycle_state, status, is_draft,
    created_by, issued_at, created_at, updated_at
  ) VALUES (
    p_subject, p_notes, p_mode,
    p_cargo_type, p_quantity, p_quantity_unit,
    p_vessel_type, p_vessel_name,
    p_lp, p_dp, p_laycan_from, p_laycan_to,
    p_priority, coalesce(p_other_requirements, '{}'::jsonb),
    v_lifecycle, v_status, coalesce(p_is_draft, false),
    v_actor, v_issued_at, now(), now()
  )
  RETURNING id INTO v_enquiry_id;

  RETURN v_enquiry_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_followups_due_for_notification()
 RETURNS TABLE(followup_id uuid, due_at timestamp with time zone, notified_to uuid, notification_type text, contact_name text, company_name text, reason text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH bounds AS (
  SELECT
    date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata' AS ist_day_start,
    (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day') AT TIME ZONE 'Asia/Kolkata' AS ist_next_day_start
),
base AS (
  SELECT
    cf.id          AS followup_id,
    cf.due_at,
    ca.assigned_to_crm_user_id AS notified_to,
    c.full_name    AS contact_name,
    co.company_name,
    cf.followup_reason AS reason
  FROM public.contact_followups cf
  JOIN public.contact_assignments ca ON ca.id = cf.assignment_id
  JOIN public.contacts c              ON c.id  = cf.contact_id
  LEFT JOIN public.companies co       ON co.id = c.company_id
  WHERE cf.status = 'OPEN'
    AND ca.status = 'ACTIVE'
    AND ca.assigned_to_crm_user_id IS NOT NULL
),
bucketed AS (
  SELECT b.*,
    CASE
      WHEN b.due_at < (SELECT ist_day_start    FROM bounds) THEN 'FOLLOWUP_OVERDUE'
      WHEN b.due_at < (SELECT ist_next_day_start FROM bounds) THEN 'FOLLOWUP_DUE_TODAY'
    END AS notification_type
  FROM base b
)
SELECT followup_id, due_at, notified_to, notification_type,
       contact_name, company_name, reason
FROM bucketed
WHERE notification_type IS NOT NULL
ORDER BY notified_to, due_at ASC;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_followups_next_7_days()
 RETURNS TABLE(followup_id uuid, due_at timestamp with time zone, followup_type text, followup_reason text, notes text, contact_id uuid, contact_name text, company_name text, caller_id uuid, caller_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access restricted';
  END IF;

  RETURN QUERY
  SELECT
    cf.id           AS followup_id,
    cf.due_at,
    cf.followup_type,
    cf.followup_reason,
    cf.notes,
    c.id            AS contact_id,
    c.full_name     AS contact_name,
    co.company_name,
    ca.assigned_to_crm_user_id AS caller_id,
    cu.full_name    AS caller_name,
    cf.created_at
  FROM public.contact_followups cf
  JOIN public.contact_assignments ca ON ca.id = cf.assignment_id
  JOIN public.contacts c              ON c.id  = cf.contact_id
  LEFT JOIN public.companies co       ON co.id = c.company_id
  JOIN public.crm_users cu            ON cu.id = ca.assigned_to_crm_user_id
  WHERE cf.status = 'OPEN'
    AND cf.due_at >= now()
    AND cf.due_at <  now() + interval '7 days'
  ORDER BY cf.due_at ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_interactions_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  v_crm_user_id uuid;
  v_assignment_id uuid;
BEGIN
  v_crm_user_id := public.current_crm_user_id();

  IF v_crm_user_id IS NULL THEN
    RAISE EXCEPTION 'No crm_users row linked to auth user';
  END IF;

  -- Set user_id from logged-in CRM user (V2 column name)
  IF NEW.user_id IS NULL THEN
    NEW.user_id := v_crm_user_id;
  END IF;

  -- Auto-link to active assignment if not provided
  IF NEW.assignment_id IS NULL THEN
    SELECT id INTO v_assignment_id
    FROM public.contact_assignments
    WHERE contact_id = NEW.contact_id
      AND assigned_to_crm_user_id = v_crm_user_id
      AND status = 'ACTIVE'
    ORDER BY assigned_at DESC
    LIMIT 1;
    NEW.assignment_id := v_assignment_id;
  END IF;

  IF NEW.interaction_at IS NULL THEN
    NEW.interaction_at := now();
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_enquiry_status(p_enquiry_id uuid, p_new_status text, p_actual_value numeric DEFAULT NULL::numeric, p_lost_reason text DEFAULT NULL::text, p_lost_to_competitor text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lifecycle   text;
  v_status      text;
  v_closed_st   text;
BEGIN
  -- Map old vocabulary to new
  CASE p_new_status
    WHEN 'WON'    THEN v_lifecycle := 'CLOSED'; v_status := 'FIXED';    v_closed_st := 'WON';
    WHEN 'LOST'   THEN v_lifecycle := 'CLOSED'; v_status := 'FAILED';   v_closed_st := 'LOST';
    WHEN 'CLOSED' THEN v_lifecycle := 'CLOSED'; v_status := 'FIXED';    v_closed_st := 'COMPLETED';
    ELSE
      IF p_new_status NOT IN (
        'RECEIVED','SCREENING','IN_MARKET','OFFER_OUT',
        'COUNTERING','SUBJECTS','FIXED','FAILED','CANCELLED','WITHDRAWN'
      ) THEN
        RAISE EXCEPTION 'Invalid status: %', p_new_status;
      END IF;
      v_lifecycle := CASE WHEN p_new_status IN ('FAILED','CANCELLED','WITHDRAWN') THEN 'CLOSED' ELSE 'ISSUED' END;
      v_status    := p_new_status;
      v_closed_st := CASE WHEN p_new_status = 'CANCELLED' THEN 'CANCELLED' ELSE NULL END;
  END CASE;

  UPDATE public.enquiries
  SET
    status             = v_status,
    lifecycle_state    = v_lifecycle,
    closed_status      = coalesce(v_closed_st, closed_status),
    actual_value       = coalesce(p_actual_value, actual_value),
    lost_reason        = coalesce(p_lost_reason, lost_reason),
    lost_to_competitor = coalesce(p_lost_to_competitor, lost_to_competitor),
    closed_at          = CASE WHEN v_lifecycle = 'CLOSED' THEN now() ELSE closed_at END,
    updated_at         = now()
  WHERE id = p_enquiry_id
    AND (created_by = public.current_crm_user_id() OR public.is_admin());

  RETURN FOUND;
END;
$function$
;

create or replace view "public"."v_all_followups" as  SELECT 'contact'::text AS followup_source,
    cf.id,
    cf.contact_id AS entity_id,
    c.full_name AS entity_name,
    co.company_name,
    cf.followup_type,
    cf.followup_reason,
    cf.notes,
    cf.due_at,
    cf.status,
    cf.recurrence_enabled,
    cf.recurrence_frequency,
    cf.created_by,
    cu.full_name AS created_by_name,
    cf.created_at
   FROM (((public.contact_followups cf
     JOIN public.contacts c ON ((c.id = cf.contact_id)))
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
     JOIN public.crm_users cu ON ((cu.id = cf.created_by)))
UNION ALL
 SELECT 'company'::text AS followup_source,
    cf.id,
    cf.company_id AS entity_id,
    co.company_name AS entity_name,
    co.company_name,
    cf.followup_type,
    cf.followup_reason,
    cf.notes,
    cf.due_at,
    cf.status,
    cf.recurrence_enabled,
    cf.recurrence_frequency,
    cf.created_by,
    cu.full_name AS created_by_name,
    cf.created_at
   FROM ((public.company_followups cf
     JOIN public.companies co ON ((co.id = cf.company_id)))
     JOIN public.crm_users cu ON ((cu.id = cf.created_by)));


create or replace view "public"."v_contact_enquiry_performance" as  SELECT c.id AS contact_id,
    c.full_name,
    e.enq_type,
    count(DISTINCT r.enquiry_id) FILTER (WHERE (e.is_test = false)) AS enquiries_received,
    count(*) FILTER (WHERE ((er.response_type = 'OFFER'::text) AND (e.is_test = false))) AS offers_count,
    count(*) FILTER (WHERE ((er.is_workable = true) AND (e.is_test = false))) AS workable_responses,
    count(*) FILTER (WHERE ((er.is_workable = false) AND (e.is_test = false))) AS non_workable_responses,
    round(
        CASE
            WHEN (count(*) FILTER (WHERE ((er.id IS NOT NULL) AND (e.is_test = false))) = 0) THEN NULL::numeric
            ELSE (((count(*) FILTER (WHERE ((er.is_workable = true) AND (e.is_test = false))))::numeric / (count(*) FILTER (WHERE ((er.id IS NOT NULL) AND (e.is_test = false))))::numeric) * (100)::numeric)
        END, 2) AS workable_rate_pct,
    avg((EXTRACT(epoch FROM (er.response_at - r.sent_at)) / 3600.0)) FILTER (WHERE ((er.id IS NOT NULL) AND (e.is_test = false))) AS avg_response_hours,
    sum(COALESCE(er.effort_minutes, 0)) FILTER (WHERE (e.is_test = false)) AS effort_minutes_total
   FROM (((public.enquiry_recipients r
     JOIN public.enquiries e ON ((e.id = r.enquiry_id)))
     JOIN public.contacts c ON ((c.id = r.contact_id)))
     LEFT JOIN public.enquiry_responses er ON (((er.enquiry_id = r.enquiry_id) AND (er.contact_id = r.contact_id))))
  GROUP BY c.id, c.full_name, e.enq_type;


create or replace view "public"."v_contact_interaction_summary" as  SELECT c.id AS contact_id,
    c.full_name,
    c.email,
    c.phone,
    co.company_name,
    count(ci.id) AS total_interactions,
    count(ci.id) FILTER (WHERE (ci.interaction_type = ANY (ARRAY['CALL'::text, 'COLD_CALL'::text]))) AS total_calls,
    count(ci.id) FILTER (WHERE (ci.interaction_type = 'EMAIL_SENT'::text)) AS total_emails,
    count(ci.id) FILTER (WHERE (ci.interaction_type = 'MEETING'::text)) AS total_meetings,
    max(ci.interaction_at) AS last_interaction_at,
    ( SELECT contact_interactions.interaction_type
           FROM public.contact_interactions
          WHERE (contact_interactions.contact_id = c.id)
          ORDER BY contact_interactions.interaction_at DESC
         LIMIT 1) AS last_interaction_type,
    min(ci.interaction_at) AS first_interaction_at,
    (EXTRACT(day FROM (now() - max(ci.interaction_at))))::integer AS days_since_last_touch,
    count(ci.id) FILTER (WHERE (ci.outcome = ANY (ARRAY['INTERESTED'::text, 'DEAL_PROGRESS'::text, 'MEETING_SCHEDULED'::text]))) AS positive_interactions,
    count(ci.id) FILTER (WHERE (ci.outcome = ANY (ARRAY['NOT_INTERESTED'::text, 'CLOSED_LOST'::text]))) AS negative_interactions,
    count(ci.id) FILTER (WHERE (ci.interaction_at > (now() - '30 days'::interval))) AS interactions_last_30_days
   FROM ((public.contacts c
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
     LEFT JOIN public.contact_interactions ci ON ((ci.contact_id = c.id)))
  GROUP BY c.id, c.full_name, c.email, c.phone, co.company_name;


create or replace view "public"."v_contact_interactions_timeline" as  SELECT ci.id,
    ci.contact_id,
    ci.assignment_id,
    ci.interaction_at,
    ci.interaction_type,
    ci.outcome,
    ci.subject,
    ci.notes,
    ci.user_id AS created_by_crm_user_id,
    cu.auth_user_id AS created_by_auth_user_id,
    cu.full_name AS creator_full_name,
    cu.email AS creator_email,
    cu.role AS creator_role,
    ci.created_at,
    ca.status AS assignment_status,
    ca.stage AS assignment_stage,
    ca.assigned_to_crm_user_id AS assignment_assigned_to,
    ca.assigned_at AS assignment_assigned_at
   FROM ((public.contact_interactions ci
     JOIN public.crm_users cu ON ((cu.id = ci.user_id)))
     LEFT JOIN public.contact_assignments ca ON ((ca.id = ci.assignment_id)));


create or replace view "public"."v_contact_score_by_enq_type" as  SELECT c.id AS contact_id,
    c.full_name,
    e.enq_type,
    count(*) FILTER (WHERE ((er.id IS NOT NULL) AND (e.is_test = false))) AS responses_total,
    count(*) FILTER (WHERE ((er.is_workable = true) AND (e.is_test = false))) AS workable_total,
    round(
        CASE
            WHEN (count(*) FILTER (WHERE ((er.id IS NOT NULL) AND (e.is_test = false))) = 0) THEN NULL::numeric
            ELSE (((count(*) FILTER (WHERE ((er.is_workable = true) AND (e.is_test = false))))::numeric / (count(*) FILTER (WHERE ((er.id IS NOT NULL) AND (e.is_test = false))))::numeric) * (100)::numeric)
        END, 2) AS workable_rate_pct,
    avg((EXTRACT(epoch FROM (er.response_at - r.sent_at)) / 3600.0)) FILTER (WHERE ((er.id IS NOT NULL) AND (e.is_test = false))) AS avg_response_hours,
    max(er.response_at) FILTER (WHERE (e.is_test = false)) AS last_response_at
   FROM (((public.enquiry_recipients r
     JOIN public.enquiries e ON ((e.id = r.enquiry_id)))
     JOIN public.contacts c ON ((c.id = r.contact_id)))
     LEFT JOIN public.enquiry_responses er ON (((er.enquiry_id = r.enquiry_id) AND (er.contact_id = r.contact_id))))
  GROUP BY c.id, c.full_name, e.enq_type;


create or replace view "public"."v_contact_timewaster_watchlist" as  SELECT contact_id,
    full_name,
    sum(enquiries_received) AS enquiries_received,
    sum(workable_responses) AS workable_responses,
    sum(non_workable_responses) AS non_workable_responses,
    sum(effort_minutes_total) AS effort_minutes_total,
    round(
        CASE
            WHEN ((sum(workable_responses) + sum(non_workable_responses)) = (0)::numeric) THEN NULL::numeric
            ELSE ((sum(workable_responses) / (sum(workable_responses) + sum(non_workable_responses))) * (100)::numeric)
        END, 2) AS workable_rate_pct
   FROM public.v_contact_enquiry_performance
  GROUP BY contact_id, full_name
 HAVING ((sum(effort_minutes_total) >= (60)::numeric) AND (COALESCE(((sum(workable_responses) / NULLIF((sum(workable_responses) + sum(non_workable_responses)), (0)::numeric)) * (100)::numeric), (0)::numeric) < (20)::numeric));


create or replace view "public"."v_contact_workability_score" as  SELECT c.id AS contact_id,
    c.full_name,
    count(*) FILTER (WHERE ((er.id IS NOT NULL) AND (e.is_test = false))) AS total_responses,
    count(*) FILTER (WHERE ((er.is_workable = true) AND (e.is_test = false))) AS workable_responses,
    count(*) FILTER (WHERE ((er.is_workable = false) AND (e.is_test = false))) AS non_workable_responses,
        CASE
            WHEN (count(*) FILTER (WHERE ((er.id IS NOT NULL) AND (e.is_test = false))) = 0) THEN NULL::numeric
            ELSE round((((count(*) FILTER (WHERE ((er.is_workable = true) AND (e.is_test = false))))::numeric / (count(*) FILTER (WHERE ((er.id IS NOT NULL) AND (e.is_test = false))))::numeric) * (100)::numeric), 2)
        END AS workable_rate_pct,
    max(er.response_at) FILTER (WHERE (e.is_test = false)) AS last_response_at
   FROM ((public.contacts c
     LEFT JOIN public.enquiry_responses er ON ((er.contact_id = c.id)))
     LEFT JOIN public.enquiries e ON ((e.id = er.enquiry_id)))
  GROUP BY c.id, c.full_name;


create or replace view "public"."v_contacts_last_interaction" as  SELECT c.id AS contact_id,
    li.interaction_at AS last_interaction_at,
    li.interaction_type AS last_interaction_type,
    li.outcome AS last_interaction_outcome
   FROM (public.contacts c
     LEFT JOIN LATERAL ( SELECT contact_interactions.interaction_at,
            contact_interactions.interaction_type,
            contact_interactions.outcome
           FROM public.contact_interactions
          WHERE (contact_interactions.contact_id = c.id)
          ORDER BY contact_interactions.interaction_at DESC
         LIMIT 1) li ON (true));


create or replace view "public"."v_contacts_with_assignments" as  SELECT c.id,
    c.company_id,
    c.full_name,
    c.designation,
    c.country_code,
    c.phone,
    c.phone_type,
    c.email,
    c.ice_handle,
    c.preferred_channel,
    c.interests,
    c.notes,
    c.created_at,
    c.updated_at,
    c.is_active,
    c.created_by_crm_user_id,
    ca.id AS assignment_id,
    ca.assigned_to_crm_user_id,
    ca.status AS assignment_status,
    ca.stage,
    ca.assignment_role,
    ca.assigned_at,
    cu.full_name AS assigned_to_name,
    cu.email AS assigned_to_email
   FROM ((public.contacts c
     LEFT JOIN public.contact_assignments ca ON (((ca.contact_id = c.id) AND (ca.status = 'ACTIVE'::text))))
     LEFT JOIN public.crm_users cu ON ((cu.id = ca.assigned_to_crm_user_id)));


create or replace view "public"."v_contacts_workbench_all" as  SELECT ca.assigned_to_crm_user_id AS user_id,
    ca.contact_id,
    ca.stage,
    ca.status AS assignment_status,
    ca.assigned_at,
    ca.notes AS assignment_notes,
    c.full_name,
    c.designation,
    c.company_id,
    c.preferred_channel,
    c.ice_handle,
    max(ci.interaction_at) AS last_touch_at,
    ( SELECT min(fu.due_at) AS min
           FROM public.contact_followups fu
          WHERE ((fu.contact_id = ca.contact_id) AND (fu.assigned_to_crm_user_id = ca.assigned_to_crm_user_id) AND (fu.status = 'OPEN'::text))) AS next_follow_up_at
   FROM ((public.contact_assignments ca
     JOIN public.contacts c ON ((c.id = ca.contact_id)))
     LEFT JOIN public.contact_interactions ci ON (((ci.contact_id = ca.contact_id) AND (ci.user_id = ca.assigned_to_crm_user_id))))
  WHERE (ca.status = 'ACTIVE'::text)
  GROUP BY ca.assigned_to_crm_user_id, ca.contact_id, ca.stage, ca.status, ca.assigned_at, ca.notes, c.full_name, c.designation, c.company_id, c.preferred_channel, c.ice_handle;


create or replace view "public"."v_directory_contacts" as  WITH primary_assignment AS (
         SELECT DISTINCT ON (ca.contact_id) ca.contact_id,
            ca.assigned_to_crm_user_id AS primary_owner_id,
            ca.stage AS primary_stage,
            ca.assigned_at
           FROM public.contact_assignments ca
          WHERE ((ca.status = 'ACTIVE'::text) AND (upper(ca.assignment_role) = 'PRIMARY'::text))
          ORDER BY ca.contact_id, ca.assigned_at DESC
        ), secondary_assignment AS (
         SELECT DISTINCT ON (ca.contact_id) ca.contact_id,
            ca.assigned_to_crm_user_id AS secondary_owner_id,
            ca.assigned_at
           FROM public.contact_assignments ca
          WHERE ((ca.status = 'ACTIVE'::text) AND (upper(ca.assignment_role) = 'SECONDARY'::text))
          ORDER BY ca.contact_id, ca.assigned_at DESC
        )
 SELECT c.id,
    c.full_name,
    c.email,
    c.company_id,
    co.company_name,
    c.created_at,
    c.created_by_crm_user_id,
    c.is_active,
    p.primary_owner_id,
    p.primary_stage,
    s.secondary_owner_id,
    (p.primary_owner_id IS NULL) AS is_unassigned
   FROM (((public.contacts c
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
     LEFT JOIN primary_assignment p ON ((p.contact_id = c.id)))
     LEFT JOIN secondary_assignment s ON ((s.contact_id = c.id)))
  WHERE (c.deleted_at IS NULL);


create or replace view "public"."v_directory_owner_snapshot" as  SELECT c.id AS contact_id,
    p.assigned_to_crm_user_id AS primary_owner_id,
    u1.full_name AS primary_owner_name,
    s.assigned_to_crm_user_id AS secondary_owner_id,
    u2.full_name AS secondary_owner_name
   FROM ((((public.contacts c
     LEFT JOIN LATERAL ( SELECT ca.assigned_to_crm_user_id
           FROM public.contact_assignments ca
          WHERE ((ca.contact_id = c.id) AND (lower(TRIM(BOTH FROM ca.assignment_role)) = 'primary'::text) AND (ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL))
          ORDER BY ca.assigned_at DESC
         LIMIT 1) p ON (true))
     LEFT JOIN public.crm_users u1 ON ((u1.id = p.assigned_to_crm_user_id)))
     LEFT JOIN LATERAL ( SELECT ca.assigned_to_crm_user_id
           FROM public.contact_assignments ca
          WHERE ((ca.contact_id = c.id) AND (lower(TRIM(BOTH FROM ca.assignment_role)) = 'secondary'::text) AND (ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL))
          ORDER BY ca.assigned_at DESC
         LIMIT 1) s ON (true))
     LEFT JOIN public.crm_users u2 ON ((u2.id = s.assigned_to_crm_user_id)));


create or replace view "public"."v_directory_stage_counts" as  SELECT upper(replace(TRIM(BOTH FROM COALESCE(primary_stage, 'INACTIVE'::text)), ' '::text, '_'::text)) AS stage,
    (count(*))::integer AS cnt
   FROM public.v_directory_contacts dc
  GROUP BY (upper(replace(TRIM(BOTH FROM COALESCE(primary_stage, 'INACTIVE'::text)), ' '::text, '_'::text)));


create or replace view "public"."v_enquiry_pipeline" as  SELECT e.id,
    e.enquiry_number,
    e.subject,
    e.enquiry_type,
    e.status,
    e.priority,
    e.our_estimate AS estimated_value,
    e.actual_value,
    e.win_probability,
    e.offer_time AS expected_close_date,
    e.currency,
    round(((e.our_estimate * (COALESCE(e.win_probability, 50))::numeric) / 100.0), 2) AS weighted_value,
    c.full_name AS contact_name,
    c.email AS contact_email,
    c.phone AS contact_phone,
    co.company_name,
    e.assigned_to,
    cu.full_name AS assigned_to_name,
    e.assigned_at,
    e.created_at,
    e.updated_at,
    e.closed_at,
    EXTRACT(day FROM (now() - e.created_at)) AS days_open,
    ca.stage AS contact_stage,
    ca.assignment_role,
    ( SELECT count(*) AS count
           FROM public.enquiry_quotes eq
          WHERE (eq.enquiry_id = e.id)) AS quote_count,
    ( SELECT max(eq.sent_at) AS max
           FROM public.enquiry_quotes eq
          WHERE (eq.enquiry_id = e.id)) AS last_quote_sent,
    ( SELECT count(*) AS count
           FROM public.enquiry_activities ea
          WHERE (ea.enquiry_id = e.id)) AS activity_count
   FROM ((((public.enquiries e
     JOIN public.contacts c ON ((c.id = e.contact_id)))
     LEFT JOIN public.companies co ON ((co.id = e.company_id)))
     LEFT JOIN public.crm_users cu ON ((cu.id = e.assigned_to)))
     LEFT JOIN public.contact_assignments ca ON ((ca.id = e.assignment_id)))
  WHERE (e.status <> 'CANCELLED'::text);


create or replace view "public"."v_enquiry_summary_by_status" as  SELECT e.assigned_to AS user_id,
    cu.full_name AS user_name,
    count(*) FILTER (WHERE (e.status = 'RECEIVED'::text)) AS received_count,
    count(*) FILTER (WHERE (e.status = 'SCREENING'::text)) AS screening_count,
    count(*) FILTER (WHERE (e.status = 'IN_MARKET'::text)) AS in_market_count,
    count(*) FILTER (WHERE (e.status = 'OFFER_OUT'::text)) AS offer_out_count,
    count(*) FILTER (WHERE (e.status = 'COUNTERING'::text)) AS countering_count,
    count(*) FILTER (WHERE (e.status = 'SUBJECTS'::text)) AS subjects_count,
    count(*) FILTER (WHERE (e.status = 'FIXED'::text)) AS fixed_count,
    count(*) FILTER (WHERE (e.status = ANY (ARRAY['FAILED'::text, 'WITHDRAWN'::text]))) AS lost_count,
    sum(e.our_estimate) FILTER (WHERE ((e.lifecycle_state = 'ISSUED'::text) AND (e.status <> ALL (ARRAY['FAILED'::text, 'CANCELLED'::text, 'WITHDRAWN'::text])))) AS pipeline_value,
    sum(e.actual_value) FILTER (WHERE (e.closed_status = 'WON'::text)) AS won_value,
    sum(e.our_estimate) FILTER (WHERE (e.closed_status = 'LOST'::text)) AS lost_value,
    sum(((e.our_estimate * (COALESCE(e.win_probability, 50))::numeric) / 100.0)) FILTER (WHERE (e.lifecycle_state = 'ISSUED'::text)) AS weighted_pipeline,
    round(((100.0 * (count(*) FILTER (WHERE (e.closed_status = 'WON'::text)))::numeric) / (NULLIF(count(*) FILTER (WHERE (e.closed_status = ANY (ARRAY['WON'::text, 'LOST'::text]))), 0))::numeric), 1) AS win_rate_percent
   FROM (public.enquiries e
     JOIN public.crm_users cu ON ((cu.id = e.assigned_to)))
  WHERE (e.assigned_to IS NOT NULL)
  GROUP BY e.assigned_to, cu.full_name;


create or replace view "public"."v_followup_queue_all__legacy" as  SELECT fu.assigned_to AS user_id,
    fu.id AS followup_id,
    fu.contact_id,
    fu.due_at,
    fu.status,
    fu.priority,
    fu.notes AS followup_notes,
    c.full_name,
    c.preferred_channel,
    c.ice_handle
   FROM (public.follow_ups__legacy fu
     JOIN public.contacts c ON ((c.id = fu.contact_id)))
  WHERE (fu.status = 'OPEN'::text);


create or replace view "public"."v_followup_queue_all_v2" as  SELECT ci.id,
    ci.contact_id,
    ci.user_id,
    ci.next_follow_up_at,
    ci.notes,
    c.full_name AS contact_name
   FROM (public.contact_interactions ci
     LEFT JOIN public.contacts c ON ((c.id = ci.contact_id)))
  WHERE (ci.next_follow_up_at IS NOT NULL)
  ORDER BY ci.next_follow_up_at;


create or replace view "public"."v_interaction_timeline__legacy" as  SELECT ci.id,
    ci.contact_id,
    ci.interaction_type,
    ci.subject,
    ci.notes,
    ci.outcome,
    ci.duration_minutes,
    NULL::text AS next_action,
    ci.next_follow_up_at AS next_action_date,
    ci.interaction_at,
    ci.created_at,
    cu.id AS created_by_id,
    cu.full_name AS created_by_name,
    cu.email AS created_by_email,
    c.full_name AS contact_name,
    c.email AS contact_email,
    c.phone AS contact_phone,
    co.company_name,
    ca.stage AS assignment_stage,
    ca.assignment_role,
        CASE
            WHEN (ci.interaction_at > (now() - '01:00:00'::interval)) THEN 'Just now'::text
            WHEN (ci.interaction_at > (now() - '1 day'::interval)) THEN 'Today'::text
            WHEN (ci.interaction_at > (now() - '2 days'::interval)) THEN 'Yesterday'::text
            WHEN (ci.interaction_at > (now() - '7 days'::interval)) THEN 'This week'::text
            WHEN (ci.interaction_at > (now() - '30 days'::interval)) THEN 'This month'::text
            ELSE to_char(ci.interaction_at, 'Mon DD, YYYY'::text)
        END AS time_label,
        CASE
            WHEN (ci.next_follow_up_at IS NOT NULL) THEN (EXISTS ( SELECT 1
               FROM public.contact_followups cf
              WHERE ((cf.contact_id = ci.contact_id) AND (cf.interaction_id = ci.id) AND (cf.status = 'COMPLETED'::text))))
            ELSE NULL::boolean
        END AS followup_completed
   FROM ((((public.contact_interactions ci
     JOIN public.crm_users cu ON ((cu.id = ci.user_id)))
     JOIN public.contacts c ON ((c.id = ci.contact_id)))
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
     LEFT JOIN public.contact_assignments ca ON ((ca.id = ci.assignment_id)))
  ORDER BY ci.interaction_at DESC;


create or replace view "public"."v_interaction_timeline_v2" as  SELECT ci.id,
    ci.contact_id,
    ci.user_id,
    ci.interaction_type,
    ci.direction,
    ci.interaction_at,
    ci.outcome,
    ci.notes,
    ci.created_at,
    c.full_name AS contact_name
   FROM (public.contact_interactions ci
     LEFT JOIN public.contacts c ON ((c.id = ci.contact_id)))
  ORDER BY ci.interaction_at DESC NULLS LAST;


create or replace view "public"."v_my_added_unassigned" as  SELECT c.id,
    c.full_name,
    c.company_id,
    comp.company_name,
    c.designation,
    c.country_code,
    c.phone,
    c.email,
    c.ice_handle,
    c.preferred_channel,
    c.created_at,
    c.updated_at,
    (EXTRACT(epoch FROM (now() - c.created_at)) / (86400)::numeric) AS days_since_added
   FROM (public.contacts c
     LEFT JOIN public.companies comp ON ((comp.id = c.company_id)))
  WHERE ((c.created_by_crm_user_id = public.current_crm_user_id()) AND (NOT (EXISTS ( SELECT 1
           FROM public.contact_assignments ca
          WHERE ((ca.contact_id = c.id) AND (ca.status = 'ACTIVE'::text))))))
  ORDER BY c.created_at DESC;


create or replace view "public"."v_my_contacts" as  SELECT c.id AS contact_id,
    c.full_name,
    c.company_id,
    co.company_name,
    ca.assignment_role,
    ca.stage,
    ca.status,
    ca.assigned_at,
    ca.assigned_to_crm_user_id
   FROM ((public.contact_assignments ca
     JOIN public.contacts c ON ((c.id = ca.contact_id)))
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
  WHERE ((ca.ended_at IS NULL) AND (ca.status = 'ACTIVE'::text) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()));


create or replace view "public"."v_my_pending_nudges" as  SELECT cf.id AS followup_id,
    cf.contact_id,
    c.full_name AS contact_name,
    c.company_id,
    comp.company_name,
    cf.followup_type,
    cf.followup_reason,
    cf.notes,
    cf.due_at,
    cf.status,
    cf.acknowledged_at,
    cf.completed_at,
    cf.created_at,
    cu_creator.id AS created_by_id,
    cu_creator.full_name AS created_by_name,
    cu_creator.email AS created_by_email,
    cf.assigned_to_crm_user_id,
        CASE
            WHEN ((cf.due_at < now()) AND (cf.status <> ALL (ARRAY['COMPLETED'::text, 'CANCELLED'::text]))) THEN 'OVERDUE'::text
            WHEN (cf.status = 'OPEN'::text) THEN 'PENDING'::text
            WHEN (cf.status = 'ACKNOWLEDGED'::text) THEN 'ACKNOWLEDGED'::text
            ELSE cf.status
        END AS display_status,
    (EXTRACT(epoch FROM (cf.due_at - now())) / (3600)::numeric) AS hours_until_due
   FROM (((public.contact_followups cf
     JOIN public.contacts c ON ((c.id = cf.contact_id)))
     LEFT JOIN public.companies comp ON ((comp.id = c.company_id)))
     JOIN public.crm_users cu_creator ON ((cu_creator.id = cf.created_by)))
  WHERE ((cf.assigned_to_crm_user_id = public.current_crm_user_id()) AND (cf.status <> ALL (ARRAY['COMPLETED'::text, 'CANCELLED'::text])))
  ORDER BY cf.due_at;


create or replace view "public"."v_my_primary_contacts" as  SELECT c.id AS contact_id,
    c.full_name,
    c.company_id,
    co.company_name,
    c.country_code,
    c.phone,
    c.email,
    c.designation,
    c.is_active,
    ca.stage,
    ca.assigned_at,
    ca.assigned_to_crm_user_id
   FROM ((public.contact_assignments ca
     JOIN public.contacts c ON ((c.id = ca.contact_id)))
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
  WHERE ((ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL) AND (upper(TRIM(BOTH FROM ca.assignment_role)) = 'PRIMARY'::text) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()) AND (c.is_deleted = false) AND (COALESCE(c.is_archived, false) = false) AND (COALESCE(c.is_active, true) = true));


create or replace view "public"."v_my_primary_pipeline" as  SELECT c.id,
    c.full_name,
    c.email,
    c.is_active,
    c.company_id,
    co.company_name,
    cp.primary_phone,
    cp.primary_phone_type,
    ca.stage,
    ca.status,
    ca.assignment_role,
    l.last_interaction_at,
    nf.due_at AS next_followup_due_at,
    nf.followup_type AS next_followup_type,
    nf.followup_reason AS next_followup_reason
   FROM (((((public.contact_assignments ca
     JOIN public.contacts c ON ((c.id = ca.contact_id)))
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
     LEFT JOIN public.contacts_with_primary_phone cp ON ((cp.id = c.id)))
     LEFT JOIN public.v_contacts_last_interaction l ON ((l.contact_id = c.id)))
     LEFT JOIN LATERAL ( SELECT f.due_at,
            f.followup_type,
            f.followup_reason
           FROM public.v_all_followups f
          WHERE ((f.entity_id = c.id) AND (f.status = 'OPEN'::text) AND (f.due_at IS NOT NULL))
          ORDER BY f.due_at
         LIMIT 1) nf ON (true))
  WHERE ((ca.assignment_role = 'PRIMARY'::text) AND (ca.status = 'ACTIVE'::text));


create or replace view "public"."v_my_secondary_contacts" as  WITH primary_stage AS (
         SELECT DISTINCT ON (ca_1.contact_id) ca_1.contact_id,
            ca_1.stage AS primary_stage
           FROM public.contact_assignments ca_1
          WHERE ((ca_1.status = 'ACTIVE'::text) AND (ca_1.ended_at IS NULL) AND (upper(TRIM(BOTH FROM ca_1.assignment_role)) = 'PRIMARY'::text))
          ORDER BY ca_1.contact_id, ca_1.assigned_at DESC
        )
 SELECT c.id AS contact_id,
    c.full_name,
    c.company_id,
    co.company_name,
    c.designation,
    c.email,
    c.country_code,
    c.phone,
    c.ice_handle,
    c.preferred_channel,
    c.interests,
    c.notes,
    c.is_active,
    ps.primary_stage AS stage,
    ca.status,
    ca.assigned_at,
    ca.assigned_to_crm_user_id
   FROM (((public.contact_assignments ca
     JOIN public.contacts c ON ((c.id = ca.contact_id)))
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
     LEFT JOIN primary_stage ps ON ((ps.contact_id = c.id)))
  WHERE ((ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL) AND (upper(TRIM(BOTH FROM ca.assignment_role)) = 'SECONDARY'::text) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()) AND (c.is_deleted = false));


create or replace view "public"."v_nudges_i_created" as  SELECT cf.id AS followup_id,
    cf.contact_id,
    c.full_name AS contact_name,
    c.company_id,
    comp.company_name,
    cf.followup_type,
    cf.followup_reason,
    cf.notes,
    cf.due_at,
    cf.status,
    cf.acknowledged_at,
    cf.acknowledged_by_crm_user_id,
    cu_ack.full_name AS acknowledged_by_name,
    cf.completed_at,
    cf.created_at,
    cf.assigned_to_crm_user_id,
    cu_assigned.full_name AS assigned_to_name,
    cu_assigned.email AS assigned_to_email,
        CASE
            WHEN (cf.status = 'COMPLETED'::text) THEN 'COMPLETED'::text
            WHEN (cf.status = 'CANCELLED'::text) THEN 'CANCELLED'::text
            WHEN (cf.acknowledged_at IS NOT NULL) THEN 'ACKNOWLEDGED'::text
            WHEN (cf.due_at < now()) THEN 'OVERDUE'::text
            ELSE 'PENDING'::text
        END AS display_status
   FROM ((((public.contact_followups cf
     JOIN public.contacts c ON ((c.id = cf.contact_id)))
     LEFT JOIN public.companies comp ON ((comp.id = c.company_id)))
     LEFT JOIN public.crm_users cu_assigned ON ((cu_assigned.id = cf.assigned_to_crm_user_id)))
     LEFT JOIN public.crm_users cu_ack ON ((cu_ack.id = cf.acknowledged_by_crm_user_id)))
  WHERE (cf.created_by = public.current_crm_user_id())
  ORDER BY cf.created_at DESC;


create or replace view "public"."v_owner_contact_counts" as  SELECT ca.assigned_to_crm_user_id AS owner_crm_user_id,
    count(DISTINCT
        CASE
            WHEN (ca.assignment_role = 'PRIMARY'::text) THEN ca.contact_id
            ELSE NULL::uuid
        END) AS primary_count,
    count(DISTINCT
        CASE
            WHEN (ca.assignment_role = 'SECONDARY'::text) THEN ca.contact_id
            ELSE NULL::uuid
        END) AS secondary_count,
    count(DISTINCT ca.contact_id) AS total_count
   FROM (public.contact_assignments ca
     JOIN public.contacts c ON ((c.id = ca.contact_id)))
  WHERE ((ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL) AND (ca.assignment_role = ANY (ARRAY['PRIMARY'::text, 'SECONDARY'::text])) AND (c.deleted_at IS NULL) AND (c.is_active IS DISTINCT FROM false))
  GROUP BY ca.assigned_to_crm_user_id;


create or replace view "public"."v_owner_summary" as  SELECT ca.assigned_to_crm_user_id,
    (sum(
        CASE
            WHEN (upper(COALESCE(ca.assignment_role, 'PRIMARY'::text)) = 'PRIMARY'::text) THEN 1
            ELSE 0
        END))::integer AS primary_count,
    (sum(
        CASE
            WHEN (upper(COALESCE(ca.assignment_role, 'PRIMARY'::text)) = 'SECONDARY'::text) THEN 1
            ELSE 0
        END))::integer AS secondary_count,
    (count(*))::integer AS total_count
   FROM (public.contact_assignments ca
     JOIN public.contacts c ON ((c.id = ca.contact_id)))
  WHERE ((ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL) AND (c.is_deleted = false))
  GROUP BY ca.assigned_to_crm_user_id;


create or replace view "public"."v_owner_summary_ui" as  SELECT s.assigned_to_crm_user_id,
    COALESCE(u.full_name, u.email, 'UNASSIGNED'::text) AS assigned_to_name,
    s.primary_count,
    s.secondary_count,
    s.total_count
   FROM (public.v_owner_summary s
     LEFT JOIN public.crm_users u ON ((u.id = s.assigned_to_crm_user_id)))
  ORDER BY s.total_count DESC, COALESCE(u.full_name, u.email, 'UNASSIGNED'::text);


create or replace view "public"."v_pending_inactive_requests" as  SELECT csr.id AS request_id,
    csr.contact_id,
    c.full_name AS contact_name,
    c.company_id,
    comp.company_name,
    ca.stage AS current_stage,
    csr.requested_stage,
    csr.requested_by_crm_user_id,
    cu.full_name AS requested_by_name,
    cu.email AS requested_by_email,
    csr.requested_at,
    csr.decision_notes AS reason,
    csr.status,
    (EXTRACT(epoch FROM (now() - csr.requested_at)) / (3600)::numeric) AS hours_pending
   FROM ((((public.contact_stage_requests csr
     JOIN public.contacts c ON ((c.id = csr.contact_id)))
     LEFT JOIN public.companies comp ON ((comp.id = c.company_id)))
     JOIN public.crm_users cu ON ((cu.id = csr.requested_by_crm_user_id)))
     LEFT JOIN public.contact_assignments ca ON (((ca.contact_id = csr.contact_id) AND (ca.status = 'ACTIVE'::text))))
  WHERE ((csr.status = 'PENDING'::text) AND (csr.requested_stage = 'INACTIVE'::text))
  ORDER BY csr.requested_at;


create or replace view "public"."v_recommended_contacts" as  SELECT contact_id,
    full_name,
    enq_type,
    responses_total,
    workable_total,
    workable_rate_pct,
    avg_response_hours,
    last_response_at,
    row_number() OVER (PARTITION BY enq_type ORDER BY workable_rate_pct DESC NULLS LAST, responses_total DESC, avg_response_hours, last_response_at DESC NULLS LAST) AS rank_in_type
   FROM public.v_contact_score_by_enq_type s;


create or replace view "public"."v_recommended_contacts_weighted" as  SELECT c.id AS contact_id,
    c.full_name,
    w.enq_type,
    sum(w.recency_weight) AS weighted_responses,
    sum(w.recency_weight) FILTER (WHERE (w.is_workable = true)) AS weighted_workable,
    round(
        CASE
            WHEN (sum(w.recency_weight) = (0)::numeric) THEN (0)::numeric
            ELSE ((sum(w.recency_weight) FILTER (WHERE (w.is_workable = true)) / sum(w.recency_weight)) * (100)::numeric)
        END, 2) AS workable_score,
    COALESCE(p.penalty_points, (0)::bigint) AS penalty_points,
    GREATEST((round(
        CASE
            WHEN (sum(w.recency_weight) = (0)::numeric) THEN (0)::numeric
            ELSE ((sum(w.recency_weight) FILTER (WHERE (w.is_workable = true)) / sum(w.recency_weight)) * (100)::numeric)
        END, 2) - (COALESCE(p.penalty_points, (0)::bigint))::numeric), (0)::numeric) AS final_score,
    max(w.response_at) AS last_response_at
   FROM ((public.v_enquiry_response_weighted w
     JOIN public.contacts c ON ((c.id = w.contact_id)))
     LEFT JOIN public.v_contact_penalties p ON (((p.contact_id = w.contact_id) AND (p.enq_type = w.enq_type))))
  GROUP BY c.id, c.full_name, w.enq_type, p.penalty_points;


create or replace view "public"."v_recurring_followup_chains" as  SELECT COALESCE(cf.parent_followup_id, cf.id) AS chain_root_id,
    cf.id AS followup_id,
    cf.contact_id,
    c.full_name AS contact_name,
    co.company_name,
    cf.followup_type,
    cf.followup_reason,
    cf.status,
    cf.due_at,
    cf.completed_at,
    cf.recurrence_enabled,
    cf.recurrence_frequency,
    cf.recurrence_interval,
    cf.recurrence_end_date,
    cf.recurrence_count,
    cf.created_by,
    cu.full_name AS created_by_name,
    count(*) OVER (PARTITION BY COALESCE(cf.parent_followup_id, cf.id)) AS total_in_chain,
    row_number() OVER (PARTITION BY COALESCE(cf.parent_followup_id, cf.id) ORDER BY cf.due_at) AS sequence_in_chain,
        CASE
            WHEN (cf.recurrence_enabled AND (cf.status = 'OPEN'::text)) THEN public.calculate_next_followup_date(cf.due_at, cf.recurrence_frequency, COALESCE(cf.recurrence_interval, 1))
            ELSE NULL::timestamp with time zone
        END AS next_occurrence
   FROM (((public.contact_followups cf
     JOIN public.contacts c ON ((c.id = cf.contact_id)))
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
     LEFT JOIN public.crm_users cu ON ((cu.id = cf.created_by)))
  WHERE ((cf.recurrence_enabled = true) OR (cf.parent_followup_id IS NOT NULL))
  ORDER BY COALESCE(cf.parent_followup_id, cf.id), (row_number() OVER (PARTITION BY COALESCE(cf.parent_followup_id, cf.id) ORDER BY cf.due_at));


create or replace view "public"."v_team_activity_snapshot" as  SELECT u.id AS crm_user_id,
    u.full_name AS team_member,
    count(DISTINCT ca.contact_id) FILTER (WHERE (ca.status = 'ACTIVE'::text)) AS active_contacts,
    count(ci.id) FILTER (WHERE (ci.interaction_at >= date_trunc('day'::text, now()))) AS interactions_today,
    count(DISTINCT ca.contact_id) FILTER (WHERE ((li.last_interaction_at < (now() - '14 days'::interval)) OR (li.last_interaction_at IS NULL))) AS stale_contacts
   FROM (((public.crm_users u
     LEFT JOIN public.contact_assignments ca ON (((ca.assigned_to_crm_user_id = u.id) AND (ca.status = 'ACTIVE'::text))))
     LEFT JOIN public.v_contacts_last_interaction li ON ((li.contact_id = ca.contact_id)))
     LEFT JOIN public.contact_interactions ci ON (((ci.contact_id = ca.contact_id) AND (ci.user_id = u.id))))
  GROUP BY u.id, u.full_name;


create or replace view "public"."v_unassigned_active_contacts" as  SELECT id AS contact_id
   FROM public.contacts c
  WHERE ((deleted_at IS NULL) AND (is_active IS DISTINCT FROM false) AND (NOT (EXISTS ( SELECT 1
           FROM public.contact_assignments ca
          WHERE ((ca.contact_id = c.id) AND (ca.assignment_role = 'PRIMARY'::text) AND (ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL))))));


create or replace view "public"."v_unassigned_contacts" as  SELECT c.id,
    c.full_name,
    c.company_id,
    comp.company_name,
    c.designation,
    c.country_code,
    c.phone,
    c.email,
    c.ice_handle,
    c.preferred_channel,
    c.created_by_crm_user_id,
    cu.full_name AS created_by_name,
    cu.email AS created_by_email,
    c.created_at,
    c.updated_at,
    (EXTRACT(epoch FROM (now() - c.created_at)) / (86400)::numeric) AS days_unassigned
   FROM ((public.contacts c
     LEFT JOIN public.crm_users cu ON ((cu.id = c.created_by_crm_user_id)))
     LEFT JOIN public.companies comp ON ((comp.id = c.company_id)))
  WHERE ((c.deleted_at IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM public.contact_assignments ca
          WHERE ((ca.contact_id = c.id) AND (lower(ca.assignment_role) = 'primary'::text) AND (ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL))))))
  ORDER BY c.created_at DESC;


create or replace view "public"."v_user_activity_summary" as  SELECT cu.id AS user_id,
    cu.full_name,
    cu.email,
    cu.role,
    count(DISTINCT ci.id) FILTER (WHERE (ci.interaction_at >= CURRENT_DATE)) AS interactions_today,
    count(DISTINCT ci.id) FILTER (WHERE ((ci.interaction_at >= CURRENT_DATE) AND (ci.interaction_type = ANY (ARRAY['CALL'::text, 'COLD_CALL'::text])))) AS calls_today,
    count(DISTINCT ci.id) FILTER (WHERE ((ci.interaction_at >= CURRENT_DATE) AND (ci.interaction_type = 'EMAIL_SENT'::text))) AS emails_today,
    count(DISTINCT ci.id) FILTER (WHERE (ci.interaction_at >= date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone))) AS interactions_this_week,
    count(DISTINCT ci.id) FILTER (WHERE (ci.interaction_at >= date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))) AS interactions_this_month,
    count(DISTINCT ci.id) AS interactions_total,
    count(DISTINCT ci.contact_id) FILTER (WHERE (ci.interaction_at >= CURRENT_DATE)) AS contacts_touched_today,
    count(DISTINCT ci.contact_id) AS contacts_touched_total,
    count(DISTINCT ci.id) FILTER (WHERE (ci.outcome = ANY (ARRAY['INTERESTED'::text, 'DEAL_PROGRESS'::text, 'MEETING_SCHEDULED'::text, 'CLOSED_WON'::text]))) AS positive_interactions,
    count(DISTINCT ci.id) FILTER (WHERE (ci.outcome = ANY (ARRAY['NOT_INTERESTED'::text, 'CLOSED_LOST'::text]))) AS negative_interactions,
    count(DISTINCT ci.id) FILTER (WHERE (ci.outcome = 'NO_RESPONSE'::text)) AS no_response_interactions,
    round(avg(ci.duration_minutes) FILTER (WHERE ((ci.interaction_type = ANY (ARRAY['CALL'::text, 'COLD_CALL'::text])) AND (ci.duration_minutes IS NOT NULL))), 1) AS avg_call_duration_minutes,
    max(ci.interaction_at) AS last_interaction_at
   FROM (public.crm_users cu
     LEFT JOIN public.contact_interactions ci ON ((ci.user_id = cu.id)))
  WHERE (cu.active = true)
  GROUP BY cu.id, cu.full_name, cu.email, cu.role;


create or replace view "public"."v_user_stage_contacts" as  SELECT c.id AS contact_id,
    c.company_id,
    c.full_name,
    c.designation,
    c.email,
    c.country_code,
    c.phone,
    c.ice_handle,
    c.preferred_channel,
    c.interests,
    c.notes,
    c.is_active,
    c.created_at,
    c.updated_at,
    ca.assigned_to_crm_user_id,
    ca.stage,
    ca.assigned_at,
    ca.assigned_by_crm_user_id
   FROM (public.contacts c
     JOIN public.contact_assignments ca ON ((ca.contact_id = c.id)))
  WHERE ((c.is_active = true) AND (ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL) AND (ca.assigned_to_crm_user_id = ( SELECT u.id
           FROM public.crm_users u
          WHERE ((u.auth_user_id = auth.uid()) AND (u.active = true))
         LIMIT 1)));


create or replace view "public"."v_my_recommended_contacts" as  SELECT rc.contact_id,
    rc.full_name,
    rc.enq_type,
    rc.responses_total,
    rc.workable_total,
    rc.workable_rate_pct,
    rc.avg_response_hours,
    rc.last_response_at,
    rc.rank_in_type
   FROM (public.v_recommended_contacts rc
     JOIN public.contact_assignments ca ON ((ca.contact_id = rc.contact_id)))
  WHERE ((ca.assigned_to_crm_user_id = public.current_crm_user_id()) AND (ca.status = 'ACTIVE'::text));


create or replace view "public"."v_recommended_contacts_ranked" as  SELECT contact_id,
    full_name,
    enq_type,
    weighted_responses,
    weighted_workable,
    workable_score,
    penalty_points,
    final_score,
    last_response_at,
    row_number() OVER (PARTITION BY enq_type ORDER BY final_score DESC, last_response_at DESC) AS rank_in_type
   FROM public.v_recommended_contacts_weighted;



  create policy "assignment_audit_no_direct_write"
  on "public"."contact_assignment_audit"
  as permissive
  for insert
  to public
with check (false);



  create policy "assignment_audit_select"
  on "public"."contact_assignment_audit"
  as permissive
  for select
  to authenticated
using ((public.is_admin() OR public.can_access_contact(contact_id)));



  create policy "ca_insert_admin"
  on "public"."contact_assignments"
  as permissive
  for insert
  to authenticated
with check (public.is_admin());



  create policy "ca_update_admin"
  on "public"."contact_assignments"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "ca_update_broker_stage"
  on "public"."contact_assignments"
  as permissive
  for update
  to authenticated
using (((assigned_to_crm_user_id = public.current_crm_user_id()) AND (lower(assignment_role) = 'primary'::text) AND (status = 'ACTIVE'::text)))
with check (((assigned_to_crm_user_id = public.current_crm_user_id()) AND (lower(assignment_role) = 'primary'::text) AND (status = 'ACTIVE'::text) AND (stage = ANY (ARRAY['COLD_CALLING'::text, 'ASPIRATION'::text, 'ACHIEVEMENT'::text]))));



  create policy "contact_interactions_delete"
  on "public"."contact_interactions"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "contacts_update_unified"
  on "public"."contacts"
  as permissive
  for update
  to authenticated
using ((public.is_admin() OR (created_by_crm_user_id = public.current_crm_user_id()) OR (EXISTS ( SELECT 1
   FROM public.contact_assignments ca
  WHERE ((ca.contact_id = contacts.id) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()) AND (ca.status = 'ACTIVE'::text))))))
with check ((public.is_admin() OR (created_by_crm_user_id = public.current_crm_user_id()) OR (EXISTS ( SELECT 1
   FROM public.contact_assignments ca
  WHERE ((ca.contact_id = contacts.id) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()) AND (ca.status = 'ACTIVE'::text))))));



  create policy "enquiries_insert_creator"
  on "public"."enquiries"
  as permissive
  for insert
  to authenticated
with check ((created_by = public.current_crm_user_id()));



  create policy "enquiries_update_admin_or_participant"
  on "public"."enquiries"
  as permissive
  for update
  to authenticated
using ((public.is_admin() OR (created_by = public.current_crm_user_id()) OR (EXISTS ( SELECT 1
   FROM public.enquiry_participants ep
  WHERE ((ep.enquiry_id = enquiries.id) AND (ep.crm_user_id = public.current_crm_user_id()) AND (ep.role = ANY (ARRAY['INITIATOR'::text, 'OWNER'::text, 'PARTICIPANT'::text])))))))
with check ((public.is_admin() OR (created_by = public.current_crm_user_id()) OR (EXISTS ( SELECT 1
   FROM public.enquiry_participants ep
  WHERE ((ep.enquiry_id = enquiries.id) AND (ep.crm_user_id = public.current_crm_user_id()) AND (ep.role = ANY (ARRAY['INITIATOR'::text, 'OWNER'::text, 'PARTICIPANT'::text])))))));



  create policy "enquiry_recipients_delete"
  on "public"."enquiry_recipients"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "enquiry_recipients_insert"
  on "public"."enquiry_recipients"
  as permissive
  for insert
  to authenticated
with check (public.is_linked_active_user());



  create policy "enquiry_recipients_select"
  on "public"."enquiry_recipients"
  as permissive
  for select
  to authenticated
using (true);



  create policy "enquiry_responses_delete"
  on "public"."enquiry_responses"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "enquiry_responses_insert"
  on "public"."enquiry_responses"
  as permissive
  for insert
  to authenticated
with check ((public.is_linked_active_user() AND (logged_by = public.current_crm_user_id())));



  create policy "enquiry_responses_select"
  on "public"."enquiry_responses"
  as permissive
  for select
  to authenticated
using (true);



  create policy "enquiry_responses_update"
  on "public"."enquiry_responses"
  as permissive
  for update
  to authenticated
using ((public.is_admin() OR (logged_by = public.current_crm_user_id())))
with check ((public.is_admin() OR (logged_by = public.current_crm_user_id())));



  create policy "enquiry_shortlist_delete"
  on "public"."enquiry_shortlist"
  as permissive
  for delete
  to authenticated
using ((public.is_admin() OR (created_by = public.current_crm_user_id())));



  create policy "enquiry_shortlist_insert"
  on "public"."enquiry_shortlist"
  as permissive
  for insert
  to authenticated
with check ((public.is_linked_active_user() AND (created_by = public.current_crm_user_id())));



  create policy "enquiry_shortlist_select"
  on "public"."enquiry_shortlist"
  as permissive
  for select
  to authenticated
using (true);



  create policy "negotiation_log_delete"
  on "public"."negotiation_log"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "negotiation_log_insert"
  on "public"."negotiation_log"
  as permissive
  for insert
  to authenticated
with check (public.is_linked_active_user());



  create policy "negotiation_log_select"
  on "public"."negotiation_log"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "negotiation_log_update"
  on "public"."negotiation_log"
  as permissive
  for update
  to authenticated
using (public.is_linked_active_user())
with check (public.is_linked_active_user());



  create policy "ops_delete"
  on "public"."ops"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "ops_insert"
  on "public"."ops"
  as permissive
  for insert
  to authenticated
with check (public.is_linked_active_user());



  create policy "ops_select"
  on "public"."ops"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "ops_update"
  on "public"."ops"
  as permissive
  for update
  to authenticated
using ((public.is_admin() OR (ops_owner = public.current_crm_user_id())))
with check ((public.is_admin() OR (ops_owner = public.current_crm_user_id())));



  create policy "contact_interactions_insert"
  on "public"."contact_interactions"
  as permissive
  for insert
  to authenticated
with check (((public.current_crm_user_id() IS NOT NULL) AND (user_id = public.current_crm_user_id()) AND public.can_access_contact(contact_id)));



  create policy "contact_interactions_select"
  on "public"."contact_interactions"
  as permissive
  for select
  to authenticated
using ((public.is_admin() OR public.can_access_contact(contact_id)));



  create policy "contact_private_details_insert"
  on "public"."contact_private_details"
  as permissive
  for insert
  to authenticated
with check (public.can_access_contact(contact_id));



  create policy "contact_private_details_select"
  on "public"."contact_private_details"
  as permissive
  for select
  to authenticated
using (public.can_access_contact(contact_id));



  create policy "contact_private_details_update"
  on "public"."contact_private_details"
  as permissive
  for update
  to authenticated
using (public.can_access_contact(contact_id))
with check (public.can_access_contact(contact_id));


CREATE TRIGGER trg_audit_contact_assignment AFTER INSERT OR UPDATE ON public.contact_assignments FOR EACH ROW EXECUTE FUNCTION public.tg_audit_contact_assignment();

CREATE TRIGGER ci_defaults BEFORE INSERT ON public.contact_interactions FOR EACH ROW EXECUTE FUNCTION public.trg_interactions_defaults();


