drop policy "enquiries_insert_authenticated_failsafe" on "public"."enquiries";

drop policy "enquiries_insert_creator" on "public"."enquiries";

drop policy "enquiries_update_creator_only" on "public"."enquiries";

revoke delete on table "public"."follow_ups__legacy" from "anon";

revoke insert on table "public"."follow_ups__legacy" from "anon";

revoke update on table "public"."follow_ups__legacy" from "anon";

revoke delete on table "public"."follow_ups__legacy" from "authenticated";

revoke insert on table "public"."follow_ups__legacy" from "authenticated";

revoke update on table "public"."follow_ups__legacy" from "authenticated";

revoke delete on table "public"."interactions__legacy" from "anon";

revoke insert on table "public"."interactions__legacy" from "anon";

revoke update on table "public"."interactions__legacy" from "anon";

revoke delete on table "public"."interactions__legacy" from "authenticated";

revoke insert on table "public"."interactions__legacy" from "authenticated";

revoke update on table "public"."interactions__legacy" from "authenticated";

drop view if exists "public"."enquiry_feed_vw";


  create table "public"."crm_documents" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "category" text not null,
    "description" text,
    "tags" text[] default '{}'::text[],
    "drive_url" text,
    "related_enquiry_id" uuid,
    "related_company_id" uuid,
    "uploaded_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "deleted_at" timestamp with time zone,
    "product" text,
    "load_area" text,
    "discharge_area" text,
    "vessel_size" text,
    "source_type" text,
    "intel_notes" text
      );


alter table "public"."crm_documents" enable row level security;


  create table "public"."enquiry_matches" (
    "id" uuid not null default gen_random_uuid(),
    "cargo_enquiry_id" uuid not null,
    "vessel_enquiry_id" uuid not null,
    "match_notes" text,
    "matched_by" uuid not null,
    "matched_at" timestamp with time zone not null default now(),
    "status" text not null default 'ACTIVE'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."enquiry_matches" enable row level security;

alter table "public"."activities" enable row level security;

alter table "public"."companies_stage" enable row level security;

alter table "public"."contact_assignment_audit" enable row level security;

alter table "public"."contact_company_map_stage" enable row level security;

alter table "public"."contact_interactions" enable row level security;

alter table "public"."contact_private_details" enable row level security;

alter table "public"."contacts_stage" enable row level security;

alter table "public"."enquiries" add column "deleted_at" timestamp with time zone;

alter table "public"."enquiry_recipients" enable row level security;

alter table "public"."enquiry_responses" enable row level security;

alter table "public"."enquiry_shortlist" enable row level security;

alter table "public"."fixture_parties" enable row level security;

alter table "public"."follow_ups__legacy" enable row level security;

alter table "public"."interactions__legacy" add column "related_enquiry_id" uuid;

alter table "public"."invoice_payments" enable row level security;

alter table "public"."recovery_log" enable row level security;

alter table "public"."workability_reasons" enable row level security;

CREATE UNIQUE INDEX crm_documents_pkey ON public.crm_documents USING btree (id);

CREATE UNIQUE INDEX enquiry_matches_pkey ON public.enquiry_matches USING btree (id);

CREATE UNIQUE INDEX enquiry_matches_unique_pair ON public.enquiry_matches USING btree (cargo_enquiry_id, vessel_enquiry_id);

CREATE INDEX idx_crm_documents_category ON public.crm_documents USING btree (category) WHERE (deleted_at IS NULL);

CREATE INDEX idx_crm_documents_company ON public.crm_documents USING btree (related_company_id) WHERE (deleted_at IS NULL);

CREATE INDEX idx_crm_documents_enquiry ON public.crm_documents USING btree (related_enquiry_id) WHERE (deleted_at IS NULL);

CREATE INDEX idx_enquiries_deleted_at ON public.enquiries USING btree (deleted_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_enquiry_matches_cargo ON public.enquiry_matches USING btree (cargo_enquiry_id) WHERE (status = 'ACTIVE'::text);

CREATE INDEX idx_enquiry_matches_vessel ON public.enquiry_matches USING btree (vessel_enquiry_id) WHERE (status = 'ACTIVE'::text);

CREATE INDEX idx_interactions_legacy_enquiry ON public.interactions__legacy USING btree (related_enquiry_id) WHERE (related_enquiry_id IS NOT NULL);

alter table "public"."crm_documents" add constraint "crm_documents_pkey" PRIMARY KEY using index "crm_documents_pkey";

alter table "public"."enquiry_matches" add constraint "enquiry_matches_pkey" PRIMARY KEY using index "enquiry_matches_pkey";

alter table "public"."crm_documents" add constraint "crm_documents_category_check" CHECK ((category = ANY (ARRAY['TRIP_REPORT'::text, 'PORT_CIRCULAR'::text, 'PDA'::text, 'MARKET_INTELLIGENCE'::text, 'IMPORTANT_EMAIL'::text, 'GENERAL_REFERENCE'::text, 'ENQUIRY_ATTACHMENT'::text]))) not valid;

alter table "public"."crm_documents" validate constraint "crm_documents_category_check";

alter table "public"."crm_documents" add constraint "crm_documents_related_company_id_fkey" FOREIGN KEY (related_company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."crm_documents" validate constraint "crm_documents_related_company_id_fkey";

alter table "public"."crm_documents" add constraint "crm_documents_related_enquiry_id_fkey" FOREIGN KEY (related_enquiry_id) REFERENCES public.enquiries(id) ON DELETE SET NULL not valid;

alter table "public"."crm_documents" validate constraint "crm_documents_related_enquiry_id_fkey";

alter table "public"."crm_documents" add constraint "crm_documents_source_type_check" CHECK (((source_type IS NULL) OR (source_type = ANY (ARRAY['EMAIL'::text, 'MEETING'::text, 'BROKER_NOTE'::text, 'OTHER'::text])))) not valid;

alter table "public"."crm_documents" validate constraint "crm_documents_source_type_check";

alter table "public"."crm_documents" add constraint "crm_documents_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES public.crm_users(id) not valid;

alter table "public"."crm_documents" validate constraint "crm_documents_uploaded_by_fkey";

alter table "public"."enquiry_matches" add constraint "enquiry_matches_cargo_enquiry_id_fkey" FOREIGN KEY (cargo_enquiry_id) REFERENCES public.enquiries(id) ON DELETE CASCADE not valid;

alter table "public"."enquiry_matches" validate constraint "enquiry_matches_cargo_enquiry_id_fkey";

alter table "public"."enquiry_matches" add constraint "enquiry_matches_matched_by_fkey" FOREIGN KEY (matched_by) REFERENCES public.crm_users(id) not valid;

alter table "public"."enquiry_matches" validate constraint "enquiry_matches_matched_by_fkey";

alter table "public"."enquiry_matches" add constraint "enquiry_matches_no_self_match" CHECK ((cargo_enquiry_id <> vessel_enquiry_id)) not valid;

alter table "public"."enquiry_matches" validate constraint "enquiry_matches_no_self_match";

alter table "public"."enquiry_matches" add constraint "enquiry_matches_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'CLOSED'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."enquiry_matches" validate constraint "enquiry_matches_status_check";

alter table "public"."enquiry_matches" add constraint "enquiry_matches_unique_pair" UNIQUE using index "enquiry_matches_unique_pair";

alter table "public"."enquiry_matches" add constraint "enquiry_matches_vessel_enquiry_id_fkey" FOREIGN KEY (vessel_enquiry_id) REFERENCES public.enquiries(id) ON DELETE CASCADE not valid;

alter table "public"."enquiry_matches" validate constraint "enquiry_matches_vessel_enquiry_id_fkey";

alter table "public"."interactions__legacy" add constraint "interactions__legacy_related_enquiry_id_fkey" FOREIGN KEY (related_enquiry_id) REFERENCES public.enquiries(id) ON DELETE SET NULL not valid;

alter table "public"."interactions__legacy" validate constraint "interactions__legacy_related_enquiry_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.log_interaction(p_contact_id uuid, p_interaction_type text, p_notes text, p_subject text DEFAULT NULL::text, p_outcome text DEFAULT NULL::text, p_duration_minutes integer DEFAULT NULL::integer, p_next_action text DEFAULT NULL::text, p_next_action_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_enquiry_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_interaction_id UUID;
  v_assignment_id  UUID;
  v_followup_id    UUID;
BEGIN
  -- Get the active assignment for this contact and user
  SELECT id INTO v_assignment_id
  FROM contact_assignments
  WHERE contact_id = p_contact_id
    AND assigned_to_crm_user_id = current_crm_user_id()
    AND status = 'ACTIVE'
  LIMIT 1;

  -- Insert interaction
  INSERT INTO interactions (
    contact_id,
    assignment_id,
    interaction_type,
    subject,
    notes,
    outcome,
    duration_minutes,
    next_action,
    next_action_date,
    created_by,
    related_enquiry_id        -- ← new column
  ) VALUES (
    p_contact_id,
    v_assignment_id,
    p_interaction_type,
    p_subject,
    p_notes,
    p_outcome,
    p_duration_minutes,
    p_next_action,
    p_next_action_date,
    current_crm_user_id(),
    p_enquiry_id              -- ← new value
  )
  RETURNING id INTO v_interaction_id;

  -- Create followup if next action specified
  IF p_next_action IS NOT NULL AND v_assignment_id IS NOT NULL THEN
    BEGIN
      INSERT INTO contact_followups (
        contact_id,
        assignment_id,
        followup_type,
        followup_reason,
        notes,
        due_at,
        status,
        created_by
      ) VALUES (
        p_contact_id,
        v_assignment_id,
        'CALL_BACK',
        p_next_action,
        'Auto-created from interaction: ' || COALESCE(p_subject, p_interaction_type),
        COALESCE(p_next_action_date, now() + interval '7 days'),
        'OPEN',
        current_crm_user_id()
      )
      RETURNING id INTO v_followup_id;

      -- Notify user about the followup
      BEGIN
        INSERT INTO app_notifications (
          user_id,
          notif_type,
          title,
          body,
          link_path,
          followup_id,
          meta
        )
        SELECT
          cu.auth_user_id,
          'FOLLOW_UP_CREATED',
          'Follow-up Reminder',
          'You have a follow-up due: ' || p_next_action,
          '/contacts/' || p_contact_id,
          v_followup_id,
          jsonb_build_object(
            'contact_id',    p_contact_id,
            'followup_id',   v_followup_id,
            'interaction_id', v_interaction_id,
            'enquiry_id',    p_enquiry_id
          )
        FROM crm_users cu
        WHERE cu.id = current_crm_user_id();
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN v_interaction_id;
END;
$function$
;

create or replace view "public"."enquiry_feed_vw" as  SELECT e.id AS enquiry_id,
    e.enquiry_number,
    e.enquiry_mode,
    e.subject,
    e.status,
    e.priority,
    e.quantity,
    e.quantity_unit,
    e.loading_port,
    e.discharge_port,
    e.laycan_from,
    e.laycan_to,
    e.vessel_type,
    e.vessel_name,
    e.cargo_type,
    e.contact_id,
    e.company_id,
    e.created_by,
    e.created_at,
    e.updated_at,
    e.deleted_at,
    cu.full_name AS created_by_name
   FROM (public.enquiries e
     LEFT JOIN public.crm_users cu ON ((cu.id = e.created_by)))
  WHERE (e.is_draft = false);


grant delete on table "public"."crm_documents" to "anon";

grant insert on table "public"."crm_documents" to "anon";

grant references on table "public"."crm_documents" to "anon";

grant select on table "public"."crm_documents" to "anon";

grant trigger on table "public"."crm_documents" to "anon";

grant truncate on table "public"."crm_documents" to "anon";

grant update on table "public"."crm_documents" to "anon";

grant delete on table "public"."crm_documents" to "authenticated";

grant insert on table "public"."crm_documents" to "authenticated";

grant references on table "public"."crm_documents" to "authenticated";

grant select on table "public"."crm_documents" to "authenticated";

grant trigger on table "public"."crm_documents" to "authenticated";

grant truncate on table "public"."crm_documents" to "authenticated";

grant update on table "public"."crm_documents" to "authenticated";

grant delete on table "public"."crm_documents" to "service_role";

grant insert on table "public"."crm_documents" to "service_role";

grant references on table "public"."crm_documents" to "service_role";

grant select on table "public"."crm_documents" to "service_role";

grant trigger on table "public"."crm_documents" to "service_role";

grant truncate on table "public"."crm_documents" to "service_role";

grant update on table "public"."crm_documents" to "service_role";

grant delete on table "public"."enquiry_matches" to "anon";

grant insert on table "public"."enquiry_matches" to "anon";

grant references on table "public"."enquiry_matches" to "anon";

grant select on table "public"."enquiry_matches" to "anon";

grant trigger on table "public"."enquiry_matches" to "anon";

grant truncate on table "public"."enquiry_matches" to "anon";

grant update on table "public"."enquiry_matches" to "anon";

grant delete on table "public"."enquiry_matches" to "authenticated";

grant insert on table "public"."enquiry_matches" to "authenticated";

grant references on table "public"."enquiry_matches" to "authenticated";

grant select on table "public"."enquiry_matches" to "authenticated";

grant trigger on table "public"."enquiry_matches" to "authenticated";

grant truncate on table "public"."enquiry_matches" to "authenticated";

grant update on table "public"."enquiry_matches" to "authenticated";

grant delete on table "public"."enquiry_matches" to "service_role";

grant insert on table "public"."enquiry_matches" to "service_role";

grant references on table "public"."enquiry_matches" to "service_role";

grant select on table "public"."enquiry_matches" to "service_role";

grant trigger on table "public"."enquiry_matches" to "service_role";

grant truncate on table "public"."enquiry_matches" to "service_role";

grant update on table "public"."enquiry_matches" to "service_role";


  create policy "activities_delete_admin"
  on "public"."activities"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "activities_insert_authenticated"
  on "public"."activities"
  as permissive
  for insert
  to authenticated
with check (public.is_linked_active_user());



  create policy "activities_select_authenticated"
  on "public"."activities"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "activities_update_admin"
  on "public"."activities"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "companies_stage_admin_all"
  on "public"."companies_stage"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "contact_assignment_audit_select_admin"
  on "public"."contact_assignment_audit"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "contact_assignment_audit_select_assigned"
  on "public"."contact_assignment_audit"
  as permissive
  for select
  to authenticated
using (public.can_access_contact(contact_id));



  create policy "contact_company_map_stage_admin_all"
  on "public"."contact_company_map_stage"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "contact_interactions_delete_admin"
  on "public"."contact_interactions"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "contact_interactions_insert"
  on "public"."contact_interactions"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "contact_interactions_insert_authenticated"
  on "public"."contact_interactions"
  as permissive
  for insert
  to authenticated
with check (public.is_linked_active_user());



  create policy "contact_interactions_select"
  on "public"."contact_interactions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "contact_interactions_select_authenticated"
  on "public"."contact_interactions"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "contact_interactions_update"
  on "public"."contact_interactions"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "contact_interactions_update_authenticated"
  on "public"."contact_interactions"
  as permissive
  for update
  to authenticated
using (public.is_linked_active_user())
with check (public.is_linked_active_user());



  create policy "contact_private_details_delete"
  on "public"."contact_private_details"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "contact_private_details_insert"
  on "public"."contact_private_details"
  as permissive
  for insert
  to authenticated
with check (public.can_access_contact_pii(contact_id));



  create policy "contact_private_details_select"
  on "public"."contact_private_details"
  as permissive
  for select
  to authenticated
using (public.can_access_contact_pii(contact_id));



  create policy "contact_private_details_update"
  on "public"."contact_private_details"
  as permissive
  for update
  to authenticated
using (public.can_access_contact_pii(contact_id))
with check (public.can_access_contact_pii(contact_id));



  create policy "contacts_stage_admin_all"
  on "public"."contacts_stage"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "crm_documents_delete"
  on "public"."crm_documents"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "crm_documents_insert"
  on "public"."crm_documents"
  as permissive
  for insert
  to authenticated
with check ((uploaded_by = public.current_crm_user_id()));



  create policy "crm_documents_select"
  on "public"."crm_documents"
  as permissive
  for select
  to authenticated
using (((deleted_at IS NULL) OR public.is_admin()));



  create policy "crm_documents_update"
  on "public"."crm_documents"
  as permissive
  for update
  to authenticated
using (((uploaded_by = public.current_crm_user_id()) OR public.is_admin()))
with check (((uploaded_by = public.current_crm_user_id()) OR public.is_admin()));



  create policy "enquiries_delete_admin_only"
  on "public"."enquiries"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "enquiries_update_owner_or_admin"
  on "public"."enquiries"
  as permissive
  for update
  to authenticated
using (((created_by = public.current_crm_user_id()) OR public.is_admin() OR (assigned_to = public.current_crm_user_id())))
with check (((created_by = public.current_crm_user_id()) OR public.is_admin() OR (assigned_to = public.current_crm_user_id())));



  create policy "enquiry_matches_delete"
  on "public"."enquiry_matches"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "enquiry_matches_insert"
  on "public"."enquiry_matches"
  as permissive
  for insert
  to authenticated
with check ((matched_by = public.current_crm_user_id()));



  create policy "enquiry_matches_select"
  on "public"."enquiry_matches"
  as permissive
  for select
  to authenticated
using (true);



  create policy "enquiry_matches_update"
  on "public"."enquiry_matches"
  as permissive
  for update
  to authenticated
using (((matched_by = public.current_crm_user_id()) OR public.is_admin()))
with check (((matched_by = public.current_crm_user_id()) OR public.is_admin()));



  create policy "enquiry_recipients_delete_admin"
  on "public"."enquiry_recipients"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "enquiry_recipients_insert_authenticated"
  on "public"."enquiry_recipients"
  as permissive
  for insert
  to authenticated
with check (public.is_linked_active_user());



  create policy "enquiry_recipients_select_authenticated"
  on "public"."enquiry_recipients"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "enquiry_responses_delete_admin"
  on "public"."enquiry_responses"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "enquiry_responses_insert_authenticated"
  on "public"."enquiry_responses"
  as permissive
  for insert
  to authenticated
with check (public.is_linked_active_user());



  create policy "enquiry_responses_select_authenticated"
  on "public"."enquiry_responses"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "enquiry_responses_update_authenticated"
  on "public"."enquiry_responses"
  as permissive
  for update
  to authenticated
using (public.is_linked_active_user())
with check (public.is_linked_active_user());



  create policy "enquiry_shortlist_delete_admin"
  on "public"."enquiry_shortlist"
  as permissive
  for delete
  to authenticated
using ((public.is_admin() OR (created_by = public.current_crm_user_id())));



  create policy "enquiry_shortlist_insert_authenticated"
  on "public"."enquiry_shortlist"
  as permissive
  for insert
  to authenticated
with check ((public.is_linked_active_user() AND (created_by = public.current_crm_user_id())));



  create policy "enquiry_shortlist_select_authenticated"
  on "public"."enquiry_shortlist"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "fixture_parties_delete_admin"
  on "public"."fixture_parties"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "fixture_parties_insert_authenticated"
  on "public"."fixture_parties"
  as permissive
  for insert
  to authenticated
with check (public.is_linked_active_user());



  create policy "fixture_parties_select_authenticated"
  on "public"."fixture_parties"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "fixture_parties_update_authenticated"
  on "public"."fixture_parties"
  as permissive
  for update
  to authenticated
using (public.is_linked_active_user())
with check (public.is_linked_active_user());



  create policy "follow_ups_legacy_select_authenticated"
  on "public"."follow_ups__legacy"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "invoice_payments_select_authenticated"
  on "public"."invoice_payments"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "invoice_payments_write_accounts_admin"
  on "public"."invoice_payments"
  as permissive
  for all
  to authenticated
using (public.has_role(ARRAY['Accounts'::text, 'Admin'::text, 'CEO'::text]))
with check (public.has_role(ARRAY['Accounts'::text, 'Admin'::text, 'CEO'::text]));



  create policy "recovery_log_select_authenticated"
  on "public"."recovery_log"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "recovery_log_write_accounts_admin"
  on "public"."recovery_log"
  as permissive
  for all
  to authenticated
using (public.has_role(ARRAY['Accounts'::text, 'Admin'::text, 'CEO'::text]))
with check (public.has_role(ARRAY['Accounts'::text, 'Admin'::text, 'CEO'::text]));



  create policy "workability_reasons_select_authenticated"
  on "public"."workability_reasons"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());


CREATE TRIGGER trg_crm_documents_updated_at BEFORE UPDATE ON public.crm_documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_enquiry_matches_updated_at BEFORE UPDATE ON public.enquiry_matches FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


