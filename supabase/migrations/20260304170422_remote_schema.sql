-- REQUIRED FOR DEFAULTS / POLICIES
-- SAFE STUB: does not reference tables (replay-safe for supabase db pull)
create or replace function public.current_crm_user_id()
returns uuid
language sql
stable
security definer
as $$
  select null::uuid
$$;
-- REPLAY-SAFE STUBS (needed during shadow replay)
-- These will be replaced later by real definitions if present in the migration set.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select false
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.current_crm_user_id() from public;
grant execute on function public.current_crm_user_id() to authenticated;

create extension if not exists "pg_cron" with schema "pg_catalog";

drop extension if exists "pg_net";

create extension if not exists "pg_trgm" with schema "public";

create type "public"."activity_type_enum" as enum ('Call', 'WhatsApp', 'Email', 'Meeting', 'Note');

create type "public"."company_type_enum" as enum ('Owner', 'Charterer', 'Operator', 'Trader', 'Broker', 'Agent', 'Supplier');

create type "public"."contact_channel_enum" as enum ('WA', 'Email', 'Call', 'ICE');

create type "public"."delivery_result" as enum ('SUCCESS', 'FAILURE');

create type "public"."delivery_status" as enum ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

create type "public"."fixture_status_enum" as enum ('OnSubs', 'Fixed', 'Cancelled', 'SubsFailed');

create type "public"."interaction_channel" as enum ('WHATSAPP', 'EMAIL', 'CALL', 'MEETING', 'NOTE', 'OTHER');

create type "public"."invoice_type_enum" as enum ('FreightComm', 'DemurrageComm', 'Recovery');

create type "public"."lead_status_enum" as enum ('Open', 'OptionsShown', 'UnderNegotiation', 'TermsAgreed', 'OnSubs', 'Fixed', 'ClosedLost', 'ClosedNotWorkable', 'ClosedByOthers');

create type "public"."lead_type_enum" as enum ('Cargo', 'OpenVessel');

create type "public"."notification_channel" as enum ('WHATSAPP');

create type "public"."ops_stage_enum" as enum ('Nomination', 'SOF', 'NOR', 'Loading', 'Sailing', 'Discharge', 'Completed', 'Claim');

create type "public"."option_type_enum" as enum ('VesselOption', 'CargoOption');

create type "public"."payment_status_enum" as enum ('Unpaid', 'Partial', 'Paid');

create type "public"."phone_type_enum" as enum ('WhatsApp', 'Landline');

create type "public"."record_status_enum" as enum ('Onboarded', 'ActiveNotOnboarded', 'Inactive');

create type "public"."recovery_status_enum" as enum ('Open', 'PartPaid', 'Closed');

create type "public"."sanction_status_enum" as enum ('Clear', 'PotentialMatch', 'Sanctioned', 'Unknown');

create type "public"."vessel_size_class_enum" as enum ('Small', 'GP', 'Handy', 'MR1', 'MR2', 'Panamax', 'LR1', 'Aframax', 'LR2', 'Suezmax', 'LR3', 'VLCC');

create type "public"."vessel_status_enum" as enum ('Active', 'Sold', 'NotTrading');

create sequence "public"."enquiry_number_seq";

create sequence "public"."fixture_number_seq";

create sequence "public"."quote_number_seq";

create sequence "public"."sanctions_sources_id_seq";


  create table "public"."activities" (
    "id" uuid not null default gen_random_uuid(),
    "lead_id" uuid,
    "fixture_id" uuid,
    "activity_type" text not null,
    "channel" text,
    "direction" text,
    "subject" text,
    "notes" text,
    "occurred_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."activity_log" (
    "id" uuid not null default gen_random_uuid(),
    "linked_type" text not null,
    "linked_id" uuid not null,
    "activity_datetime" timestamp with time zone not null default now(),
    "activity_type" text not null,
    "summary" text not null,
    "next_action" text,
    "next_action_date" date,
    "owner" uuid not null,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."activity_log" enable row level security;


  create table "public"."app_notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "notif_type" text not null,
    "title" text not null,
    "body" text,
    "link_path" text,
    "followup_id" uuid,
    "is_read" boolean not null default false,
    "read_at" timestamp with time zone,
    "meta" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "crm_user_id" uuid
      );


alter table "public"."app_notifications" enable row level security;


  create table "public"."companies" (
    "id" uuid not null default gen_random_uuid(),
    "company_type" text not null,
    "country" text,
    "website" text,
    "email_general" text,
    "phone_general" text,
    "tags" jsonb default '[]'::jsonb,
    "status" text default 'ACTIVE_NOT_ONBOARDED'::text,
    "remarks" text,
    "created_at" timestamp with time zone default now(),
    "company_name" text,
    "updated_at" timestamp with time zone not null default now(),
    "city" text,
    "region" text,
    "notes" text,
    "is_active" boolean,
    "company_type_other_text" text,
    "board_line" text
      );


alter table "public"."companies" enable row level security;


  create table "public"."companies_stage" (
    "name" text,
    "company_type" text,
    "country" text,
    "city" text,
    "region" text,
    "notes" text,
    "is_active" boolean
      );



  create table "public"."company_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid not null,
    "assigned_to_crm_user_id" uuid not null,
    "assignment_role" text default 'PRIMARY'::text,
    "stage" text default 'NEW'::text,
    "status" text default 'ACTIVE'::text,
    "notes" text,
    "assigned_by" uuid,
    "assigned_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."company_assignments" enable row level security;


  create table "public"."company_followups" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid not null,
    "company_assignment_id" uuid,
    "followup_type" text not null,
    "followup_reason" text not null,
    "notes" text,
    "due_at" timestamp with time zone not null,
    "status" text default 'OPEN'::text,
    "completed_at" timestamp with time zone,
    "recurrence_enabled" boolean default false,
    "recurrence_frequency" text,
    "recurrence_interval" integer default 1,
    "recurrence_end_date" date,
    "parent_followup_id" uuid,
    "recurrence_count" integer default 0,
    "created_by" uuid not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."company_followups" enable row level security;


  create table "public"."contact_assignment_audit" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid not null,
    "assignment_id" uuid,
    "action" text not null,
    "actor_crm_user_id" uuid,
    "assignee_crm_user_id" uuid,
    "stage" text,
    "occurred_at" timestamp with time zone not null default now(),
    "meta" jsonb not null default '{}'::jsonb
      );



  create table "public"."contact_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid not null,
    "assigned_to" uuid,
    "assigned_by" uuid,
    "assigned_at" timestamp with time zone not null default now(),
    "status" text not null default 'ACTIVE'::text,
    "stage" text not null default 'ASPIRATION'::text,
    "stage_changed_at" timestamp with time zone,
    "stage_changed_by" uuid,
    "notes" text,
    "assigned_to_crm_user_id" uuid,
    "assigned_by_crm_user_id" uuid,
    "stage_changed_by_crm_user_id" uuid,
    "assignment_role" text,
    "updated_by_crm_user_id" uuid,
    "ended_by_crm_user_id" uuid,
    "ended_at" timestamp with time zone,
    "created_by_crm_user_id" uuid
      );


alter table "public"."contact_assignments" enable row level security;


  create table "public"."contact_company_map_stage" (
    "email" text,
    "phone" text,
    "company_name" text
      );



  create table "public"."contact_followups" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid not null,
    "assignment_id" uuid not null,
    "interaction_id" uuid,
    "followup_type" text not null,
    "followup_reason" text not null,
    "notes" text,
    "due_at" timestamp with time zone not null,
    "completed_at" timestamp with time zone,
    "status" text not null default 'OPEN'::text,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "acknowledged_at" timestamp with time zone,
    "acknowledged_by_crm_user_id" uuid,
    "assigned_to_crm_user_id" uuid,
    "recurrence_enabled" boolean default false,
    "recurrence_frequency" text,
    "recurrence_interval" integer default 1,
    "recurrence_end_date" date,
    "parent_followup_id" uuid,
    "recurrence_count" integer default 0,
    "interaction_id_new" uuid
      );


alter table "public"."contact_followups" enable row level security;


  create table "public"."contact_import_staging" (
    "id" uuid not null default gen_random_uuid(),
    "full_name" text not null,
    "designation" text,
    "company_name" text,
    "country_code" text,
    "phone" text,
    "phone_type" text default 'Mobile'::text,
    "email" text,
    "ice_handle" text,
    "preferred_channel" text,
    "notes" text,
    "imported_by_crm_user_id" uuid,
    "imported_at" timestamp with time zone default now(),
    "batch_id" uuid default gen_random_uuid(),
    "status" text default 'PENDING'::text,
    "validation_errors" jsonb default '[]'::jsonb,
    "duplicate_contact_id" uuid,
    "created_contact_id" uuid,
    "created_at" timestamp with time zone,
    "company_id" uuid
      );


alter table "public"."contact_import_staging" enable row level security;


  create table "public"."contact_interactions" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid not null,
    "user_id" uuid not null,
    "interaction_type" text not null,
    "direction" text,
    "interaction_at" timestamp with time zone not null default now(),
    "outcome" text,
    "notes" text,
    "next_follow_up_at" timestamp with time zone,
    "meta" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."contact_phones" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid not null,
    "phone_type" text not null,
    "phone_number" text not null,
    "is_primary" boolean not null default false,
    "notes" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."contact_phones" enable row level security;


  create table "public"."contact_private_details" (
    "contact_id" uuid not null,
    "email" text,
    "phone" text,
    "updated_at" timestamp with time zone not null default now(),
    "updated_by_crm_user_id" uuid
      );



  create table "public"."contact_stage_events" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid not null,
    "actor_crm_user_id" uuid,
    "from_stage" text,
    "to_stage" text not null,
    "occurred_at" timestamp with time zone not null default now(),
    "note" text
      );


alter table "public"."contact_stage_events" enable row level security;


  create table "public"."contact_stage_requests" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid not null,
    "requested_stage" text not null,
    "requested_by_crm_user_id" uuid not null,
    "requested_at" timestamp with time zone not null default now(),
    "status" text not null default 'PENDING'::text,
    "decided_by_crm_user_id" uuid,
    "decided_at" timestamp with time zone,
    "decision_notes" text
      );


alter table "public"."contact_stage_requests" enable row level security;


  create table "public"."contacts" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid,
    "full_name" text not null,
    "designation" text,
    "country_code" text,
    "phone" text,
    "phone_type" text,
    "email" text,
    "ice_handle" text,
    "preferred_channel" text,
    "interests" jsonb default '{}'::jsonb,
    "notes" text,
    "assigned_to" uuid,
    "created_at" timestamp with time zone default now(),
    "assigned_to_user_id" uuid,
    "updated_at" timestamp with time zone not null default now(),
    "is_active" boolean not null default true,
    "created_by_crm_user_id" uuid,
    "additional_emails" jsonb default '[]'::jsonb,
    "import_batch_id" text,
    "stage" text not null default 'COLD_CALLING'::text,
    "duplicate_status" text not null default 'pending'::text,
    "merged_into_contact_id" uuid,
    "resolved_by" uuid,
    "resolved_at" timestamp with time zone,
    "is_archived" boolean not null default false,
    "archived_at" timestamp with time zone,
    "is_deleted" boolean not null default false,
    "deleted_at" timestamp with time zone,
    "deleted_by_crm_user_id" uuid,
    "created_from_staging_id" uuid
      );


alter table "public"."contacts" enable row level security;


  create table "public"."contacts_stage" (
    "full_name" text,
    "designation" text,
    "country_code" text,
    "phone" text,
    "phone_type" text,
    "email" text,
    "ice_handle" text,
    "preferred_channel" text,
    "interests" text,
    "notes" text,
    "is_active" boolean
      );



  create table "public"."crm_users" (
    "id" uuid not null default gen_random_uuid(),
    "auth_user_id" uuid,
    "full_name" text not null,
    "email" text not null,
    "role" text not null default 'Broker'::text,
    "region_focus" text,
    "active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."crm_users" enable row level security;


  create table "public"."enquiries" (
    "id" uuid not null default gen_random_uuid(),
    "subject" text,
    "description" text,
    "lifecycle_state" text not null default 'DRAFT'::text,
    "closed_status" text,
    "is_test" boolean not null default false,
    "valid_until" timestamp with time zone,
    "enq_type" text,
    "created_by" uuid default public.current_crm_user_id(),
    "created_at" timestamp with time zone not null default now(),
    "issued_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now(),
    "is_workable" boolean,
    "workability_reason" text,
    "assessed_by" uuid,
    "assessed_at" timestamp with time zone,
    "source_contact_id" uuid,
    "enquiry_number" text,
    "contact_id" uuid,
    "company_id" uuid,
    "assignment_id" uuid,
    "enquiry_type" text,
    "vessel_type" text,
    "vessel_name" text,
    "cargo_type" text,
    "quantity" numeric,
    "quantity_unit" text,
    "loading_port" text,
    "discharge_port" text,
    "laycan_from" date,
    "laycan_to" date,
    "budget_min" numeric,
    "budget_max" numeric,
    "currency" text default 'USD'::text,
    "status" text default 'RECEIVED'::text,
    "priority" text,
    "assigned_to" uuid,
    "assigned_at" timestamp with time zone,
    "win_probability" integer,
    "our_estimate" numeric,
    "actual_value" numeric,
    "offer_time" date,
    "lost_reason" text,
    "lost_to_competitor" text,
    "cancellation_reason" text,
    "received_via" text,
    "source_details" text,
    "tags" text[],
    "notes" text,
    "enquiry_mode" text,
    "fixture_style" text,
    "pricing_style" text,
    "cargo_grade" text,
    "cargo_group" text,
    "cargo_tolerance" text,
    "temp_required_c" numeric,
    "imo_class" text,
    "segregations" integer,
    "coatings" text,
    "max_age_years" integer,
    "flag_restrictions" text,
    "sire_required" boolean,
    "other_requirements" jsonb default '{}'::jsonb,
    "contact_reference" text,
    "is_draft" boolean default false,
    "estimated_value" numeric
      );


alter table "public"."enquiries" enable row level security;


  create table "public"."enquiry_activities" (
    "id" uuid not null default gen_random_uuid(),
    "enquiry_id" uuid not null,
    "activity_type" text not null,
    "description" text not null,
    "old_value" text,
    "new_value" text,
    "metadata" jsonb,
    "created_by" uuid not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."enquiry_activities" enable row level security;


  create table "public"."enquiry_feed" (
    "enquiry_id" uuid not null,
    "enquiry_number" text,
    "enquiry_mode" text not null default 'GENERAL'::text,
    "subject" text,
    "status" text,
    "priority" text,
    "created_by" uuid,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
      );


alter table "public"."enquiry_feed" enable row level security;


  create table "public"."enquiry_participants" (
    "id" uuid not null default gen_random_uuid(),
    "enquiry_id" uuid not null,
    "crm_user_id" uuid not null,
    "role" text not null default 'PARTICIPANT'::text,
    "added_by_crm_user_id" uuid,
    "added_at" timestamp with time zone default now()
      );


alter table "public"."enquiry_participants" enable row level security;


  create table "public"."enquiry_quotes" (
    "id" uuid not null default gen_random_uuid(),
    "enquiry_id" uuid not null,
    "quote_number" text,
    "version" integer not null default 1,
    "vessel_name" text,
    "vessel_imo" text,
    "vessel_dwt" numeric,
    "rate" numeric not null,
    "rate_unit" text not null,
    "base_amount" numeric not null,
    "additional_charges" jsonb,
    "total_amount" numeric not null,
    "currency" text default 'USD'::text,
    "validity_date" date,
    "payment_terms" text,
    "laycan_from" date,
    "laycan_to" date,
    "special_conditions" text,
    "terms" text,
    "status" text default 'DRAFT'::text,
    "sent_at" timestamp with time zone,
    "viewed_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "rejection_reason" text,
    "pdf_url" text,
    "attachments" jsonb default '[]'::jsonb,
    "created_by" uuid not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "sent_by_crm_user_id" uuid,
    "sent_to_contact_id" uuid,
    "sent_via" text,
    "sent_message" text,
    "offer_type" text,
    "ws_percent" numeric,
    "lumpsum_amount" numeric,
    "tc_daily_rate" numeric,
    "tc_period" text,
    "commission_percent" numeric,
    "subjects" text,
    "demurrage_terms" text
      );


alter table "public"."enquiry_quotes" enable row level security;


  create table "public"."enquiry_recipients" (
    "id" uuid not null default gen_random_uuid(),
    "enquiry_id" uuid not null,
    "contact_id" uuid not null,
    "sent_by" uuid,
    "sent_at" timestamp with time zone not null default now(),
    "channel" text
      );



  create table "public"."enquiry_responses" (
    "id" uuid not null default gen_random_uuid(),
    "enquiry_id" uuid not null,
    "contact_id" uuid not null,
    "logged_by" uuid not null,
    "response_at" timestamp with time zone not null default now(),
    "response_type" text not null,
    "rate" numeric,
    "rate_unit" text,
    "vessel_id" uuid,
    "remarks" text,
    "meta" jsonb not null default '{}'::jsonb,
    "is_workable" boolean,
    "workability_reason" text,
    "assessed_by" uuid,
    "assessed_at" timestamp with time zone,
    "effort_minutes" integer
      );



  create table "public"."enquiry_shortlist" (
    "id" uuid not null default gen_random_uuid(),
    "enquiry_id" uuid not null,
    "candidate_enquiry_id" uuid not null,
    "fit_score" integer,
    "broker_notes" text,
    "created_by" uuid not null,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."fixture_parties" (
    "id" uuid not null default gen_random_uuid(),
    "fixture_id" uuid not null,
    "contact_id" uuid not null,
    "company_id" uuid,
    "role" text not null default 'OTHER'::text,
    "side" text,
    "linked_at" timestamp with time zone not null default now(),
    "linked_by" uuid,
    "notes" text,
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."fixtures" (
    "id" uuid not null default gen_random_uuid(),
    "lead_id" uuid,
    "fixed_date" date not null default (now())::date,
    "cp_date" date,
    "vessel_id" uuid,
    "owner_company_id" uuid,
    "charterer_company_id" uuid,
    "co_broker_company_id" uuid,
    "recap_terms" jsonb not null default '{}'::jsonb,
    "commission_total" numeric,
    "aq_commission" numeric,
    "commission_split_details" text,
    "commission_paid_by" text,
    "cp_storage_path" text,
    "status" text default 'ON_SUBS'::text,
    "primary_broker_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."fixtures" enable row level security;


  create table "public"."follow_ups__legacy" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid not null,
    "assigned_to" uuid not null,
    "created_by" uuid not null,
    "due_at" timestamp with time zone not null,
    "status" text not null default 'OPEN'::text,
    "priority" text not null default 'MED'::text,
    "notes" text,
    "done_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."followup_notifications_log" (
    "id" uuid not null default gen_random_uuid(),
    "followup_id" uuid not null,
    "notified_to" uuid not null,
    "notification_type" text not null,
    "channel" text not null,
    "notified_at" timestamp with time zone not null default now()
      );


alter table "public"."followup_notifications_log" enable row level security;


  create table "public"."import_batches" (
    "id" uuid not null default gen_random_uuid(),
    "batch_id" text not null,
    "total_rows" integer not null default 0,
    "valid_rows" integer not null default 0,
    "failed_rows" integer not null default 0,
    "imported_rows" integer not null default 0,
    "status" text default 'PENDING'::text,
    "error_details" jsonb default '[]'::jsonb,
    "created_by" uuid not null,
    "created_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone
      );


alter table "public"."import_batches" enable row level security;


  create table "public"."interactions__legacy" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid not null,
    "assignment_id" uuid,
    "interaction_type" text not null,
    "outcome" text,
    "subject" text,
    "notes" text not null,
    "interaction_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "duration_minutes" integer,
    "next_action" text,
    "next_action_date" timestamp with time zone,
    "attachments" jsonb default '[]'::jsonb
      );


alter table "public"."interactions__legacy" enable row level security;


  create table "public"."interactions_log" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid not null,
    "created_by_crm_user_id" uuid not null default public.current_crm_user_id(),
    "channel" public.interaction_channel not null,
    "occurred_at" timestamp with time zone not null default now(),
    "subject" text,
    "notes" text,
    "meta" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."interactions_log" enable row level security;


  create table "public"."invoice_payments" (
    "id" uuid not null default gen_random_uuid(),
    "invoice_id" uuid not null,
    "received_at" timestamp with time zone not null default now(),
    "amount" numeric not null,
    "currency" text,
    "method" text,
    "reference_no" text,
    "notes" text
      );



  create table "public"."invoices" (
    "id" uuid not null default gen_random_uuid(),
    "fixture_id" uuid not null,
    "invoice_type" text not null,
    "invoice_date" date not null default (now())::date,
    "amount" numeric not null,
    "currency" text default 'USD'::text,
    "due_date" date,
    "paid_date" date,
    "payment_status" text not null default 'UNPAID'::text,
    "invoice_storage_path" text,
    "remarks" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."invoices" enable row level security;


  create table "public"."leads" (
    "id" uuid not null default gen_random_uuid(),
    "lead_type" text not null,
    "lead_datetime" timestamp with time zone not null default now(),
    "entered_by" uuid not null,
    "source_company_id" uuid,
    "source_contact_id" uuid,
    "cargo" text,
    "qty_min" numeric,
    "qty_max" numeric,
    "load_port" text,
    "disch_port" text,
    "laycan_start" date,
    "laycan_end" date,
    "vessel_id" uuid,
    "last_cargo" text,
    "open_port" text,
    "open_date" date,
    "preferred_direction" text,
    "open_range" text,
    "notes" text,
    "priority" text default 'WARM'::text,
    "status" text not null default 'OPEN'::text,
    "recap" jsonb default '{}'::jsonb,
    "competitors" text,
    "last_followup_date" date,
    "next_followup_date" date,
    "primary_broker_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."leads" enable row level security;


  create table "public"."negotiation_log" (
    "id" uuid not null default gen_random_uuid(),
    "option_id" uuid not null,
    "logged_at" timestamp with time zone not null default now(),
    "by_side" text,
    "subject" text default 'OTHER'::text,
    "message_summary" text not null,
    "term_snapshot" jsonb default '{}'::jsonb,
    "status" text default 'OPEN'::text
      );


alter table "public"."negotiation_log" enable row level security;


  create table "public"."notification_delivery_log" (
    "id" uuid not null default gen_random_uuid(),
    "delivery_queue_id" uuid not null,
    "channel" public.notification_channel not null,
    "recipient" text not null,
    "provider_message_id" text,
    "provider_status" text,
    "provider_response" jsonb,
    "result" public.delivery_result not null,
    "sent_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_delivery_log" enable row level security;


  create table "public"."notification_delivery_queue" (
    "id" uuid not null default gen_random_uuid(),
    "notification_log_id" uuid not null,
    "channel" public.notification_channel not null default 'WHATSAPP'::public.notification_channel,
    "recipient" text not null,
    "template_name" text not null,
    "template_language" text not null default 'en'::text,
    "template_params" jsonb not null default '{}'::jsonb,
    "payload" jsonb not null default '{}'::jsonb,
    "status" public.delivery_status not null default 'PENDING'::public.delivery_status,
    "attempts" integer not null default 0,
    "max_attempts" integer not null default 5,
    "next_attempt_at" timestamp with time zone not null default now(),
    "locked_at" timestamp with time zone,
    "locked_by" text,
    "last_error" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_delivery_queue" enable row level security;


  create table "public"."ops" (
    "id" uuid not null default gen_random_uuid(),
    "fixture_id" uuid not null,
    "stage" text not null,
    "docs_pending" text,
    "sof_received" boolean default false,
    "nor_datetime" timestamp with time zone,
    "load_complete" timestamp with time zone,
    "disch_complete" timestamp with time zone,
    "demurrage_applicable" boolean,
    "claim_amount" numeric,
    "recovery_status" text default 'OPEN'::text,
    "ops_owner" uuid,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."ops" enable row level security;


  create table "public"."options_shown" (
    "id" uuid not null default gen_random_uuid(),
    "lead_id" uuid not null,
    "shown_by" uuid not null,
    "shown_at" timestamp with time zone not null default now(),
    "option_type" text not null,
    "vessel_id" uuid,
    "owner_company_id" uuid,
    "owner_contact_id" uuid,
    "charterer_company_id" uuid,
    "charterer_contact_id" uuid,
    "cargo_summary" text,
    "rate_indication" text,
    "terms_notes" text,
    "outcome" text default 'PENDING'::text,
    "next_action_date" date,
    "notes" text,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."options_shown" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "full_name" text,
    "role" text default 'BROKER'::text,
    "region_focus" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."recovery_log" (
    "id" uuid not null default gen_random_uuid(),
    "invoice_id" uuid not null,
    "logged_at" timestamp with time zone not null default now(),
    "by_side" text,
    "action" text not null,
    "status" text not null,
    "notes" text,
    "meta" jsonb
      );



  create table "public"."sanctions_sources" (
    "id" smallint not null default nextval('public.sanctions_sources_id_seq'::regclass),
    "code" text not null,
    "name" text not null,
    "active" boolean not null default true
      );


alter table "public"."sanctions_sources" enable row level security;


  create table "public"."task_comments" (
    "id" uuid not null default gen_random_uuid(),
    "task_id" uuid not null,
    "crm_user_id" uuid not null,
    "comment" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."task_comments" enable row level security;


  create table "public"."task_recipients" (
    "task_id" uuid not null,
    "crm_user_id" uuid not null,
    "assigned_by_crm_user_id" uuid not null,
    "assigned_at" timestamp with time zone not null default now()
      );


alter table "public"."task_recipients" enable row level security;


  create table "public"."task_user_state" (
    "task_id" uuid not null,
    "crm_user_id" uuid not null,
    "status" text not null default 'OPEN'::text,
    "pinned" boolean not null default false,
    "pinned_order" integer,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."task_user_state" enable row level security;


  create table "public"."tasks" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "notes" text not null default ''::text,
    "status" text not null default 'OPEN'::text,
    "due_at" timestamp with time zone,
    "priority" text not null default 'MED'::text,
    "pinned" boolean not null default false,
    "pinned_order" integer,
    "assigned_to_crm_user_id" uuid not null,
    "created_by_crm_user_id" uuid not null default public.current_crm_user_id(),
    "related_contact_id" uuid,
    "related_enquiry_id" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "is_broadcast" boolean not null default false
      );


alter table "public"."tasks" enable row level security;


  create table "public"."user_notepad" (
    "crm_user_id" uuid not null,
    "content" text not null default ''::text,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_notepad" enable row level security;


  create table "public"."vessel_sanctions" (
    "id" uuid not null default gen_random_uuid(),
    "vessel_id" uuid not null,
    "source_id" integer not null,
    "status" public.sanction_status_enum not null default 'Unknown'::public.sanction_status_enum,
    "checked_at" timestamp with time zone not null default now(),
    "reference" text,
    "checked_by_user_id" uuid,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."vessel_sanctions" enable row level security;


  create table "public"."vessel_sanctions_history" (
    "id" uuid not null default gen_random_uuid(),
    "vessel_id" uuid not null,
    "source_id" integer not null,
    "old_status" public.sanction_status_enum,
    "new_status" public.sanction_status_enum not null,
    "changed_at" timestamp with time zone not null default now(),
    "changed_by_user_id" uuid,
    "reason" text
      );


alter table "public"."vessel_sanctions_history" enable row level security;


  create table "public"."vessels" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "imo" text,
    "dwt" integer,
    "size_class" text,
    "year_built" integer,
    "flag" text,
    "gear" jsonb default '{}'::jsonb,
    "cargo_tags" jsonb default '[]'::jsonb,
    "trading_region" text,
    "owner_company_id" uuid,
    "operator_company_id" uuid,
    "status" text default 'ACTIVE'::text,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "trading_regions" text[],
    "cargo_suitability_tags" text[],
    "vessel_name" text,
    "segment" text,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."vessels" enable row level security;


  create table "public"."workability_reasons" (
    "code" text not null,
    "applies_to" text not null,
    "label" text not null,
    "is_negative" boolean not null default true
      );



  create table "public"."workspace_messages" (
    "id" uuid not null default gen_random_uuid(),
    "message_text" text not null,
    "task_id" uuid,
    "created_by_crm_user_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone
      );


alter table "public"."workspace_messages" enable row level security;

alter sequence "public"."sanctions_sources_id_seq" owned by "public"."sanctions_sources"."id";

CREATE UNIQUE INDEX activities_pkey ON public.activities USING btree (id);

CREATE UNIQUE INDEX activity_log_pkey ON public.activity_log USING btree (id);

CREATE UNIQUE INDEX app_notifications_pkey ON public.app_notifications USING btree (id);

CREATE UNIQUE INDEX companies_pkey ON public.companies USING btree (id);

CREATE UNIQUE INDEX company_assignments_company_id_assigned_to_crm_user_id_assi_key ON public.company_assignments USING btree (company_id, assigned_to_crm_user_id, assignment_role);

CREATE UNIQUE INDEX company_assignments_pkey ON public.company_assignments USING btree (id);

CREATE UNIQUE INDEX company_followups_pkey ON public.company_followups USING btree (id);

CREATE UNIQUE INDEX contact_assignment_audit_pkey ON public.contact_assignment_audit USING btree (id);

CREATE UNIQUE INDEX contact_assignments_pkey ON public.contact_assignments USING btree (id);

CREATE UNIQUE INDEX contact_followups_pkey ON public.contact_followups USING btree (id);

CREATE UNIQUE INDEX contact_import_staging_pkey ON public.contact_import_staging USING btree (id);

CREATE UNIQUE INDEX contact_interactions_pkey ON public.contact_interactions USING btree (id);

CREATE UNIQUE INDEX contact_phones_pkey ON public.contact_phones USING btree (id);

CREATE UNIQUE INDEX contact_private_details_pkey ON public.contact_private_details USING btree (contact_id);

CREATE UNIQUE INDEX contact_stage_events_pkey ON public.contact_stage_events USING btree (id);

CREATE INDEX contact_stage_requests_contact_idx ON public.contact_stage_requests USING btree (contact_id);

CREATE UNIQUE INDEX contact_stage_requests_pkey ON public.contact_stage_requests USING btree (id);

CREATE INDEX contact_stage_requests_status_idx ON public.contact_stage_requests USING btree (status);

CREATE UNIQUE INDEX contacts_pkey ON public.contacts USING btree (id);

CREATE UNIQUE INDEX crm_users_auth_uid_uniq ON public.crm_users USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL);

CREATE UNIQUE INDEX crm_users_auth_user_id_key ON public.crm_users USING btree (auth_user_id);

CREATE UNIQUE INDEX crm_users_auth_user_id_ux ON public.crm_users USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL);

CREATE UNIQUE INDEX crm_users_email_ci_uniq ON public.crm_users USING btree (lower(email));

CREATE UNIQUE INDEX crm_users_email_key ON public.crm_users USING btree (email);

CREATE UNIQUE INDEX crm_users_email_uniq ON public.crm_users USING btree (lower(email));

CREATE UNIQUE INDEX crm_users_email_ux ON public.crm_users USING btree (lower(email));

CREATE UNIQUE INDEX crm_users_pkey ON public.crm_users USING btree (id);

CREATE UNIQUE INDEX enquiries_enquiry_number_key ON public.enquiries USING btree (enquiry_number);

CREATE UNIQUE INDEX enquiries_pkey ON public.enquiries USING btree (id);

CREATE UNIQUE INDEX enquiry_activities_pkey ON public.enquiry_activities USING btree (id);

CREATE UNIQUE INDEX enquiry_feed_pkey ON public.enquiry_feed USING btree (enquiry_id);

CREATE UNIQUE INDEX enquiry_participants_enquiry_id_crm_user_id_key ON public.enquiry_participants USING btree (enquiry_id, crm_user_id);

CREATE UNIQUE INDEX enquiry_participants_pkey ON public.enquiry_participants USING btree (id);

CREATE UNIQUE INDEX enquiry_quotes_pkey ON public.enquiry_quotes USING btree (id);

CREATE UNIQUE INDEX enquiry_quotes_quote_number_key ON public.enquiry_quotes USING btree (quote_number);

CREATE UNIQUE INDEX enquiry_recipients_enquiry_id_contact_id_key ON public.enquiry_recipients USING btree (enquiry_id, contact_id);

CREATE UNIQUE INDEX enquiry_recipients_pkey ON public.enquiry_recipients USING btree (id);

CREATE UNIQUE INDEX enquiry_responses_pkey ON public.enquiry_responses USING btree (id);

CREATE UNIQUE INDEX enquiry_shortlist_enquiry_id_candidate_enquiry_id_key ON public.enquiry_shortlist USING btree (enquiry_id, candidate_enquiry_id);

CREATE UNIQUE INDEX enquiry_shortlist_pkey ON public.enquiry_shortlist USING btree (id);

CREATE UNIQUE INDEX fixture_parties_pkey ON public.fixture_parties USING btree (id);

CREATE UNIQUE INDEX fixtures_lead_id_key ON public.fixtures USING btree (lead_id);

CREATE UNIQUE INDEX fixtures_pkey ON public.fixtures USING btree (id);

CREATE UNIQUE INDEX follow_ups_pkey ON public.follow_ups__legacy USING btree (id);

CREATE UNIQUE INDEX followup_notifications_log_pkey ON public.followup_notifications_log USING btree (id);

CREATE INDEX gin_vessels_cargo_tags ON public.vessels USING gin (cargo_suitability_tags);

CREATE INDEX gin_vessels_trading_regions ON public.vessels USING gin (trading_regions);

CREATE INDEX idx_activities_fixture_id ON public.activities USING btree (fixture_id);

CREATE INDEX idx_activities_lead_id ON public.activities USING btree (lead_id);

CREATE INDEX idx_activities_occurred_at ON public.activities USING btree (occurred_at);

CREATE INDEX idx_activity_next_action ON public.activity_log USING btree (next_action_date);

CREATE INDEX idx_activity_owner ON public.activity_log USING btree (owner);

CREATE INDEX idx_app_notifications_user_created ON public.app_notifications USING btree (user_id, created_at DESC);

CREATE INDEX idx_app_notifications_user_unread ON public.app_notifications USING btree (user_id) WHERE (is_read = false);

CREATE INDEX idx_ca_assigned_to_status ON public.contact_assignments USING btree (assigned_to_crm_user_id, status);

CREATE INDEX idx_ca_assignee_active ON public.contact_assignments USING btree (assigned_to_crm_user_id, assigned_at DESC) WHERE (status = 'ACTIVE'::text);

CREATE INDEX idx_ca_contact ON public.contact_assignments USING btree (contact_id);

CREATE INDEX idx_ca_contact_active ON public.contact_assignments USING btree (contact_id) WHERE (status = 'ACTIVE'::text);

CREATE INDEX idx_ca_contact_role_status ON public.contact_assignments USING btree (contact_id, assignment_role, status);

CREATE INDEX idx_ca_user ON public.contact_assignments USING btree (assigned_to_crm_user_id) WHERE (status = 'ACTIVE'::text);

CREATE INDEX idx_caa_contact_time ON public.contact_assignment_audit USING btree (contact_id, occurred_at DESC);

CREATE INDEX idx_cis_batch ON public.contact_import_staging USING btree (batch_id);

CREATE INDEX idx_cis_status ON public.contact_import_staging USING btree (status);

CREATE INDEX idx_cis_user ON public.contact_import_staging USING btree (imported_by_crm_user_id);

CREATE INDEX idx_company_assignments_active ON public.company_assignments USING btree (status) WHERE (status = 'ACTIVE'::text);

CREATE INDEX idx_company_assignments_company ON public.company_assignments USING btree (company_id);

CREATE INDEX idx_company_assignments_user ON public.company_assignments USING btree (assigned_to_crm_user_id);

CREATE INDEX idx_company_followups_company ON public.company_followups USING btree (company_id);

CREATE INDEX idx_company_followups_created_by ON public.company_followups USING btree (created_by);

CREATE INDEX idx_company_followups_due ON public.company_followups USING btree (due_at) WHERE (status = 'OPEN'::text);

CREATE INDEX idx_contact_phones_contact_id ON public.contact_phones USING btree (contact_id);

CREATE INDEX idx_contact_stage_events_contact ON public.contact_stage_events USING btree (contact_id);

CREATE INDEX idx_contact_stage_events_occurred_at ON public.contact_stage_events USING btree (occurred_at DESC);

CREATE INDEX idx_contacts_assigned_to ON public.contacts USING btree (assigned_to);

CREATE INDEX idx_contacts_company ON public.contacts USING btree (company_id);

CREATE INDEX idx_contacts_created_by ON public.contacts USING btree (created_by_crm_user_id, created_at DESC);

CREATE INDEX idx_contacts_deleted_at ON public.contacts USING btree (deleted_at);

CREATE INDEX idx_contacts_duplicate_status ON public.contacts USING btree (duplicate_status);

CREATE INDEX idx_contacts_email ON public.contacts USING btree (email);

CREATE INDEX idx_contacts_import_batch ON public.contacts USING btree (import_batch_id) WHERE (import_batch_id IS NOT NULL);

CREATE INDEX idx_contacts_merged_into ON public.contacts USING btree (merged_into_contact_id);

CREATE INDEX idx_contacts_phone ON public.contacts USING btree (phone);

CREATE INDEX idx_enq_participants_enquiry ON public.enquiry_participants USING btree (enquiry_id);

CREATE INDEX idx_enq_participants_user ON public.enquiry_participants USING btree (crm_user_id);

CREATE INDEX idx_enquiries_assigned ON public.enquiries USING btree (assigned_to) WHERE (assigned_to IS NOT NULL);

CREATE INDEX idx_enquiries_close_date ON public.enquiries USING btree (offer_time) WHERE (offer_time IS NOT NULL);

CREATE INDEX idx_enquiries_company ON public.enquiries USING btree (company_id);

CREATE INDEX idx_enquiries_contact ON public.enquiries USING btree (contact_id);

CREATE INDEX idx_enquiries_created ON public.enquiries USING btree (created_at DESC);

CREATE INDEX idx_enquiries_draft ON public.enquiries USING btree (is_draft) WHERE (is_draft = true);

CREATE INDEX idx_enquiries_number ON public.enquiries USING btree (enquiry_number);

CREATE INDEX idx_enquiries_status_open ON public.enquiries USING btree (status) WHERE (status <> ALL (ARRAY['WON'::text, 'LOST'::text, 'CANCELLED'::text]));

CREATE INDEX idx_enquiry_activities_enquiry ON public.enquiry_activities USING btree (enquiry_id, created_at DESC);

CREATE INDEX idx_enquiry_activities_type ON public.enquiry_activities USING btree (activity_type);

CREATE INDEX idx_enquiry_feed_updated ON public.enquiry_feed USING btree (updated_at DESC);

CREATE INDEX idx_enquiry_quotes_enquiry ON public.enquiry_quotes USING btree (enquiry_id);

CREATE INDEX idx_fixtures_broker ON public.fixtures USING btree (primary_broker_id);

CREATE INDEX idx_fixtures_status ON public.fixtures USING btree (status);

CREATE INDEX idx_followup_notification_notified_at ON public.followup_notifications_log USING btree (notified_at DESC);

CREATE INDEX idx_followup_notification_notified_to ON public.followup_notifications_log USING btree (notified_to);

CREATE INDEX idx_followups_assignment ON public.contact_followups USING btree (assignment_id);

CREATE INDEX idx_followups_created_by ON public.contact_followups USING btree (created_by);

CREATE INDEX idx_followups_due_open ON public.contact_followups USING btree (due_at) WHERE (status = 'OPEN'::text);

CREATE INDEX idx_followups_parent ON public.contact_followups USING btree (parent_followup_id) WHERE (parent_followup_id IS NOT NULL);

CREATE INDEX idx_followups_recurrence ON public.contact_followups USING btree (recurrence_enabled, due_at) WHERE ((recurrence_enabled = true) AND (status = 'COMPLETED'::text));

CREATE INDEX idx_import_batches_created_by ON public.import_batches USING btree (created_by);

CREATE INDEX idx_import_batches_status ON public.import_batches USING btree (status);

CREATE INDEX idx_interactions_contact_date ON public.interactions__legacy USING btree (contact_id, interaction_at DESC);

CREATE INDEX idx_interactions_created_by_date ON public.interactions__legacy USING btree (created_by, interaction_at DESC);

CREATE INDEX idx_interactions_log_channel_time ON public.interactions_log USING btree (channel, occurred_at DESC);

CREATE INDEX idx_interactions_log_contact_time ON public.interactions_log USING btree (contact_id, occurred_at DESC);

CREATE INDEX idx_interactions_log_user_time ON public.interactions_log USING btree (created_by_crm_user_id, occurred_at DESC);

CREATE INDEX idx_interactions_next_action ON public.interactions__legacy USING btree (next_action_date) WHERE (next_action_date IS NOT NULL);

CREATE INDEX idx_interactions_outcome ON public.interactions__legacy USING btree (outcome) WHERE (outcome IS NOT NULL);

CREATE INDEX idx_interactions_type ON public.interactions__legacy USING btree (interaction_type);

CREATE INDEX idx_invoice_payments_invoice_receivedat ON public.invoice_payments USING btree (invoice_id, received_at DESC);

CREATE INDEX idx_invoices_due ON public.invoices USING btree (due_date);

CREATE INDEX idx_invoices_fixture ON public.invoices USING btree (fixture_id);

CREATE INDEX idx_invoices_status ON public.invoices USING btree (payment_status);

CREATE INDEX idx_leads_next_followup ON public.leads USING btree (next_followup_date);

CREATE INDEX idx_leads_primary_broker ON public.leads USING btree (primary_broker_id);

CREATE INDEX idx_leads_status ON public.leads USING btree (status);

CREATE INDEX idx_leads_type ON public.leads USING btree (lead_type);

CREATE INDEX idx_ndl_queue_id ON public.notification_delivery_log USING btree (delivery_queue_id);

CREATE INDEX idx_ndq_notification_log ON public.notification_delivery_queue USING btree (notification_log_id);

CREATE INDEX idx_ndq_pickup ON public.notification_delivery_queue USING btree (status, next_attempt_at) WHERE (status = 'PENDING'::public.delivery_status);

CREATE INDEX idx_neg_option ON public.negotiation_log USING btree (option_id);

CREATE INDEX idx_negotiation_log_option_loggedat ON public.negotiation_log USING btree (option_id, logged_at);

CREATE INDEX idx_negotiation_log_option_loggedat_desc ON public.negotiation_log USING btree (option_id, logged_at DESC);

CREATE INDEX idx_negotiation_log_option_status ON public.negotiation_log USING btree (option_id, status);

CREATE INDEX idx_ops_fixture ON public.ops USING btree (fixture_id);

CREATE INDEX idx_options_lead ON public.options_shown USING btree (lead_id);

CREATE INDEX idx_options_outcome ON public.options_shown USING btree (outcome);

CREATE INDEX idx_options_shown_by ON public.options_shown USING btree (shown_by);

CREATE INDEX idx_options_shown_lead_shownat ON public.options_shown USING btree (lead_id, shown_at DESC);

CREATE INDEX idx_quotes_enquiry ON public.enquiry_quotes USING btree (enquiry_id);

CREATE INDEX idx_quotes_number ON public.enquiry_quotes USING btree (quote_number);

CREATE INDEX idx_quotes_status ON public.enquiry_quotes USING btree (status);

CREATE INDEX idx_shortlist_candidate ON public.enquiry_shortlist USING btree (candidate_enquiry_id);

CREATE INDEX idx_shortlist_enquiry ON public.enquiry_shortlist USING btree (enquiry_id);

CREATE INDEX idx_vessels_dwt ON public.vessels USING btree (dwt);

CREATE INDEX idx_vessels_name ON public.vessels USING btree (name);

CREATE INDEX idx_vessels_owner ON public.vessels USING btree (owner_company_id);

CREATE INDEX idx_vessels_segment ON public.vessels USING btree (segment);

CREATE INDEX idx_vessels_size_class ON public.vessels USING btree (size_class);

CREATE UNIQUE INDEX import_batches_batch_id_key ON public.import_batches USING btree (batch_id);

CREATE UNIQUE INDEX import_batches_pkey ON public.import_batches USING btree (id);

CREATE INDEX interactions_contact_idx ON public.interactions__legacy USING btree (contact_id, interaction_at DESC);

CREATE INDEX interactions_created_by_idx ON public.interactions__legacy USING btree (created_by);

CREATE UNIQUE INDEX interactions_log_pkey ON public.interactions_log USING btree (id);

CREATE UNIQUE INDEX interactions_pkey ON public.interactions__legacy USING btree (id);

CREATE UNIQUE INDEX invoice_payments_pkey ON public.invoice_payments USING btree (id);

CREATE UNIQUE INDEX invoices_pkey ON public.invoices USING btree (id);

CREATE INDEX ix_ci_contact_time ON public.contact_interactions USING btree (contact_id, interaction_at DESC);

CREATE INDEX ix_ci_user_time ON public.contact_interactions USING btree (user_id, interaction_at DESC);

CREATE INDEX ix_contact_assignments_user ON public.contact_assignments USING btree (assigned_to);

CREATE INDEX ix_contacts_assigned_user ON public.contacts USING btree (assigned_to_user_id);

CREATE INDEX ix_contacts_company ON public.contacts USING btree (company_id);

CREATE INDEX ix_enquiry_recipients_contact ON public.enquiry_recipients USING btree (contact_id);

CREATE INDEX ix_enquiry_recipients_enq ON public.enquiry_recipients USING btree (enquiry_id);

CREATE INDEX ix_fixture_parties_contact ON public.fixture_parties USING btree (contact_id);

CREATE INDEX ix_fixture_parties_fixture ON public.fixture_parties USING btree (fixture_id);

CREATE INDEX ix_fu_user_due ON public.follow_ups__legacy USING btree (assigned_to, status, due_at);

CREATE INDEX ix_vessels_operator ON public.vessels USING btree (operator_company_id);

CREATE INDEX ix_vessels_owner ON public.vessels USING btree (owner_company_id);

CREATE UNIQUE INDEX leads_pkey ON public.leads USING btree (id);

CREATE UNIQUE INDEX negotiation_log_pkey ON public.negotiation_log USING btree (id);

CREATE UNIQUE INDEX no_duplicate_active_assignee_per_contact ON public.contact_assignments USING btree (contact_id, assigned_to_crm_user_id) WHERE (status = 'ACTIVE'::text);

CREATE UNIQUE INDEX notification_delivery_log_pkey ON public.notification_delivery_log USING btree (id);

CREATE UNIQUE INDEX notification_delivery_queue_pkey ON public.notification_delivery_queue USING btree (id);

CREATE UNIQUE INDEX one_active_primary_per_contact ON public.contact_assignments USING btree (contact_id) WHERE ((status = 'ACTIVE'::text) AND (upper(assignment_role) = 'PRIMARY'::text));

CREATE UNIQUE INDEX one_active_secondary_per_contact ON public.contact_assignments USING btree (contact_id) WHERE ((status = 'ACTIVE'::text) AND (assignment_role = 'SECONDARY'::text));

CREATE UNIQUE INDEX ops_pkey ON public.ops USING btree (id);

CREATE UNIQUE INDEX options_shown_pkey ON public.options_shown USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX recovery_log_pkey ON public.recovery_log USING btree (id);

CREATE UNIQUE INDEX sanctions_sources_code_key ON public.sanctions_sources USING btree (code);

CREATE UNIQUE INDEX sanctions_sources_pkey ON public.sanctions_sources USING btree (id);

CREATE UNIQUE INDEX task_comments_pkey ON public.task_comments USING btree (id);

CREATE UNIQUE INDEX task_recipients_pkey ON public.task_recipients USING btree (task_id, crm_user_id);

CREATE UNIQUE INDEX task_user_state_pkey ON public.task_user_state USING btree (task_id, crm_user_id);

CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);

CREATE UNIQUE INDEX uq_companies_company_name ON public.companies USING btree (company_name);

CREATE UNIQUE INDEX uq_contact_phones_contact_phone ON public.contact_phones USING btree (contact_id, phone_number);

CREATE UNIQUE INDEX uq_contact_phones_primary_per_contact ON public.contact_phones USING btree (contact_id) WHERE is_primary;

CREATE UNIQUE INDEX uq_contacts_created_from_staging_id ON public.contacts USING btree (created_from_staging_id);

CREATE UNIQUE INDEX uq_followup_notification_once ON public.followup_notifications_log USING btree (followup_id, notified_to, notification_type, channel);

CREATE UNIQUE INDEX uq_vessel_source ON public.vessel_sanctions USING btree (vessel_id, source_id);

CREATE UNIQUE INDEX user_notepad_pkey ON public.user_notepad USING btree (crm_user_id);

CREATE UNIQUE INDEX ux_ca_open_contact_user ON public.contact_assignments USING btree (contact_id, assigned_to_crm_user_id) WHERE (ended_at IS NULL);

CREATE UNIQUE INDEX ux_companies_name_type ON public.companies USING btree (lower(company_name), company_type);

CREATE UNIQUE INDEX ux_contact_assignments_contact_user ON public.contact_assignments USING btree (contact_id, assigned_to);

CREATE UNIQUE INDEX vessel_sanctions_history_pkey ON public.vessel_sanctions_history USING btree (id);

CREATE UNIQUE INDEX vessel_sanctions_pkey ON public.vessel_sanctions USING btree (id);

CREATE UNIQUE INDEX vessels_pkey ON public.vessels USING btree (id);

CREATE UNIQUE INDEX workability_reasons_pkey ON public.workability_reasons USING btree (code);

CREATE INDEX workspace_messages_created_at_idx ON public.workspace_messages USING btree (created_at DESC);

CREATE UNIQUE INDEX workspace_messages_pkey ON public.workspace_messages USING btree (id);

CREATE INDEX workspace_messages_task_id_idx ON public.workspace_messages USING btree (task_id);

alter table "public"."activities" add constraint "activities_pkey" PRIMARY KEY using index "activities_pkey";

alter table "public"."activity_log" add constraint "activity_log_pkey" PRIMARY KEY using index "activity_log_pkey";

alter table "public"."app_notifications" add constraint "app_notifications_pkey" PRIMARY KEY using index "app_notifications_pkey";

alter table "public"."companies" add constraint "companies_pkey" PRIMARY KEY using index "companies_pkey";

alter table "public"."company_assignments" add constraint "company_assignments_pkey" PRIMARY KEY using index "company_assignments_pkey";

alter table "public"."company_followups" add constraint "company_followups_pkey" PRIMARY KEY using index "company_followups_pkey";

alter table "public"."contact_assignment_audit" add constraint "contact_assignment_audit_pkey" PRIMARY KEY using index "contact_assignment_audit_pkey";

alter table "public"."contact_assignments" add constraint "contact_assignments_pkey" PRIMARY KEY using index "contact_assignments_pkey";

alter table "public"."contact_followups" add constraint "contact_followups_pkey" PRIMARY KEY using index "contact_followups_pkey";

alter table "public"."contact_import_staging" add constraint "contact_import_staging_pkey" PRIMARY KEY using index "contact_import_staging_pkey";

alter table "public"."contact_interactions" add constraint "contact_interactions_pkey" PRIMARY KEY using index "contact_interactions_pkey";

alter table "public"."contact_phones" add constraint "contact_phones_pkey" PRIMARY KEY using index "contact_phones_pkey";

alter table "public"."contact_private_details" add constraint "contact_private_details_pkey" PRIMARY KEY using index "contact_private_details_pkey";

alter table "public"."contact_stage_events" add constraint "contact_stage_events_pkey" PRIMARY KEY using index "contact_stage_events_pkey";

alter table "public"."contact_stage_requests" add constraint "contact_stage_requests_pkey" PRIMARY KEY using index "contact_stage_requests_pkey";

alter table "public"."contacts" add constraint "contacts_pkey" PRIMARY KEY using index "contacts_pkey";

alter table "public"."crm_users" add constraint "crm_users_pkey" PRIMARY KEY using index "crm_users_pkey";

alter table "public"."enquiries" add constraint "enquiries_pkey" PRIMARY KEY using index "enquiries_pkey";

alter table "public"."enquiry_activities" add constraint "enquiry_activities_pkey" PRIMARY KEY using index "enquiry_activities_pkey";

alter table "public"."enquiry_feed" add constraint "enquiry_feed_pkey" PRIMARY KEY using index "enquiry_feed_pkey";

alter table "public"."enquiry_participants" add constraint "enquiry_participants_pkey" PRIMARY KEY using index "enquiry_participants_pkey";

alter table "public"."enquiry_quotes" add constraint "enquiry_quotes_pkey" PRIMARY KEY using index "enquiry_quotes_pkey";

alter table "public"."enquiry_recipients" add constraint "enquiry_recipients_pkey" PRIMARY KEY using index "enquiry_recipients_pkey";

alter table "public"."enquiry_responses" add constraint "enquiry_responses_pkey" PRIMARY KEY using index "enquiry_responses_pkey";

alter table "public"."enquiry_shortlist" add constraint "enquiry_shortlist_pkey" PRIMARY KEY using index "enquiry_shortlist_pkey";

alter table "public"."fixture_parties" add constraint "fixture_parties_pkey" PRIMARY KEY using index "fixture_parties_pkey";

alter table "public"."fixtures" add constraint "fixtures_pkey" PRIMARY KEY using index "fixtures_pkey";

alter table "public"."follow_ups__legacy" add constraint "follow_ups_pkey" PRIMARY KEY using index "follow_ups_pkey";

alter table "public"."followup_notifications_log" add constraint "followup_notifications_log_pkey" PRIMARY KEY using index "followup_notifications_log_pkey";

alter table "public"."import_batches" add constraint "import_batches_pkey" PRIMARY KEY using index "import_batches_pkey";

alter table "public"."interactions__legacy" add constraint "interactions_pkey" PRIMARY KEY using index "interactions_pkey";

alter table "public"."interactions_log" add constraint "interactions_log_pkey" PRIMARY KEY using index "interactions_log_pkey";

alter table "public"."invoice_payments" add constraint "invoice_payments_pkey" PRIMARY KEY using index "invoice_payments_pkey";

alter table "public"."invoices" add constraint "invoices_pkey" PRIMARY KEY using index "invoices_pkey";

alter table "public"."leads" add constraint "leads_pkey" PRIMARY KEY using index "leads_pkey";

alter table "public"."negotiation_log" add constraint "negotiation_log_pkey" PRIMARY KEY using index "negotiation_log_pkey";

alter table "public"."notification_delivery_log" add constraint "notification_delivery_log_pkey" PRIMARY KEY using index "notification_delivery_log_pkey";

alter table "public"."notification_delivery_queue" add constraint "notification_delivery_queue_pkey" PRIMARY KEY using index "notification_delivery_queue_pkey";

alter table "public"."ops" add constraint "ops_pkey" PRIMARY KEY using index "ops_pkey";

alter table "public"."options_shown" add constraint "options_shown_pkey" PRIMARY KEY using index "options_shown_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."recovery_log" add constraint "recovery_log_pkey" PRIMARY KEY using index "recovery_log_pkey";

alter table "public"."sanctions_sources" add constraint "sanctions_sources_pkey" PRIMARY KEY using index "sanctions_sources_pkey";

alter table "public"."task_comments" add constraint "task_comments_pkey" PRIMARY KEY using index "task_comments_pkey";

alter table "public"."task_recipients" add constraint "task_recipients_pkey" PRIMARY KEY using index "task_recipients_pkey";

alter table "public"."task_user_state" add constraint "task_user_state_pkey" PRIMARY KEY using index "task_user_state_pkey";

alter table "public"."tasks" add constraint "tasks_pkey" PRIMARY KEY using index "tasks_pkey";

alter table "public"."user_notepad" add constraint "user_notepad_pkey" PRIMARY KEY using index "user_notepad_pkey";

alter table "public"."vessel_sanctions" add constraint "vessel_sanctions_pkey" PRIMARY KEY using index "vessel_sanctions_pkey";

alter table "public"."vessel_sanctions_history" add constraint "vessel_sanctions_history_pkey" PRIMARY KEY using index "vessel_sanctions_history_pkey";

alter table "public"."vessels" add constraint "vessels_pkey" PRIMARY KEY using index "vessels_pkey";

alter table "public"."workability_reasons" add constraint "workability_reasons_pkey" PRIMARY KEY using index "workability_reasons_pkey";

alter table "public"."workspace_messages" add constraint "workspace_messages_pkey" PRIMARY KEY using index "workspace_messages_pkey";

alter table "public"."activities" add constraint "activities_fixture_id_fkey" FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE SET NULL not valid;

alter table "public"."activities" validate constraint "activities_fixture_id_fkey";

alter table "public"."activities" add constraint "activities_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL not valid;

alter table "public"."activities" validate constraint "activities_lead_id_fkey";

alter table "public"."activity_log" add constraint "activity_log_activity_type_check" CHECK ((activity_type = ANY (ARRAY['CALL'::text, 'WHATSAPP'::text, 'EMAIL'::text, 'ICE'::text, 'MEETING'::text, 'NOTE'::text]))) not valid;

alter table "public"."activity_log" validate constraint "activity_log_activity_type_check";

alter table "public"."activity_log" add constraint "activity_log_linked_type_check" CHECK ((linked_type = ANY (ARRAY['COMPANY'::text, 'CONTACT'::text, 'LEAD'::text, 'OPTION'::text, 'FIXTURE'::text, 'OPS'::text, 'INVOICE'::text]))) not valid;

alter table "public"."activity_log" validate constraint "activity_log_linked_type_check";

alter table "public"."activity_log" add constraint "activity_log_owner_fkey" FOREIGN KEY (owner) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."activity_log" validate constraint "activity_log_owner_fkey";

alter table "public"."app_notifications" add constraint "app_notifications_crm_user_id_fkey" FOREIGN KEY (crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."app_notifications" validate constraint "app_notifications_crm_user_id_fkey";

alter table "public"."app_notifications" add constraint "app_notifications_followup_id_fkey" FOREIGN KEY (followup_id) REFERENCES public.contact_followups(id) ON DELETE SET NULL not valid;

alter table "public"."app_notifications" validate constraint "app_notifications_followup_id_fkey";

alter table "public"."app_notifications" add constraint "app_notifications_notif_type_check" CHECK ((notif_type = ANY (ARRAY['FOLLOWUP_OVERDUE'::text, 'FOLLOWUP_DUE_TODAY'::text]))) not valid;

alter table "public"."app_notifications" validate constraint "app_notifications_notif_type_check";

alter table "public"."app_notifications" add constraint "app_notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."app_notifications" validate constraint "app_notifications_user_id_fkey";

alter table "public"."companies" add constraint "companies_company_type_check" CHECK ((company_type = ANY (ARRAY['Owner'::text, 'Charterer'::text, 'Broker'::text, 'Other'::text]))) not valid;

alter table "public"."companies" validate constraint "companies_company_type_check";

alter table "public"."companies" add constraint "companies_company_type_other_text_check" CHECK ((((company_type <> 'Other'::text) AND ((company_type_other_text IS NULL) OR (btrim(company_type_other_text) = ''::text))) OR ((company_type = 'Other'::text) AND (company_type_other_text IS NOT NULL) AND (btrim(company_type_other_text) <> ''::text)))) not valid;

alter table "public"."companies" validate constraint "companies_company_type_other_text_check";

alter table "public"."companies" add constraint "companies_status_check" CHECK ((status = ANY (ARRAY['ONBOARDED'::text, 'ACTIVE_NOT_ONBOARDED'::text, 'INACTIVE'::text]))) not valid;

alter table "public"."companies" validate constraint "companies_status_check";

alter table "public"."company_assignments" add constraint "company_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES public.crm_users(id) not valid;

alter table "public"."company_assignments" validate constraint "company_assignments_assigned_by_fkey";

alter table "public"."company_assignments" add constraint "company_assignments_assigned_to_crm_user_id_fkey" FOREIGN KEY (assigned_to_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."company_assignments" validate constraint "company_assignments_assigned_to_crm_user_id_fkey";

alter table "public"."company_assignments" add constraint "company_assignments_assignment_role_check" CHECK ((assignment_role = ANY (ARRAY['PRIMARY'::text, 'SECONDARY'::text]))) not valid;

alter table "public"."company_assignments" validate constraint "company_assignments_assignment_role_check";

alter table "public"."company_assignments" add constraint "company_assignments_company_id_assigned_to_crm_user_id_assi_key" UNIQUE using index "company_assignments_company_id_assigned_to_crm_user_id_assi_key";

alter table "public"."company_assignments" add constraint "company_assignments_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_assignments" validate constraint "company_assignments_company_id_fkey";

alter table "public"."company_assignments" add constraint "company_assignments_stage_check" CHECK ((stage = ANY (ARRAY['NEW'::text, 'QUALIFYING'::text, 'ENGAGED'::text, 'NEGOTIATING'::text, 'WON'::text, 'LOST'::text, 'INACTIVE'::text]))) not valid;

alter table "public"."company_assignments" validate constraint "company_assignments_stage_check";

alter table "public"."company_assignments" add constraint "company_assignments_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text]))) not valid;

alter table "public"."company_assignments" validate constraint "company_assignments_status_check";

alter table "public"."company_followups" add constraint "company_followups_company_assignment_id_fkey" FOREIGN KEY (company_assignment_id) REFERENCES public.company_assignments(id) not valid;

alter table "public"."company_followups" validate constraint "company_followups_company_assignment_id_fkey";

alter table "public"."company_followups" add constraint "company_followups_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_followups" validate constraint "company_followups_company_id_fkey";

alter table "public"."company_followups" add constraint "company_followups_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.crm_users(id) not valid;

alter table "public"."company_followups" validate constraint "company_followups_created_by_fkey";

alter table "public"."company_followups" add constraint "company_followups_followup_type_check" CHECK ((followup_type = ANY (ARRAY['CALL_BACK'::text, 'EMAIL'::text, 'MEETING'::text, 'TASK'::text, 'REMINDER'::text, 'FIND_CONTACT'::text]))) not valid;

alter table "public"."company_followups" validate constraint "company_followups_followup_type_check";

alter table "public"."company_followups" add constraint "company_followups_parent_followup_id_fkey" FOREIGN KEY (parent_followup_id) REFERENCES public.company_followups(id) not valid;

alter table "public"."company_followups" validate constraint "company_followups_parent_followup_id_fkey";

alter table "public"."company_followups" add constraint "company_followups_recurrence_frequency_check" CHECK ((recurrence_frequency = ANY (ARRAY['DAILY'::text, 'WEEKLY'::text, 'BIWEEKLY'::text, 'MONTHLY'::text, 'QUARTERLY'::text, 'YEARLY'::text]))) not valid;

alter table "public"."company_followups" validate constraint "company_followups_recurrence_frequency_check";

alter table "public"."company_followups" add constraint "company_followups_status_check" CHECK ((status = ANY (ARRAY['OPEN'::text, 'COMPLETED'::text, 'CANCELLED'::text, 'MISSED'::text]))) not valid;

alter table "public"."company_followups" validate constraint "company_followups_status_check";

alter table "public"."contact_assignment_audit" add constraint "contact_assignment_audit_action_check" CHECK ((action = ANY (ARRAY['ASSIGNED_PRIMARY'::text, 'ENDED_PRIMARY'::text]))) not valid;

alter table "public"."contact_assignment_audit" validate constraint "contact_assignment_audit_action_check";

alter table "public"."contact_assignment_audit" add constraint "contact_assignment_audit_actor_crm_user_id_fkey" FOREIGN KEY (actor_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_assignment_audit" validate constraint "contact_assignment_audit_actor_crm_user_id_fkey";

alter table "public"."contact_assignment_audit" add constraint "contact_assignment_audit_assignee_crm_user_id_fkey" FOREIGN KEY (assignee_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_assignment_audit" validate constraint "contact_assignment_audit_assignee_crm_user_id_fkey";

alter table "public"."contact_assignment_audit" add constraint "contact_assignment_audit_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES public.contact_assignments(id) not valid;

alter table "public"."contact_assignment_audit" validate constraint "contact_assignment_audit_assignment_id_fkey";

alter table "public"."contact_assignment_audit" add constraint "contact_assignment_audit_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) not valid;

alter table "public"."contact_assignment_audit" validate constraint "contact_assignment_audit_contact_id_fkey";

alter table "public"."contact_assignments" add constraint "contact_assignments_assigned_by_crm_user_fk" FOREIGN KEY (assigned_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_assigned_by_crm_user_fk";

alter table "public"."contact_assignments" add constraint "contact_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES public.crm_users(id) ON DELETE CASCADE not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_assigned_by_fkey";

alter table "public"."contact_assignments" add constraint "contact_assignments_assigned_to_crm_user_fk" FOREIGN KEY (assigned_to_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_assigned_to_crm_user_fk";

alter table "public"."contact_assignments" add constraint "contact_assignments_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.crm_users(id) ON DELETE CASCADE not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_assigned_to_fkey";

alter table "public"."contact_assignments" add constraint "contact_assignments_closed_requires_ended_at_chk" CHECK (((status <> 'CLOSED'::text) OR (ended_at IS NOT NULL))) not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_closed_requires_ended_at_chk";

alter table "public"."contact_assignments" add constraint "contact_assignments_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_contact_id_fkey";

alter table "public"."contact_assignments" add constraint "contact_assignments_created_by_crm_user_id_fkey" FOREIGN KEY (created_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_created_by_crm_user_id_fkey";

alter table "public"."contact_assignments" add constraint "contact_assignments_ended_by_crm_user_id_fkey" FOREIGN KEY (ended_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_ended_by_crm_user_id_fkey";

alter table "public"."contact_assignments" add constraint "contact_assignments_role_chk" CHECK ((lower(TRIM(BOTH FROM assignment_role)) = ANY (ARRAY['primary'::text, 'secondary'::text]))) not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_role_chk";

alter table "public"."contact_assignments" add constraint "contact_assignments_stage_changed_by_crm_user_fk" FOREIGN KEY (stage_changed_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_stage_changed_by_crm_user_fk";

alter table "public"."contact_assignments" add constraint "contact_assignments_stage_changed_by_fkey" FOREIGN KEY (stage_changed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_stage_changed_by_fkey";

alter table "public"."contact_assignments" add constraint "contact_assignments_stage_check" CHECK ((stage = ANY (ARRAY['COLD_CALLING'::text, 'ASPIRATION'::text, 'ACHIEVEMENT'::text, 'INACTIVE'::text]))) not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_stage_check";

alter table "public"."contact_assignments" add constraint "contact_assignments_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'PAUSED'::text, 'CLOSED'::text]))) not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_status_check";

alter table "public"."contact_assignments" add constraint "contact_assignments_updated_by_crm_user_id_fkey" FOREIGN KEY (updated_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_assignments" validate constraint "contact_assignments_updated_by_crm_user_id_fkey";

alter table "public"."contact_followups" add constraint "contact_followups_acknowledged_by_crm_user_id_fkey" FOREIGN KEY (acknowledged_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_followups" validate constraint "contact_followups_acknowledged_by_crm_user_id_fkey";

alter table "public"."contact_followups" add constraint "contact_followups_assigned_to_crm_user_id_fkey" FOREIGN KEY (assigned_to_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_followups" validate constraint "contact_followups_assigned_to_crm_user_id_fkey";

alter table "public"."contact_followups" add constraint "contact_followups_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES public.contact_assignments(id) ON DELETE RESTRICT not valid;

alter table "public"."contact_followups" validate constraint "contact_followups_assignment_id_fkey";

alter table "public"."contact_followups" add constraint "contact_followups_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE RESTRICT not valid;

alter table "public"."contact_followups" validate constraint "contact_followups_contact_id_fkey";

alter table "public"."contact_followups" add constraint "contact_followups_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_followups" validate constraint "contact_followups_created_by_fkey";

alter table "public"."contact_followups" add constraint "contact_followups_followup_type_check" CHECK ((followup_type = ANY (ARRAY['CALL'::text, 'EMAIL'::text, 'MEETING'::text, 'WHATSAPP'::text, 'OTHER'::text]))) not valid;

alter table "public"."contact_followups" validate constraint "contact_followups_followup_type_check";

alter table "public"."contact_followups" add constraint "contact_followups_interaction_id_fkey" FOREIGN KEY (interaction_id) REFERENCES public.contact_interactions(id) ON DELETE SET NULL not valid;

alter table "public"."contact_followups" validate constraint "contact_followups_interaction_id_fkey";

alter table "public"."contact_followups" add constraint "contact_followups_interaction_id_new_fkey" FOREIGN KEY (interaction_id_new) REFERENCES public.interactions__legacy(id) not valid;

alter table "public"."contact_followups" validate constraint "contact_followups_interaction_id_new_fkey";

alter table "public"."contact_followups" add constraint "contact_followups_parent_followup_id_fkey" FOREIGN KEY (parent_followup_id) REFERENCES public.contact_followups(id) not valid;

alter table "public"."contact_followups" validate constraint "contact_followups_parent_followup_id_fkey";

alter table "public"."contact_followups" add constraint "contact_followups_recurrence_frequency_check" CHECK ((recurrence_frequency = ANY (ARRAY['DAILY'::text, 'WEEKLY'::text, 'BIWEEKLY'::text, 'MONTHLY'::text, 'QUARTERLY'::text, 'YEARLY'::text]))) not valid;

alter table "public"."contact_followups" validate constraint "contact_followups_recurrence_frequency_check";

alter table "public"."contact_followups" add constraint "contact_followups_status_check" CHECK ((status = ANY (ARRAY['OPEN'::text, 'ACKNOWLEDGED'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'CANCELLED'::text, 'OVERDUE'::text]))) not valid;

alter table "public"."contact_followups" validate constraint "contact_followups_status_check";

alter table "public"."contact_import_staging" add constraint "contact_import_staging_created_contact_id_fkey" FOREIGN KEY (created_contact_id) REFERENCES public.contacts(id) not valid;

alter table "public"."contact_import_staging" validate constraint "contact_import_staging_created_contact_id_fkey";

alter table "public"."contact_import_staging" add constraint "contact_import_staging_duplicate_contact_id_fkey" FOREIGN KEY (duplicate_contact_id) REFERENCES public.contacts(id) not valid;

alter table "public"."contact_import_staging" validate constraint "contact_import_staging_duplicate_contact_id_fkey";

alter table "public"."contact_import_staging" add constraint "contact_import_staging_imported_by_crm_user_id_fkey" FOREIGN KEY (imported_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_import_staging" validate constraint "contact_import_staging_imported_by_crm_user_id_fkey";

alter table "public"."contact_import_staging" add constraint "contact_import_staging_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'VALIDATED'::text, 'IMPORTED'::text, 'FAILED'::text, 'DUPLICATE'::text]))) not valid;

alter table "public"."contact_import_staging" validate constraint "contact_import_staging_status_check";

alter table "public"."contact_interactions" add constraint "contact_interactions_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE not valid;

alter table "public"."contact_interactions" validate constraint "contact_interactions_contact_id_fkey";

alter table "public"."contact_interactions" add constraint "contact_interactions_direction_check" CHECK ((direction = ANY (ARRAY['OUT'::text, 'IN'::text]))) not valid;

alter table "public"."contact_interactions" validate constraint "contact_interactions_direction_check";

alter table "public"."contact_interactions" add constraint "contact_interactions_interaction_type_check" CHECK ((interaction_type = ANY (ARRAY['COLD_CALL'::text, 'CALL'::text, 'EMAIL_SENT'::text, 'WHATSAPP_SENT'::text, 'WHATSAPP_REPLY'::text, 'MEETING'::text, 'NOTE'::text]))) not valid;

alter table "public"."contact_interactions" validate constraint "contact_interactions_interaction_type_check";

alter table "public"."contact_phones" add constraint "contact_phones_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE not valid;

alter table "public"."contact_phones" validate constraint "contact_phones_contact_id_fkey";

alter table "public"."contact_phones" add constraint "contact_phones_phone_type_check" CHECK ((phone_type = ANY (ARRAY['Mobile'::text, 'WhatsApp'::text, 'Landline'::text]))) not valid;

alter table "public"."contact_phones" validate constraint "contact_phones_phone_type_check";

alter table "public"."contact_private_details" add constraint "contact_private_details_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE not valid;

alter table "public"."contact_private_details" validate constraint "contact_private_details_contact_id_fkey";

alter table "public"."contact_private_details" add constraint "contact_private_details_updated_by_crm_user_id_fkey" FOREIGN KEY (updated_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_private_details" validate constraint "contact_private_details_updated_by_crm_user_id_fkey";

alter table "public"."contact_stage_events" add constraint "contact_stage_events_actor_crm_user_id_fkey" FOREIGN KEY (actor_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_stage_events" validate constraint "contact_stage_events_actor_crm_user_id_fkey";

alter table "public"."contact_stage_events" add constraint "contact_stage_events_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) not valid;

alter table "public"."contact_stage_events" validate constraint "contact_stage_events_contact_id_fkey";

alter table "public"."contact_stage_requests" add constraint "contact_stage_requests_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE not valid;

alter table "public"."contact_stage_requests" validate constraint "contact_stage_requests_contact_id_fkey";

alter table "public"."contact_stage_requests" add constraint "contact_stage_requests_decided_by_crm_user_id_fkey" FOREIGN KEY (decided_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_stage_requests" validate constraint "contact_stage_requests_decided_by_crm_user_id_fkey";

alter table "public"."contact_stage_requests" add constraint "contact_stage_requests_requested_by_crm_user_id_fkey" FOREIGN KEY (requested_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."contact_stage_requests" validate constraint "contact_stage_requests_requested_by_crm_user_id_fkey";

alter table "public"."contact_stage_requests" add constraint "contact_stage_requests_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))) not valid;

alter table "public"."contact_stage_requests" validate constraint "contact_stage_requests_status_check";

alter table "public"."contacts" add constraint "contacts_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."contacts" validate constraint "contacts_assigned_to_fkey";

alter table "public"."contacts" add constraint "contacts_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT not valid;

alter table "public"."contacts" validate constraint "contacts_company_id_fkey";

alter table "public"."contacts" add constraint "contacts_duplicate_status_chk" CHECK ((duplicate_status = ANY (ARRAY['pending'::text, 'resolved'::text, 'cleared'::text]))) not valid;

alter table "public"."contacts" validate constraint "contacts_duplicate_status_chk";

alter table "public"."contacts" add constraint "contacts_no_self_merge_chk" CHECK (((merged_into_contact_id IS NULL) OR (merged_into_contact_id <> id))) not valid;

alter table "public"."contacts" validate constraint "contacts_no_self_merge_chk";

alter table "public"."contacts" add constraint "contacts_phone_type_check" CHECK ((phone_type = ANY (ARRAY['WHATSAPP'::text, 'MOBILE'::text, 'LANDLINE'::text, 'OFFICE'::text, 'HOME'::text, 'FAX'::text, 'OTHER'::text]))) not valid;

alter table "public"."contacts" validate constraint "contacts_phone_type_check";

alter table "public"."contacts" add constraint "contacts_stage_check" CHECK ((stage = ANY (ARRAY['COLD_CALLING'::text, 'ASPIRATION'::text, 'ACHIEVEMENT'::text, 'INACTIVE'::text]))) not valid;

alter table "public"."contacts" validate constraint "contacts_stage_check";

alter table "public"."contacts" add constraint "fk_contacts_assigned_user" FOREIGN KEY (assigned_to_user_id) REFERENCES public.crm_users(id) ON DELETE SET NULL not valid;

alter table "public"."contacts" validate constraint "fk_contacts_assigned_user";

alter table "public"."contacts" add constraint "uq_contacts_created_from_staging_id" UNIQUE using index "uq_contacts_created_from_staging_id";

alter table "public"."crm_users" add constraint "crm_users_auth_user_id_key" UNIQUE using index "crm_users_auth_user_id_key";

alter table "public"."crm_users" add constraint "crm_users_email_domain_check" CHECK ((lower(email) ~~ '%@aqmaritime.com'::text)) not valid;

alter table "public"."crm_users" validate constraint "crm_users_email_domain_check";

alter table "public"."crm_users" add constraint "crm_users_email_domain_chk" CHECK ((lower(email) ~~ '%@aqmaritime.com'::text)) not valid;

alter table "public"."crm_users" validate constraint "crm_users_email_domain_chk";

alter table "public"."crm_users" add constraint "crm_users_email_key" UNIQUE using index "crm_users_email_key";

alter table "public"."crm_users" add constraint "crm_users_role_check" CHECK ((role = ANY (ARRAY['Admin'::text, 'CEO'::text, 'ShipBroker'::text, 'Desk Manager'::text, 'Operations'::text, 'Accounts Executive'::text]))) not valid;

alter table "public"."crm_users" validate constraint "crm_users_role_check";

alter table "public"."enquiries" add constraint "enquiries_assessed_by_fkey" FOREIGN KEY (assessed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."enquiries" validate constraint "enquiries_assessed_by_fkey";

alter table "public"."enquiries" add constraint "enquiries_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.crm_users(id) not valid;

alter table "public"."enquiries" validate constraint "enquiries_assigned_to_fkey";

alter table "public"."enquiries" add constraint "enquiries_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES public.contact_assignments(id) not valid;

alter table "public"."enquiries" validate constraint "enquiries_assignment_id_fkey";

alter table "public"."enquiries" add constraint "enquiries_closed_status_check" CHECK ((closed_status = ANY (ARRAY['WON'::text, 'LOST'::text, 'CANCELLED'::text, 'EXPIRED'::text, 'NO_OFFER'::text, 'COMPLETED'::text]))) not valid;

alter table "public"."enquiries" validate constraint "enquiries_closed_status_check";

alter table "public"."enquiries" add constraint "enquiries_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."enquiries" validate constraint "enquiries_company_id_fkey";

alter table "public"."enquiries" add constraint "enquiries_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE not valid;

alter table "public"."enquiries" validate constraint "enquiries_contact_id_fkey";

alter table "public"."enquiries" add constraint "enquiries_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.crm_users(id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."enquiries" validate constraint "enquiries_created_by_fkey";

alter table "public"."enquiries" add constraint "enquiries_enquiry_number_key" UNIQUE using index "enquiries_enquiry_number_key";

alter table "public"."enquiries" add constraint "enquiries_fixture_style_check" CHECK ((fixture_style = ANY (ARRAY['SPOT'::text, 'TC'::text]))) not valid;

alter table "public"."enquiries" validate constraint "enquiries_fixture_style_check";

alter table "public"."enquiries" add constraint "enquiries_lifecycle_state_check" CHECK ((lifecycle_state = ANY (ARRAY['DRAFT'::text, 'ISSUED'::text, 'CLOSED'::text]))) not valid;

alter table "public"."enquiries" validate constraint "enquiries_lifecycle_state_check";

alter table "public"."enquiries" add constraint "enquiries_pricing_style_check" CHECK ((pricing_style = ANY (ARRAY['WS'::text, 'LS'::text, 'BOTH'::text]))) not valid;

alter table "public"."enquiries" validate constraint "enquiries_pricing_style_check";

alter table "public"."enquiries" add constraint "enquiries_priority_check" CHECK ((priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'URGENT'::text]))) not valid;

alter table "public"."enquiries" validate constraint "enquiries_priority_check";

alter table "public"."enquiries" add constraint "enquiries_source_contact_id_fkey" FOREIGN KEY (source_contact_id) REFERENCES public.contacts(id) not valid;

alter table "public"."enquiries" validate constraint "enquiries_source_contact_id_fkey";

alter table "public"."enquiries" add constraint "enquiries_status_check" CHECK ((status = ANY (ARRAY['RECEIVED'::text, 'SCREENING'::text, 'IN_MARKET'::text, 'OFFER_OUT'::text, 'COUNTERING'::text, 'SUBJECTS'::text, 'FIXED'::text, 'FAILED'::text, 'CANCELLED'::text, 'WITHDRAWN'::text]))) not valid;

alter table "public"."enquiries" validate constraint "enquiries_status_check";

alter table "public"."enquiries" add constraint "enquiries_win_prob_check" CHECK (((win_probability IS NULL) OR ((win_probability >= 0) AND (win_probability <= 100)))) not valid;

alter table "public"."enquiries" validate constraint "enquiries_win_prob_check";

alter table "public"."enquiry_activities" add constraint "enquiry_activities_activity_type_check" CHECK ((activity_type = ANY (ARRAY['CREATED'::text, 'STATUS_CHANGED'::text, 'ASSIGNED'::text, 'QUOTE_SENT'::text, 'QUOTE_ACCEPTED'::text, 'QUOTE_REJECTED'::text, 'NOTE_ADDED'::text, 'EMAIL_SENT'::text, 'CALL_MADE'::text, 'MEETING_HELD'::text, 'DOCUMENT_UPLOADED'::text, 'WON'::text, 'LOST'::text, 'CANCELLED'::text]))) not valid;

alter table "public"."enquiry_activities" validate constraint "enquiry_activities_activity_type_check";

alter table "public"."enquiry_activities" add constraint "enquiry_activities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.crm_users(id) not valid;

alter table "public"."enquiry_activities" validate constraint "enquiry_activities_created_by_fkey";

alter table "public"."enquiry_activities" add constraint "enquiry_activities_enquiry_id_fkey" FOREIGN KEY (enquiry_id) REFERENCES public.enquiries(id) ON DELETE CASCADE not valid;

alter table "public"."enquiry_activities" validate constraint "enquiry_activities_enquiry_id_fkey";

alter table "public"."enquiry_feed" add constraint "enquiry_feed_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.crm_users(id) not valid;

alter table "public"."enquiry_feed" validate constraint "enquiry_feed_created_by_fkey";

alter table "public"."enquiry_feed" add constraint "enquiry_feed_enquiry_id_fkey" FOREIGN KEY (enquiry_id) REFERENCES public.enquiries(id) ON DELETE CASCADE not valid;

alter table "public"."enquiry_feed" validate constraint "enquiry_feed_enquiry_id_fkey";

alter table "public"."enquiry_feed" add constraint "enquiry_feed_enquiry_mode_check" CHECK ((enquiry_mode = ANY (ARRAY['CARGO_OPEN'::text, 'VESSEL_OPEN'::text, 'GENERAL'::text]))) not valid;

alter table "public"."enquiry_feed" validate constraint "enquiry_feed_enquiry_mode_check";

alter table "public"."enquiry_participants" add constraint "enquiry_participants_added_by_crm_user_id_fkey" FOREIGN KEY (added_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."enquiry_participants" validate constraint "enquiry_participants_added_by_crm_user_id_fkey";

alter table "public"."enquiry_participants" add constraint "enquiry_participants_crm_user_id_fkey" FOREIGN KEY (crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."enquiry_participants" validate constraint "enquiry_participants_crm_user_id_fkey";

alter table "public"."enquiry_participants" add constraint "enquiry_participants_enquiry_id_crm_user_id_key" UNIQUE using index "enquiry_participants_enquiry_id_crm_user_id_key";

alter table "public"."enquiry_participants" add constraint "enquiry_participants_enquiry_id_fkey" FOREIGN KEY (enquiry_id) REFERENCES public.enquiries(id) ON DELETE CASCADE not valid;

alter table "public"."enquiry_participants" validate constraint "enquiry_participants_enquiry_id_fkey";

alter table "public"."enquiry_participants" add constraint "enquiry_participants_role_check" CHECK ((role = ANY (ARRAY['INITIATOR'::text, 'OWNER'::text, 'PARTICIPANT'::text]))) not valid;

alter table "public"."enquiry_participants" validate constraint "enquiry_participants_role_check";

alter table "public"."enquiry_quotes" add constraint "enquiry_quotes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.crm_users(id) not valid;

alter table "public"."enquiry_quotes" validate constraint "enquiry_quotes_created_by_fkey";

alter table "public"."enquiry_quotes" add constraint "enquiry_quotes_enquiry_id_fkey" FOREIGN KEY (enquiry_id) REFERENCES public.enquiries(id) ON DELETE CASCADE not valid;

alter table "public"."enquiry_quotes" validate constraint "enquiry_quotes_enquiry_id_fkey";

alter table "public"."enquiry_quotes" add constraint "enquiry_quotes_offer_type_check" CHECK ((offer_type = ANY (ARRAY['FREIGHT_WS'::text, 'FREIGHT_LS'::text, 'TC_RATE'::text, 'OTHER'::text]))) not valid;

alter table "public"."enquiry_quotes" validate constraint "enquiry_quotes_offer_type_check";

alter table "public"."enquiry_quotes" add constraint "enquiry_quotes_quote_number_key" UNIQUE using index "enquiry_quotes_quote_number_key";

alter table "public"."enquiry_quotes" add constraint "enquiry_quotes_sent_by_crm_user_id_fkey" FOREIGN KEY (sent_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."enquiry_quotes" validate constraint "enquiry_quotes_sent_by_crm_user_id_fkey";

alter table "public"."enquiry_quotes" add constraint "enquiry_quotes_sent_to_contact_id_fkey" FOREIGN KEY (sent_to_contact_id) REFERENCES public.contacts(id) not valid;

alter table "public"."enquiry_quotes" validate constraint "enquiry_quotes_sent_to_contact_id_fkey";

alter table "public"."enquiry_quotes" add constraint "enquiry_quotes_sent_via_check" CHECK ((sent_via = ANY (ARRAY['EMAIL'::text, 'WHATSAPP'::text, 'PHONE'::text, 'OTHER'::text]))) not valid;

alter table "public"."enquiry_quotes" validate constraint "enquiry_quotes_sent_via_check";

alter table "public"."enquiry_quotes" add constraint "enquiry_quotes_status_check" CHECK ((status = ANY (ARRAY['DRAFT'::text, 'SENT'::text, 'VIEWED'::text, 'ACCEPTED'::text, 'REJECTED'::text, 'REVISED'::text, 'EXPIRED'::text]))) not valid;

alter table "public"."enquiry_quotes" validate constraint "enquiry_quotes_status_check";

alter table "public"."enquiry_recipients" add constraint "enquiry_recipients_channel_check" CHECK ((channel = ANY (ARRAY['WHATSAPP'::text, 'EMAIL'::text, 'CALL'::text, 'OTHER'::text]))) not valid;

alter table "public"."enquiry_recipients" validate constraint "enquiry_recipients_channel_check";

alter table "public"."enquiry_recipients" add constraint "enquiry_recipients_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE RESTRICT not valid;

alter table "public"."enquiry_recipients" validate constraint "enquiry_recipients_contact_id_fkey";

alter table "public"."enquiry_recipients" add constraint "enquiry_recipients_enquiry_id_contact_id_key" UNIQUE using index "enquiry_recipients_enquiry_id_contact_id_key";

alter table "public"."enquiry_recipients" add constraint "enquiry_recipients_enquiry_id_fkey" FOREIGN KEY (enquiry_id) REFERENCES public.enquiries(id) ON DELETE CASCADE not valid;

alter table "public"."enquiry_recipients" validate constraint "enquiry_recipients_enquiry_id_fkey";

alter table "public"."enquiry_recipients" add constraint "enquiry_recipients_sent_by_fkey" FOREIGN KEY (sent_by) REFERENCES public.profiles(id) not valid;

alter table "public"."enquiry_recipients" validate constraint "enquiry_recipients_sent_by_fkey";

alter table "public"."enquiry_responses" add constraint "enquiry_responses_assessed_by_fkey" FOREIGN KEY (assessed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."enquiry_responses" validate constraint "enquiry_responses_assessed_by_fkey";

alter table "public"."enquiry_responses" add constraint "enquiry_responses_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE RESTRICT not valid;

alter table "public"."enquiry_responses" validate constraint "enquiry_responses_contact_id_fkey";

alter table "public"."enquiry_responses" add constraint "enquiry_responses_enquiry_id_fkey" FOREIGN KEY (enquiry_id) REFERENCES public.enquiries(id) ON DELETE CASCADE not valid;

alter table "public"."enquiry_responses" validate constraint "enquiry_responses_enquiry_id_fkey";

alter table "public"."enquiry_responses" add constraint "enquiry_responses_logged_by_fkey" FOREIGN KEY (logged_by) REFERENCES public.profiles(id) not valid;

alter table "public"."enquiry_responses" validate constraint "enquiry_responses_logged_by_fkey";

alter table "public"."enquiry_responses" add constraint "enquiry_responses_response_type_check" CHECK ((response_type = ANY (ARRAY['OFFER'::text, 'DECLINE'::text, 'INFO_ONLY'::text, 'NO_RESPONSE'::text, 'UPDATE'::text]))) not valid;

alter table "public"."enquiry_responses" validate constraint "enquiry_responses_response_type_check";

alter table "public"."enquiry_responses" add constraint "enquiry_responses_vessel_id_fkey" FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) not valid;

alter table "public"."enquiry_responses" validate constraint "enquiry_responses_vessel_id_fkey";

alter table "public"."enquiry_shortlist" add constraint "enquiry_shortlist_candidate_enquiry_id_fkey" FOREIGN KEY (candidate_enquiry_id) REFERENCES public.enquiries(id) ON DELETE CASCADE not valid;

alter table "public"."enquiry_shortlist" validate constraint "enquiry_shortlist_candidate_enquiry_id_fkey";

alter table "public"."enquiry_shortlist" add constraint "enquiry_shortlist_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.crm_users(id) not valid;

alter table "public"."enquiry_shortlist" validate constraint "enquiry_shortlist_created_by_fkey";

alter table "public"."enquiry_shortlist" add constraint "enquiry_shortlist_enquiry_id_candidate_enquiry_id_key" UNIQUE using index "enquiry_shortlist_enquiry_id_candidate_enquiry_id_key";

alter table "public"."enquiry_shortlist" add constraint "enquiry_shortlist_enquiry_id_fkey" FOREIGN KEY (enquiry_id) REFERENCES public.enquiries(id) ON DELETE CASCADE not valid;

alter table "public"."enquiry_shortlist" validate constraint "enquiry_shortlist_enquiry_id_fkey";

alter table "public"."enquiry_shortlist" add constraint "enquiry_shortlist_fit_score_check" CHECK (((fit_score >= 0) AND (fit_score <= 100))) not valid;

alter table "public"."enquiry_shortlist" validate constraint "enquiry_shortlist_fit_score_check";

alter table "public"."fixture_parties" add constraint "fixture_parties_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."fixture_parties" validate constraint "fixture_parties_company_id_fkey";

alter table "public"."fixture_parties" add constraint "fixture_parties_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE RESTRICT not valid;

alter table "public"."fixture_parties" validate constraint "fixture_parties_contact_id_fkey";

alter table "public"."fixture_parties" add constraint "fixture_parties_fixture_id_fkey" FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE not valid;

alter table "public"."fixture_parties" validate constraint "fixture_parties_fixture_id_fkey";

alter table "public"."fixture_parties" add constraint "fixture_parties_linked_by_fkey" FOREIGN KEY (linked_by) REFERENCES public.profiles(id) not valid;

alter table "public"."fixture_parties" validate constraint "fixture_parties_linked_by_fkey";

alter table "public"."fixtures" add constraint "fixtures_charterer_company_id_fkey" FOREIGN KEY (charterer_company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."fixtures" validate constraint "fixtures_charterer_company_id_fkey";

alter table "public"."fixtures" add constraint "fixtures_co_broker_company_id_fkey" FOREIGN KEY (co_broker_company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."fixtures" validate constraint "fixtures_co_broker_company_id_fkey";

alter table "public"."fixtures" add constraint "fixtures_commission_paid_by_check" CHECK ((commission_paid_by = ANY (ARRAY['CHARTERER'::text, 'OWNER'::text, 'OTHER'::text]))) not valid;

alter table "public"."fixtures" validate constraint "fixtures_commission_paid_by_check";

alter table "public"."fixtures" add constraint "fixtures_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL not valid;

alter table "public"."fixtures" validate constraint "fixtures_lead_id_fkey";

alter table "public"."fixtures" add constraint "fixtures_lead_id_key" UNIQUE using index "fixtures_lead_id_key";

alter table "public"."fixtures" add constraint "fixtures_owner_company_id_fkey" FOREIGN KEY (owner_company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."fixtures" validate constraint "fixtures_owner_company_id_fkey";

alter table "public"."fixtures" add constraint "fixtures_primary_broker_id_fkey" FOREIGN KEY (primary_broker_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."fixtures" validate constraint "fixtures_primary_broker_id_fkey";

alter table "public"."fixtures" add constraint "fixtures_status_check" CHECK ((status = ANY (ARRAY['ON_SUBS'::text, 'FIXED'::text, 'CANCELLED'::text, 'SUBS_FAILED'::text]))) not valid;

alter table "public"."fixtures" validate constraint "fixtures_status_check";

alter table "public"."fixtures" add constraint "fixtures_vessel_id_fkey" FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE SET NULL not valid;

alter table "public"."fixtures" validate constraint "fixtures_vessel_id_fkey";

alter table "public"."follow_ups__legacy" add constraint "follow_ups_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."follow_ups__legacy" validate constraint "follow_ups_assigned_to_fkey";

alter table "public"."follow_ups__legacy" add constraint "follow_ups_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE not valid;

alter table "public"."follow_ups__legacy" validate constraint "follow_ups_contact_id_fkey";

alter table "public"."follow_ups__legacy" add constraint "follow_ups_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."follow_ups__legacy" validate constraint "follow_ups_created_by_fkey";

alter table "public"."follow_ups__legacy" add constraint "follow_ups_priority_check" CHECK ((priority = ANY (ARRAY['LOW'::text, 'MED'::text, 'HIGH'::text]))) not valid;

alter table "public"."follow_ups__legacy" validate constraint "follow_ups_priority_check";

alter table "public"."follow_ups__legacy" add constraint "follow_ups_status_check" CHECK ((status = ANY (ARRAY['OPEN'::text, 'DONE'::text, 'SKIPPED'::text]))) not valid;

alter table "public"."follow_ups__legacy" validate constraint "follow_ups_status_check";

alter table "public"."followup_notifications_log" add constraint "followup_notifications_log_channel_check" CHECK ((channel = ANY (ARRAY['EMAIL'::text, 'IN_APP'::text]))) not valid;

alter table "public"."followup_notifications_log" validate constraint "followup_notifications_log_channel_check";

alter table "public"."followup_notifications_log" add constraint "followup_notifications_log_followup_id_fkey" FOREIGN KEY (followup_id) REFERENCES public.contact_followups(id) ON DELETE RESTRICT not valid;

alter table "public"."followup_notifications_log" validate constraint "followup_notifications_log_followup_id_fkey";

alter table "public"."followup_notifications_log" add constraint "followup_notifications_log_notification_type_check" CHECK ((notification_type = ANY (ARRAY['OVERDUE'::text, 'DUE_TODAY'::text]))) not valid;

alter table "public"."followup_notifications_log" validate constraint "followup_notifications_log_notification_type_check";

alter table "public"."followup_notifications_log" add constraint "followup_notifications_log_notified_to_fkey" FOREIGN KEY (notified_to) REFERENCES public.profiles(id) not valid;

alter table "public"."followup_notifications_log" validate constraint "followup_notifications_log_notified_to_fkey";

alter table "public"."import_batches" add constraint "import_batches_batch_id_key" UNIQUE using index "import_batches_batch_id_key";

alter table "public"."import_batches" add constraint "import_batches_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.crm_users(id) not valid;

alter table "public"."import_batches" validate constraint "import_batches_created_by_fkey";

alter table "public"."import_batches" add constraint "import_batches_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'VALIDATING'::text, 'VALIDATED'::text, 'IMPORTING'::text, 'COMPLETED'::text, 'FAILED'::text]))) not valid;

alter table "public"."import_batches" validate constraint "import_batches_status_check";

alter table "public"."interactions__legacy" add constraint "interactions_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES public.contact_assignments(id) ON DELETE SET NULL not valid;

alter table "public"."interactions__legacy" validate constraint "interactions_assignment_id_fkey";

alter table "public"."interactions__legacy" add constraint "interactions_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE not valid;

alter table "public"."interactions__legacy" validate constraint "interactions_contact_id_fkey";

alter table "public"."interactions__legacy" add constraint "interactions_created_by_fk" FOREIGN KEY (created_by) REFERENCES public.crm_users(id) not valid;

alter table "public"."interactions__legacy" validate constraint "interactions_created_by_fk";

alter table "public"."interactions__legacy" add constraint "interactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.crm_users(id) not valid;

alter table "public"."interactions__legacy" validate constraint "interactions_created_by_fkey";

alter table "public"."interactions__legacy" add constraint "interactions_duration_positive" CHECK (((duration_minutes IS NULL) OR (duration_minutes >= 0))) not valid;

alter table "public"."interactions__legacy" validate constraint "interactions_duration_positive";

alter table "public"."interactions__legacy" add constraint "interactions_outcome_check" CHECK ((outcome = ANY (ARRAY['NO_RESPONSE'::text, 'INTERESTED'::text, 'NOT_INTERESTED'::text, 'FOLLOW_UP'::text, 'MEETING_SCHEDULED'::text, 'DEAL_PROGRESS'::text, 'CLOSED_WON'::text, 'CLOSED_LOST'::text]))) not valid;

alter table "public"."interactions__legacy" validate constraint "interactions_outcome_check";

alter table "public"."interactions__legacy" add constraint "interactions_type_check" CHECK ((interaction_type = ANY (ARRAY['CALL'::text, 'EMAIL'::text, 'MEETING'::text, 'WHATSAPP'::text, 'NOTE'::text]))) not valid;

alter table "public"."interactions__legacy" validate constraint "interactions_type_check";

alter table "public"."invoice_payments" add constraint "invoice_payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE not valid;

alter table "public"."invoice_payments" validate constraint "invoice_payments_invoice_id_fkey";

alter table "public"."invoices" add constraint "invoices_fixture_id_fkey" FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE not valid;

alter table "public"."invoices" validate constraint "invoices_fixture_id_fkey";

alter table "public"."invoices" add constraint "invoices_invoice_type_check" CHECK ((invoice_type = ANY (ARRAY['FREIGHT_COMM'::text, 'DEMM_COMM'::text, 'RECOVERY'::text]))) not valid;

alter table "public"."invoices" validate constraint "invoices_invoice_type_check";

alter table "public"."invoices" add constraint "invoices_payment_status_check" CHECK ((payment_status = ANY (ARRAY['UNPAID'::text, 'PARTIAL'::text, 'PAID'::text]))) not valid;

alter table "public"."invoices" validate constraint "invoices_payment_status_check";

alter table "public"."leads" add constraint "leads_entered_by_fkey" FOREIGN KEY (entered_by) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."leads" validate constraint "leads_entered_by_fkey";

alter table "public"."leads" add constraint "leads_lead_type_check" CHECK ((lead_type = ANY (ARRAY['CARGO'::text, 'OPEN_VESSEL'::text]))) not valid;

alter table "public"."leads" validate constraint "leads_lead_type_check";

alter table "public"."leads" add constraint "leads_primary_broker_id_fkey" FOREIGN KEY (primary_broker_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."leads" validate constraint "leads_primary_broker_id_fkey";

alter table "public"."leads" add constraint "leads_priority_check" CHECK ((priority = ANY (ARRAY['HOT'::text, 'WARM'::text, 'COLD'::text]))) not valid;

alter table "public"."leads" validate constraint "leads_priority_check";

alter table "public"."leads" add constraint "leads_source_company_id_fkey" FOREIGN KEY (source_company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."leads" validate constraint "leads_source_company_id_fkey";

alter table "public"."leads" add constraint "leads_source_contact_id_fkey" FOREIGN KEY (source_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL not valid;

alter table "public"."leads" validate constraint "leads_source_contact_id_fkey";

alter table "public"."leads" add constraint "leads_status_check" CHECK ((status = ANY (ARRAY['OPEN'::text, 'OPTIONS_SHOWN'::text, 'UNDER_NEGOTIATION'::text, 'TERMS_AGREED'::text, 'ON_SUBS'::text, 'FIXED'::text, 'CLOSED_LOST'::text, 'CLOSED_NOT_WORKABLE'::text, 'CLOSED_BY_OTHERS'::text]))) not valid;

alter table "public"."leads" validate constraint "leads_status_check";

alter table "public"."leads" add constraint "leads_vessel_id_fkey" FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE SET NULL not valid;

alter table "public"."leads" validate constraint "leads_vessel_id_fkey";

alter table "public"."negotiation_log" add constraint "negotiation_log_by_side_check" CHECK ((by_side = ANY (ARRAY['OWNER'::text, 'CHARTERER'::text, 'BROKER'::text]))) not valid;

alter table "public"."negotiation_log" validate constraint "negotiation_log_by_side_check";

alter table "public"."negotiation_log" add constraint "negotiation_log_option_id_fkey" FOREIGN KEY (option_id) REFERENCES public.options_shown(id) ON DELETE CASCADE not valid;

alter table "public"."negotiation_log" validate constraint "negotiation_log_option_id_fkey";

alter table "public"."negotiation_log" add constraint "negotiation_log_status_check" CHECK ((status = ANY (ARRAY['OPEN'::text, 'RESOLVED'::text]))) not valid;

alter table "public"."negotiation_log" validate constraint "negotiation_log_status_check";

alter table "public"."negotiation_log" add constraint "negotiation_log_subject_check" CHECK ((subject = ANY (ARRAY['FREIGHT'::text, 'LAYCAN'::text, 'DEMMURRAGE'::text, 'LAYTIME'::text, 'TT'::text, 'COMMISSION'::text, 'OTHER'::text]))) not valid;

alter table "public"."negotiation_log" validate constraint "negotiation_log_subject_check";

alter table "public"."notification_delivery_log" add constraint "notification_delivery_log_delivery_queue_id_fkey" FOREIGN KEY (delivery_queue_id) REFERENCES public.notification_delivery_queue(id) ON DELETE RESTRICT not valid;

alter table "public"."notification_delivery_log" validate constraint "notification_delivery_log_delivery_queue_id_fkey";

alter table "public"."notification_delivery_queue" add constraint "chk_attempts_nonnegative" CHECK (((attempts >= 0) AND (max_attempts >= 1) AND (attempts <= 100))) not valid;

alter table "public"."notification_delivery_queue" validate constraint "chk_attempts_nonnegative";

alter table "public"."notification_delivery_queue" add constraint "chk_recipient_not_blank" CHECK ((length(TRIM(BOTH FROM recipient)) >= 8)) not valid;

alter table "public"."notification_delivery_queue" validate constraint "chk_recipient_not_blank";

alter table "public"."notification_delivery_queue" add constraint "notification_delivery_queue_notification_log_id_fkey" FOREIGN KEY (notification_log_id) REFERENCES public.followup_notifications_log(id) ON DELETE RESTRICT not valid;

alter table "public"."notification_delivery_queue" validate constraint "notification_delivery_queue_notification_log_id_fkey";

alter table "public"."ops" add constraint "ops_fixture_id_fkey" FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE not valid;

alter table "public"."ops" validate constraint "ops_fixture_id_fkey";

alter table "public"."ops" add constraint "ops_ops_owner_fkey" FOREIGN KEY (ops_owner) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."ops" validate constraint "ops_ops_owner_fkey";

alter table "public"."ops" add constraint "ops_recovery_status_check" CHECK ((recovery_status = ANY (ARRAY['OPEN'::text, 'PART_PAID'::text, 'CLOSED'::text]))) not valid;

alter table "public"."ops" validate constraint "ops_recovery_status_check";

alter table "public"."ops" add constraint "ops_stage_check" CHECK ((stage = ANY (ARRAY['NOMINATION'::text, 'SOF'::text, 'NOR'::text, 'LOADING'::text, 'SAILING'::text, 'DISCHARGE'::text, 'COMPLETED'::text, 'CLAIM'::text]))) not valid;

alter table "public"."ops" validate constraint "ops_stage_check";

alter table "public"."options_shown" add constraint "options_shown_charterer_company_id_fkey" FOREIGN KEY (charterer_company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."options_shown" validate constraint "options_shown_charterer_company_id_fkey";

alter table "public"."options_shown" add constraint "options_shown_charterer_contact_id_fkey" FOREIGN KEY (charterer_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL not valid;

alter table "public"."options_shown" validate constraint "options_shown_charterer_contact_id_fkey";

alter table "public"."options_shown" add constraint "options_shown_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE not valid;

alter table "public"."options_shown" validate constraint "options_shown_lead_id_fkey";

alter table "public"."options_shown" add constraint "options_shown_option_type_check" CHECK ((option_type = ANY (ARRAY['VESSEL_OPTION'::text, 'CARGO_OPTION'::text]))) not valid;

alter table "public"."options_shown" validate constraint "options_shown_option_type_check";

alter table "public"."options_shown" add constraint "options_shown_outcome_check" CHECK ((outcome = ANY (ARRAY['PENDING'::text, 'REJECTED'::text, 'SHORTLISTED'::text, 'COUNTERED'::text, 'ACCEPTED'::text]))) not valid;

alter table "public"."options_shown" validate constraint "options_shown_outcome_check";

alter table "public"."options_shown" add constraint "options_shown_owner_company_id_fkey" FOREIGN KEY (owner_company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."options_shown" validate constraint "options_shown_owner_company_id_fkey";

alter table "public"."options_shown" add constraint "options_shown_owner_contact_id_fkey" FOREIGN KEY (owner_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL not valid;

alter table "public"."options_shown" validate constraint "options_shown_owner_contact_id_fkey";

alter table "public"."options_shown" add constraint "options_shown_shown_by_fkey" FOREIGN KEY (shown_by) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."options_shown" validate constraint "options_shown_shown_by_fkey";

alter table "public"."options_shown" add constraint "options_shown_vessel_id_fkey" FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE SET NULL not valid;

alter table "public"."options_shown" validate constraint "options_shown_vessel_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['BROKER'::text, 'OPS'::text, 'ACCOUNTS'::text, 'ADMIN'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."recovery_log" add constraint "recovery_log_by_side_check" CHECK (((by_side IS NULL) OR (by_side = ANY (ARRAY['BROKER'::text, 'ACCOUNTS'::text, 'CHARTERER'::text, 'OWNER'::text])))) not valid;

alter table "public"."recovery_log" validate constraint "recovery_log_by_side_check";

alter table "public"."recovery_log" add constraint "recovery_log_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE not valid;

alter table "public"."recovery_log" validate constraint "recovery_log_invoice_id_fkey";

alter table "public"."recovery_log" add constraint "recovery_log_status_check" CHECK ((status = ANY (ARRAY['OPEN'::text, 'RESOLVED'::text]))) not valid;

alter table "public"."recovery_log" validate constraint "recovery_log_status_check";

alter table "public"."sanctions_sources" add constraint "sanctions_sources_code_key" UNIQUE using index "sanctions_sources_code_key";

alter table "public"."task_comments" add constraint "task_comments_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE not valid;

alter table "public"."task_comments" validate constraint "task_comments_task_id_fkey";

alter table "public"."task_comments" add constraint "task_comments_user_fk" FOREIGN KEY (crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."task_comments" validate constraint "task_comments_user_fk";

alter table "public"."task_recipients" add constraint "task_recipients_assigned_by_fk" FOREIGN KEY (assigned_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."task_recipients" validate constraint "task_recipients_assigned_by_fk";

alter table "public"."task_recipients" add constraint "task_recipients_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE not valid;

alter table "public"."task_recipients" validate constraint "task_recipients_task_id_fkey";

alter table "public"."task_recipients" add constraint "task_recipients_user_fk" FOREIGN KEY (crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."task_recipients" validate constraint "task_recipients_user_fk";

alter table "public"."task_user_state" add constraint "task_user_state_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE not valid;

alter table "public"."task_user_state" validate constraint "task_user_state_task_id_fkey";

alter table "public"."task_user_state" add constraint "task_user_state_user_fk" FOREIGN KEY (crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."task_user_state" validate constraint "task_user_state_user_fk";

alter table "public"."tasks" add constraint "tasks_assigned_to_fk" FOREIGN KEY (assigned_to_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."tasks" validate constraint "tasks_assigned_to_fk";

alter table "public"."tasks" add constraint "tasks_created_by_fk" FOREIGN KEY (created_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."tasks" validate constraint "tasks_created_by_fk";

alter table "public"."vessel_sanctions" add constraint "uq_vessel_source" UNIQUE using index "uq_vessel_source";

alter table "public"."vessel_sanctions" add constraint "vessel_sanctions_checked_by_user_id_fkey" FOREIGN KEY (checked_by_user_id) REFERENCES public.crm_users(id) ON DELETE SET NULL not valid;

alter table "public"."vessel_sanctions" validate constraint "vessel_sanctions_checked_by_user_id_fkey";

alter table "public"."vessel_sanctions" add constraint "vessel_sanctions_source_id_fkey" FOREIGN KEY (source_id) REFERENCES public.sanctions_sources(id) ON DELETE RESTRICT not valid;

alter table "public"."vessel_sanctions" validate constraint "vessel_sanctions_source_id_fkey";

alter table "public"."vessel_sanctions" add constraint "vessel_sanctions_vessel_id_fkey" FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE CASCADE not valid;

alter table "public"."vessel_sanctions" validate constraint "vessel_sanctions_vessel_id_fkey";

alter table "public"."vessel_sanctions_history" add constraint "vessel_sanctions_history_changed_by_user_id_fkey" FOREIGN KEY (changed_by_user_id) REFERENCES public.crm_users(id) ON DELETE SET NULL not valid;

alter table "public"."vessel_sanctions_history" validate constraint "vessel_sanctions_history_changed_by_user_id_fkey";

alter table "public"."vessel_sanctions_history" add constraint "vessel_sanctions_history_source_id_fkey" FOREIGN KEY (source_id) REFERENCES public.sanctions_sources(id) ON DELETE RESTRICT not valid;

alter table "public"."vessel_sanctions_history" validate constraint "vessel_sanctions_history_source_id_fkey";

alter table "public"."vessel_sanctions_history" add constraint "vessel_sanctions_history_vessel_id_fkey" FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE CASCADE not valid;

alter table "public"."vessel_sanctions_history" validate constraint "vessel_sanctions_history_vessel_id_fkey";

alter table "public"."vessels" add constraint "vessels_operator_company_id_fkey" FOREIGN KEY (operator_company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."vessels" validate constraint "vessels_operator_company_id_fkey";

alter table "public"."vessels" add constraint "vessels_owner_company_id_fkey" FOREIGN KEY (owner_company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."vessels" validate constraint "vessels_owner_company_id_fkey";

alter table "public"."vessels" add constraint "vessels_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'SOLD'::text, 'NOT_TRADING'::text]))) not valid;

alter table "public"."vessels" validate constraint "vessels_status_check";

alter table "public"."workability_reasons" add constraint "workability_reasons_applies_to_check" CHECK ((applies_to = ANY (ARRAY['ENQUIRY'::text, 'RESPONSE'::text]))) not valid;

alter table "public"."workability_reasons" validate constraint "workability_reasons_applies_to_check";

alter table "public"."workspace_messages" add constraint "workspace_messages_created_by_crm_user_id_fkey" FOREIGN KEY (created_by_crm_user_id) REFERENCES public.crm_users(id) not valid;

alter table "public"."workspace_messages" validate constraint "workspace_messages_created_by_crm_user_id_fkey";

alter table "public"."workspace_messages" add constraint "workspace_messages_message_text_check" CHECK ((length(TRIM(BOTH FROM message_text)) > 0)) not valid;

alter table "public"."workspace_messages" validate constraint "workspace_messages_message_text_check";

alter table "public"."workspace_messages" add constraint "workspace_messages_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL not valid;

alter table "public"."workspace_messages" validate constraint "workspace_messages_task_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public._table_exists(p_table regclass)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select p_table is not null;
$function$
;

CREATE OR REPLACE FUNCTION public._tmp_trigger_compile_test()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.active IS TRUE AND NEW.active IS FALSE THEN
    -- no-op
    NULL;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.acknowledge_nudge(p_followup_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_user_id UUID;
  v_followup_record RECORD;
  v_notification_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := current_crm_user_id();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated as CRM user';
  END IF;
  
  -- Get the followup record
  SELECT * INTO v_followup_record
  FROM contact_followups
  WHERE id = p_followup_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Followup not found';
  END IF;
  
  -- Verify the current user is the one assigned
  IF v_followup_record.assigned_to_crm_user_id != v_current_user_id THEN
    RAISE EXCEPTION 'You are not assigned to this followup';
  END IF;
  
  -- Update followup status to ACKNOWLEDGED
  UPDATE contact_followups
  SET 
    status = 'ACKNOWLEDGED',
    acknowledged_at = now(),
    acknowledged_by_crm_user_id = v_current_user_id,
    updated_at = now()
  WHERE id = p_followup_id;
  
  -- Mark the notification as read
  UPDATE app_notifications
  SET 
    is_read = true,
    read_at = now()
  WHERE followup_id = p_followup_id
    AND user_id = (
      SELECT auth_user_id FROM crm_users WHERE id = v_current_user_id
    );
  
  -- Create notification for PRIMARY owner
  INSERT INTO app_notifications (
    user_id,
    notif_type,
    title,
    body,
    link_path,
    followup_id,
    is_read,
    meta
  )
  SELECT
    cu_primary.auth_user_id,
    'FOLLOWUP_ACKNOWLEDGED',
    'Follow-up Acknowledged',
    cu_secondary.full_name || ' acknowledged the follow-up for ' || c.full_name,
    '/contacts/' || v_followup_record.contact_id,
    p_followup_id,
    false,
    jsonb_build_object(
      'contact_id', v_followup_record.contact_id,
      'followup_id', p_followup_id,
      'acknowledged_by', v_current_user_id,
      'acknowledged_at', now()
    )
  FROM contacts c
  CROSS JOIN crm_users cu_primary
  CROSS JOIN crm_users cu_secondary
  WHERE c.id = v_followup_record.contact_id
    AND cu_primary.id = v_followup_record.created_by
    AND cu_secondary.id = v_current_user_id
  RETURNING id INTO v_notification_id;
  
  RAISE NOTICE '✅ Nudge acknowledged';
  
  RETURN TRUE;
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
    assigned_to,
    created_at,
    assigned_to_user_id,
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


CREATE OR REPLACE FUNCTION public.add_contact_safe(p_full_name text, p_company_name text, p_designation text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_country_code text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_phone_type text DEFAULT NULL::text, p_ice_handle text DEFAULT NULL::text, p_preferred_channel text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_contact_id uuid;

  v_company_type public.companies.company_type%type;

  v_phone_clean text;
  v_phone_type_template public.contact_phones.phone_type%type;
  v_phone_type_final public.contact_phones.phone_type%type;
begin
  -- Hard requirement
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'full_name is required';
  end if;

  -- Get valid company_type template
  select c.company_type
    into v_company_type
  from public.companies c
  where c.company_type is not null
  limit 1;

  if v_company_type is null then
    raise exception 'No companies.company_type template found';
  end if;

  -- Fallback company name
  if nullif(btrim(coalesce(p_company_name,'')), '') is null then
    p_company_name := 'UNKNOWN / UNASSIGNED';
  end if;

  -- Upsert company with required company_type
  insert into public.companies (company_name, company_type)
  values (btrim(p_company_name), v_company_type)
  on conflict (company_name) do update
    set company_name = excluded.company_name
  returning id into v_company_id;

  -- Insert contact (email sanitized by trigger)
  insert into public.contacts
    (full_name, designation, email, company_id, country_code, ice_handle, preferred_channel, notes, is_active)
  values
    (nullif(btrim(p_full_name), ''),
     nullif(btrim(p_designation), ''),
     nullif(btrim(p_email), ''),
     v_company_id,
     nullif(btrim(p_country_code), ''),
     nullif(btrim(p_ice_handle), ''),
     nullif(btrim(p_preferred_channel), ''),
     nullif(btrim(p_notes), ''),
     true
    )
  returning id into v_contact_id;

  -- PHONE: never block contact creation
  v_phone_clean := nullif(regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g'), '');

  if v_phone_clean is not null then
    -- template phone_type from existing valid data
    select cp.phone_type
      into v_phone_type_template
    from public.contact_phones cp
    where cp.phone_type is not null
    limit 1;

    -- If user gave a phone_type, only accept it if it matches an allowed value already in DB.
    if nullif(btrim(coalesce(p_phone_type,'')), '') is not null then
      select cp.phone_type
        into v_phone_type_final
      from public.contact_phones cp
      where cp.phone_type::text = btrim(p_phone_type)
      limit 1;
    end if;

    -- fallback to template
    v_phone_type_final := coalesce(v_phone_type_final, v_phone_type_template);

    -- insert only if we have a valid phone_type
    if v_phone_type_final is not null then
      insert into public.contact_phones (contact_id, phone_number, phone_type, is_primary, notes)
      values (v_contact_id, v_phone_clean, v_phone_type_final, true, null)
      on conflict do nothing;
    end if;
  end if;

  return v_contact_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.add_contact_safe_ui(full_name text, company_name text, designation text DEFAULT NULL::text, email text DEFAULT NULL::text, country_code text DEFAULT NULL::text, phone text DEFAULT NULL::text, phone_type text DEFAULT NULL::text, ice_handle text DEFAULT NULL::text, preferred_channel text DEFAULT NULL::text, notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.add_contact_safe(
    p_full_name := full_name,
    p_company_name := company_name,
    p_designation := designation,
    p_email := email,
    p_country_code := country_code,
    p_phone := phone,
    p_phone_type := phone_type,
    p_ice_handle := ice_handle,
    p_preferred_channel := preferred_channel,
    p_notes := notes
  );
$function$
;

CREATE OR REPLACE FUNCTION public.add_enquiry_participant(p_enquiry_id uuid, p_user_id uuid, p_role text DEFAULT 'PARTICIPANT'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- If no user context, do nothing (SQL editor / service context)
  if p_user_id is null then
    return;
  end if;

  insert into public.enquiry_participants (enquiry_id, crm_user_id, role, added_by_crm_user_id)
  values (p_enquiry_id, p_user_id, p_role, p_user_id)
  on conflict (enquiry_id, crm_user_id)
  do update set role = excluded.role;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.add_task_recipients(p_task_id uuid, p_recipient_crm_user_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_creator uuid;
begin
  -- only creator or admin can add recipients
  select created_by_crm_user_id into v_creator
  from public.tasks
  where id = p_task_id;

  if v_creator is null then
    raise exception 'Task not found';
  end if;

  if not public.is_admin() and v_creator <> public.current_crm_user_id() then
    raise exception 'Not allowed';
  end if;

  insert into public.task_recipients(task_id, crm_user_id, assigned_by_crm_user_id)
  select p_task_id, x, public.current_crm_user_id()
  from unnest(p_recipient_crm_user_ids) as x
  on conflict do nothing;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_activity_feed(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS TABLE(activity_at timestamp with time zone, actor_crm_user_id uuid, actor_name text, actor_email text, contact_id uuid, contact_name text, company_name text, activity_type text, detail_1 text, detail_2 text, detail_3 text, to_stage text, assignment_role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  with guard as (
    select
      case
        when current_user = 'postgres' then true
        else public.is_admin()
      end as ok
  ),
  interactions as (
    select
      i.created_at as activity_at,
      i.created_by as actor_crm_user_id,
      cu.full_name as actor_name,
      cu.email as actor_email,
      i.contact_id,
      c.full_name as contact_name,
      co.company_name as company_name,
      'INTERACTION'::text as activity_type,
      i.interaction_type as detail_1,
      i.outcome as detail_2,
      i.subject as detail_3,
      null::text as to_stage,
      null::text as assignment_role
    from public.interactions i
    join public.contacts c on c.id = i.contact_id
    left join public.companies co on co.id = c.company_id
    left join public.crm_users cu on cu.id = i.created_by
    where i.created_at >= p_from and i.created_at < p_to
  ),
  stage_events as (
    select
      e.occurred_at as activity_at,
      e.actor_crm_user_id as actor_crm_user_id,
      cu.full_name as actor_name,
      cu.email as actor_email,
      e.contact_id,
      c.full_name as contact_name,
      co.company_name as company_name,
      'STAGE_CHANGE'::text as activity_type,
      e.from_stage as detail_1,
      e.to_stage as detail_2,
      null::text as detail_3,
      e.to_stage as to_stage,
      null::text as assignment_role
    from public.contact_stage_events e
    join public.contacts c on c.id = e.contact_id
    left join public.companies co on co.id = c.company_id
    left join public.crm_users cu on cu.id = e.actor_crm_user_id
    where e.occurred_at >= p_from and e.occurred_at < p_to
  )
  select *
  from (
    select * from interactions
    union all
    select * from stage_events
  ) x
  where (select ok from guard) = true
  order by activity_at desc;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_archive_contact(p_contact_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  update public.contacts
  set deleted_at = now(),
      deleted_by_crm_user_id = public.current_crm_user_id(),
      is_active = false,
      updated_at = now()
  where id = p_contact_id;

  update public.contact_assignments
  set status = 'CLOSED',
      notes = coalesce(notes || E'\n', '') || 'Closed due to contact archive on ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
  where contact_id = p_contact_id
    and status = 'ACTIVE';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_assign_contacts(p_target_crm_user_id uuid, p_contact_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'admin_assign_contacts: admin privileges required';
  end if;

  if p_target_crm_user_id is null then
    raise exception 'admin_assign_contacts: target user cannot be null';
  end if;

  insert into public.contact_assignments
    (contact_id, status, stage, assignment_role, assigned_to_crm_user_id, assigned_at)
  select
    cid,
    'ACTIVE',
    'COLD_CALLING',
    'PRIMARY',
    p_target_crm_user_id,
    now()
  from unnest(p_contact_ids) as cid
  where cid is not null
    and not exists (
      select 1
      from public.contact_assignments ca
      where ca.contact_id = cid
        and ca.status = 'ACTIVE'
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_assign_unassigned(target_crm_user_id uuid, limit_int integer DEFAULT 100)
 RETURNS TABLE(assigned_count integer, assigned_contact_ids uuid[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_limit int := greatest(coalesce(limit_int, 0), 0);
begin
  -- Hard gate: admin only
  if not public.is_admin() then
    raise exception 'admin_assign_unassigned: admin privileges required';
  end if;

  if target_crm_user_id is null then
    raise exception 'admin_assign_unassigned: target_crm_user_id cannot be null';
  end if;

  if v_limit = 0 then
    assigned_count := 0;
    assigned_contact_ids := array[]::uuid[];
    return;
  end if;

  -- Validate target user exists + active
  if not exists (
    select 1
    from public.crm_users cu
    where cu.id = target_crm_user_id
      and cu.active = true
  ) then
    raise exception 'admin_assign_unassigned: target user not found or inactive';
  end if;

  with eligible as (
    select c.id as contact_id
    from public.contacts c
    where not exists (
      select 1
      from public.contact_assignments ca
      where ca.contact_id = c.id
        and ca.status = 'ACTIVE'
    )
    order by c.created_at desc
    limit v_limit
    for update skip locked
  ),
  ins as (
    insert into public.contact_assignments
      (contact_id, status, stage, assignment_role, assigned_to_crm_user_id, assigned_at)
    select
      e.contact_id,
      'ACTIVE',
      'COLD_CALLING',
      'PRIMARY',
      target_crm_user_id,
      now()
    from eligible e
    returning contact_id
  )
  select
    count(*)::int,
    coalesce(array_agg(contact_id), array[]::uuid[])
  into assigned_count, assigned_contact_ids
  from ins;

  return;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_company_contacts_list(p_company_id uuid)
 RETURNS TABLE(contact_id uuid, full_name text, email text, is_active boolean, deleted_at timestamp with time zone, created_at timestamp with time zone, primary_owner_id uuid, secondary_owner_id uuid, primary_stage text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  with primary_assignment as (
    select distinct on (ca.contact_id)
      ca.contact_id,
      ca.assigned_to_crm_user_id as primary_owner_id,
      ca.stage as primary_stage,
      ca.assigned_at
    from public.contact_assignments ca
    where ca.status = 'ACTIVE'
      and upper(ca.assignment_role) = 'PRIMARY'
    order by ca.contact_id, ca.assigned_at desc
  ),
  secondary_assignment as (
    select distinct on (ca.contact_id)
      ca.contact_id,
      ca.assigned_to_crm_user_id as secondary_owner_id,
      ca.assigned_at
    from public.contact_assignments ca
    where ca.status = 'ACTIVE'
      and upper(ca.assignment_role) = 'SECONDARY'
    order by ca.contact_id, ca.assigned_at desc
  )
  select
    c.id as contact_id,
    c.full_name,
    c.email,
    c.is_active,
    c.deleted_at,
    c.created_at,
    p.primary_owner_id,
    s.secondary_owner_id,
    p.primary_stage
  from public.contacts c
  left join primary_assignment p on p.contact_id = c.id
  left join secondary_assignment s on s.contact_id = c.id
  where c.company_id = p_company_id
  order by c.deleted_at nulls first, c.is_active desc, c.created_at desc;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_company_delete_preview(p_company_id uuid)
 RETURNS TABLE(contacts_total bigint, contacts_active bigint, contacts_inactive bigint, contacts_archived bigint, assignments_active bigint, phones bigint, interactions bigint, followups_open bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  with c as (
    select id, is_active, deleted_at
    from public.contacts
    where company_id = p_company_id
  )
  select
    (select count(*) from c),
    (select count(*) from c where deleted_at is null and is_active is distinct from false),
    (select count(*) from c where deleted_at is null and is_active = false),
    (select count(*) from c where deleted_at is not null),
    (select count(*) from public.contact_assignments a join c on c.id=a.contact_id where a.status='ACTIVE'),
    (select count(*) from public.contact_phones p join c on c.id=p.contact_id),
    (select count(*) from public.interactions i join c on c.id=i.contact_id),
    (select count(*) from public.contact_followups f join c on c.id=f.contact_id where f.status='OPEN');
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_company_detach_contacts(p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
declare
  contact_ids uuid[];
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  -- capture company contact ids before detaching
  select array_agg(id)
  into contact_ids
  from public.contacts
  where company_id = p_company_id;

  -- detach contacts from company
  update public.contacts
  set company_id = null,
      updated_at = now()
  where company_id = p_company_id;

  -- move to Unassigned by closing all ACTIVE assignments for those contacts
  if contact_ids is not null then
    update public.contact_assignments
    set status = 'CLOSED',
        notes = coalesce(notes || E'\n', '') || 'Closed due to company deletion (detach) on ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
    where contact_id = any(contact_ids)
      and status = 'ACTIVE';
  end if;

  -- delete company
  delete from public.companies where id = p_company_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_company_purge_contacts(p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  -- delete child rows first (adjust if you have more child tables)
  delete from public.contact_followups f
  using public.contacts c
  where f.contact_id = c.id and c.company_id = p_company_id;

  delete from public.contact_stage_requests r
  using public.contacts c
  where r.contact_id = c.id and c.company_id = p_company_id;

  delete from public.contact_stage_events e
  using public.contacts c
  where e.contact_id = c.id and c.company_id = p_company_id;

  delete from public.interactions i
  using public.contacts c
  where i.contact_id = c.id and c.company_id = p_company_id;

  -- legacy interactions table (if present)
  delete from public.contact_interactions li
  using public.contacts c
  where li.contact_id = c.id and c.company_id = p_company_id;

  delete from public.contact_phones p
  using public.contacts c
  where p.contact_id = c.id and c.company_id = p_company_id;

  delete from public.contact_assignments a
  using public.contacts c
  where a.contact_id = c.id and c.company_id = p_company_id;

  -- delete contacts, then company
  delete from public.contacts where company_id = p_company_id;
  delete from public.companies where id = p_company_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.approve_stage_request(p_request_id uuid, p_decision text, p_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin_id uuid := public.current_crm_user_id();
  v_req record;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_decision not in ('APPROVED','REJECTED') then
    raise exception 'INVALID_DECISION';
  end if;

  select *
  into v_req
  from public.contact_stage_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_req.status <> 'PENDING' then
    raise exception 'REQUEST_ALREADY_DECIDED';
  end if;

  update public.contact_stage_requests
  set status = p_decision,
      decided_by_crm_user_id = v_admin_id,
      decided_at = now(),
      decision_notes = p_notes
  where id = p_request_id;

  if p_decision = 'APPROVED' then
    update public.contacts
    set stage = v_req.requested_stage
    where id = v_req.contact_id;

    insert into public.contact_stage_events (contact_id, stage, created_at)
    values (v_req.contact_id, v_req.requested_stage, now());
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_contact_owner(p_contact_id uuid, p_assigned_to uuid, p_assignment_role text, p_assigned_by uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_has_primary BOOLEAN;
  v_role TEXT;
BEGIN
  -- Normalize to uppercase
  v_role := UPPER(p_assignment_role);
  
  -- Validate assignment_role
  IF v_role NOT IN ('PRIMARY', 'SECONDARY') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_ROLE',
      'message', 'Assignment role must be PRIMARY or SECONDARY'
    );
  END IF;

  -- For SECONDARY, ensure PRIMARY exists
  IF v_role = 'SECONDARY' THEN
    SELECT EXISTS(
      SELECT 1 FROM contact_assignments
      WHERE contact_id = p_contact_id
        AND UPPER(assignment_role) = 'PRIMARY'
        AND status = 'ACTIVE'
    ) INTO v_has_primary;

    IF NOT v_has_primary THEN
      RETURN json_build_object(
        'success', false,
        'error', 'PRIMARY_REQUIRED',
        'message', '💙 This contact needs a Primary owner first! Primary owners manage the pipeline and stages.'
      );
    END IF;
  END IF;

  -- Mark existing assignments of this type as INACTIVE
  UPDATE contact_assignments
  SET status = 'INACTIVE',
      ended_at = NOW(),
      ended_by_crm_user_id = p_assigned_by
  WHERE contact_id = p_contact_id
    AND UPPER(assignment_role) = v_role
    AND status = 'ACTIVE';

  -- Create new assignment (store as lowercase to match your existing data)
  INSERT INTO contact_assignments (
    contact_id,
    assigned_to,
    assigned_by,
    assignment_role,
    status,
    assigned_at,
    assigned_to_crm_user_id,
    assigned_by_crm_user_id,
    created_by_crm_user_id
  ) VALUES (
    p_contact_id,
    p_assigned_to,
    p_assigned_by,
    LOWER(v_role),  -- Store as lowercase
    'ACTIVE',
    NOW(),
    p_assigned_to,
    p_assigned_by,
    p_assigned_by
  );

  -- If PRIMARY, also update contacts.assigned_to_user_id
  IF v_role = 'PRIMARY' THEN
    UPDATE contacts
    SET assigned_to_user_id = p_assigned_to,
        updated_at = NOW()
    WHERE id = p_contact_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Contact assigned successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_contact_owner(p_contact_id uuid, p_role text, p_assigned_to_crm_user_id uuid, p_actor_crm_user_id uuid)
 RETURNS TABLE(ok boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text := lower(trim(coalesce(p_role,'')));
BEGIN
  IF v_role NOT IN ('primary','secondary') THEN
    RETURN QUERY SELECT false, 'Invalid role. Use primary/secondary.'::text;
    RETURN;
  END IF;

  -- End current ACTIVE assignment for this contact+role (use CLOSED, which is allowed)
  UPDATE public.contact_assignments
     SET status = 'CLOSED',
         ended_at = now(),
         ended_by_crm_user_id = p_actor_crm_user_id,
         updated_by_crm_user_id = p_actor_crm_user_id
   WHERE contact_id = p_contact_id
     AND lower(trim(assignment_role)) = v_role
     AND status = 'ACTIVE'
     AND ended_at IS NULL;

  -- If clearing assignment, stop here
  IF p_assigned_to_crm_user_id IS NULL THEN
    RETURN QUERY SELECT true, 'Assignment cleared'::text;
    RETURN;
  END IF;

  -- Idempotent: if same user already active, do nothing
  IF EXISTS (
    SELECT 1
    FROM public.contact_assignments
    WHERE contact_id = p_contact_id
      AND lower(trim(assignment_role)) = v_role
      AND status = 'ACTIVE'
      AND ended_at IS NULL
      AND assigned_to_crm_user_id = p_assigned_to_crm_user_id
  ) THEN
    RETURN QUERY SELECT true, 'No change'::text;
    RETURN;
  END IF;

  -- Insert new ACTIVE assignment (status must be ACTIVE)
  INSERT INTO public.contact_assignments (
    contact_id,
    assigned_to_crm_user_id,
    assigned_by_crm_user_id,
    assignment_role,
    status,
    stage,
    assigned_at,
    updated_by_crm_user_id,
    created_by_crm_user_id
  )
  VALUES (
    p_contact_id,
    p_assigned_to_crm_user_id,
    p_actor_crm_user_id,
    v_role,                 -- will satisfy role check via lower(trim)
    'ACTIVE',               -- satisfies status_check
    'ASPIRATION',           -- must satisfy stage_check; keep default stage
    now(),
    p_actor_crm_user_id,
    p_actor_crm_user_id
  );

  RETURN QUERY SELECT true, 'Assignment updated'::text;
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
  v_existing_id uuid;
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

  SELECT ca.id
    INTO v_existing_id
  FROM public.contact_assignments ca
  WHERE ca.contact_id = p_contact_id
    AND ca.assignment_role = 'Primary'
    AND ca.status = 'Active'
  ORDER BY ca.assigned_at DESC NULLS LAST
  LIMIT 1;

  -- If the current active owner is the same, only stamp stage/audit
  IF v_existing_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.contact_assignments ca
    WHERE ca.id = v_existing_id
      AND ca.assigned_to_crm_user_id = p_assignee_id
  ) THEN
    UPDATE public.contact_assignments
       SET stage = COALESCE(p_stage, stage),
           updated_by_crm_user_id = v_admin_crm_user_id
     WHERE id = v_existing_id;

    RETURN;
  END IF;

  -- End previous active primary assignment (no delete)
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.contact_assignments
       SET status = 'Ended',
           ended_at = now(),
           ended_by_crm_user_id = v_admin_crm_user_id,
           updated_by_crm_user_id = v_admin_crm_user_id
     WHERE id = v_existing_id;
  END IF;

  -- Insert new active primary assignment
  INSERT INTO public.contact_assignments (
    contact_id,
    assigned_to_crm_user_id,
    assignment_role,
    stage,
    status,
    assigned_at,
    assigned_by_crm_user_id,
    updated_by_crm_user_id
  )
  VALUES (
    p_contact_id,
    p_assignee_id,
    'Primary',
    COALESCE(p_stage, 'Cold Calling'),
    'Active',
    now(),
    v_admin_crm_user_id,
    v_admin_crm_user_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_secondary_contact_owner(p_assignee_crm_user_id uuid, p_contact_id uuid, p_stage text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment_id uuid;
BEGIN
  -- Deactivate existing ACTIVE SECONDARY for same assignee+contact (optional hygiene)
  UPDATE public.contact_assignments
  SET status = 'INACTIVE',
      updated_at = now()
  WHERE contact_id = p_contact_id
    AND assigned_to_crm_user_id = p_assignee_crm_user_id
    AND assignment_role = 'SECONDARY'
    AND status = 'ACTIVE';

  INSERT INTO public.contact_assignments (
    contact_id,
    assigned_to_crm_user_id,
    assignment_role,
    stage,
    status,
    assigned_at,
    created_at,
    updated_at
  )
  VALUES (
    p_contact_id,
    p_assignee_crm_user_id,
    'SECONDARY',
    p_stage,
    'ACTIVE',
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_assignment_id;

  RETURN v_assignment_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.block_legacy_followups_write()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'LEGACY MODULE DISABLED: write to public.follow_ups is blocked. Use public.contact_interactions.next_follow_up_at (V2).';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.block_legacy_interactions_write()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'LEGACY MODULE DISABLED: write to public.interactions is blocked. Use public.contact_interactions (V2).';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.bulk_upload_contacts(p_contacts jsonb, p_uploaded_by uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_contact JSONB;
  v_company_id UUID;
  v_contact_id UUID;
  v_duplicate_id UUID;
  v_success_count INTEGER := 0;
  v_duplicate_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_results JSONB := '[]'::JSONB;
  v_row_result JSONB;
  v_current_user_id UUID;
BEGIN
  -- Get current authenticated user's CRM user ID
  SELECT id INTO v_current_user_id
  FROM crm_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- If no CRM user found, use p_uploaded_by
  IF v_current_user_id IS NULL THEN
    v_current_user_id := p_uploaded_by;
  END IF;

  FOR v_contact IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    BEGIN
      -- Check for duplicate
      SELECT c.id INTO v_duplicate_id
      FROM contacts c
      JOIN companies comp ON c.company_id = comp.id
      WHERE LOWER(c.full_name) = LOWER(v_contact->>'full_name')
        AND LOWER(comp.company_name) = LOWER(v_contact->>'company_name')
        AND c.is_archived = false
      LIMIT 1;

      IF v_duplicate_id IS NOT NULL THEN
        v_duplicate_count := v_duplicate_count + 1;
        v_row_result := jsonb_build_object(
          'status', 'duplicate',
          'name', v_contact->>'full_name',
          'company', v_contact->>'company_name',
          'duplicate_id', v_duplicate_id
        );
      ELSE
        -- Find or create company
        SELECT id INTO v_company_id
        FROM companies
        WHERE LOWER(company_name) = LOWER(v_contact->>'company_name')
        LIMIT 1;

        IF v_company_id IS NULL THEN
          INSERT INTO companies (company_name, company_type, created_at, updated_at)
          VALUES (v_contact->>'company_name', 'Broker', NOW(), NOW())
          RETURNING id INTO v_company_id;
        END IF;

        -- Insert contact with correct user ID
        INSERT INTO contacts (
          company_id,
          full_name,
          designation,
          phone,
          email,
          stage,
          created_by_crm_user_id,
          created_at,
          updated_at,
          is_archived
        ) VALUES (
          v_company_id,
          v_contact->>'full_name',
          v_contact->>'designation',
          v_contact->>'phone',
          v_contact->>'email',
          COALESCE(v_contact->>'stage', 'COLD_CALLING'),
          v_current_user_id,  -- Use current CRM user
          NOW(),
          NOW(),
          false
        ) RETURNING id INTO v_contact_id;

        v_success_count := v_success_count + 1;
        v_row_result := jsonb_build_object(
          'status', 'success',
          'name', v_contact->>'full_name',
          'contact_id', v_contact_id
        );
      END IF;

      v_results := v_results || v_row_result;

    EXCEPTION
      WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        v_row_result := jsonb_build_object(
          'status', 'error',
          'name', v_contact->>'full_name',
          'error', SQLERRM
        );
        v_results := v_results || v_row_result;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total', jsonb_array_length(p_contacts),
    'imported', v_success_count,
    'duplicates', v_duplicate_count,
    'errors', v_error_count,
    'results', v_results
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_next_followup_date(p_current_due_date timestamp with time zone, p_frequency text, p_interval integer DEFAULT 1)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN CASE p_frequency
    WHEN 'DAILY' THEN p_current_due_date + (p_interval || ' days')::interval
    WHEN 'WEEKLY' THEN p_current_due_date + (p_interval || ' weeks')::interval
    WHEN 'BIWEEKLY' THEN p_current_due_date + (p_interval * 2 || ' weeks')::interval
    WHEN 'MONTHLY' THEN p_current_due_date + (p_interval || ' months')::interval
    WHEN 'QUARTERLY' THEN p_current_due_date + (p_interval * 3 || ' months')::interval
    WHEN 'YEARLY' THEN p_current_due_date + (p_interval || ' years')::interval
    ELSE p_current_due_date + interval '7 days' -- Default to weekly
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_access_contact(p_contact_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  select
    public.is_admin()
    or exists (
      select 1
      from public.contact_assignments ca
      where ca.contact_id = p_contact_id
        and ca.status = 'ACTIVE'
        and ca.assigned_to_crm_user_id = public.current_crm_user_id()
    )
    or exists (
      select 1
      from public.contacts c
      where c.id = p_contact_id
        and c.created_by_crm_user_id = public.current_crm_user_id()
    );
$function$
;

CREATE OR REPLACE FUNCTION public.can_access_contact_pii(p_contact_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  select
    public.is_admin()
    or exists (
      select 1
      from public.contact_assignments ca
      where ca.contact_id = p_contact_id
        and ca.status = 'ACTIVE'
        and ca.assigned_to_crm_user_id = public.current_crm_user_id()
    );
$function$
;

CREATE OR REPLACE FUNCTION public.can_add_contact_interaction(p_contact_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  select exists (
    select 1
    from public.contact_assignments ca
    where ca.contact_id = p_contact_id
      and ca.assigned_to = auth.uid()
      and ca.status = 'ACTIVE'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.can_change_stage(p_assignment_id uuid, p_new_stage text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment RECORD;
BEGIN
  -- Get assignment
  SELECT * INTO v_assignment
  FROM contact_assignments
  WHERE id = p_assignment_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Admin can do anything
  IF is_admin() THEN
    RETURN TRUE;
  END IF;
  
  -- Only PRIMARY owner can change stages
  IF v_assignment.assigned_to_crm_user_id != current_crm_user_id() THEN
    RETURN FALSE;
  END IF;
  
  IF v_assignment.assignment_role != 'PRIMARY' THEN
    RETURN FALSE;
  END IF;
  
  -- User CANNOT directly set INACTIVE
  IF p_new_stage = 'INACTIVE' THEN
    RETURN FALSE;
  END IF;
  
  -- User can change between active stages
  IF p_new_stage IN ('COLD_CALLING', 'ASPIRATION', 'ACHIEVEMENT') THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_contact_interactions(p_contact_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  select exists (
    select 1
    from public.contact_assignments ca
    where ca.contact_id = p_contact_id
      and ca.assigned_to = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.change_contact_stage(p_contact_id uuid, p_to_stage text, p_note text DEFAULT NULL::text)
 RETURNS TABLE(action text, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := public.current_crm_user_id();
  v_from_stage text;
  v_allowed boolean;
begin
  if v_actor is null then
    raise exception 'NOT_LINKED';
  end if;

  -- Allow if Admin/CEO OR assigned (PRIMARY or SECONDARY) with ACTIVE assignment
  select (
    public.has_any_role(array['Admin','CEO'])
    or exists (
      select 1
      from public.contact_assignments ca
      where ca.contact_id = p_contact_id
        and ca.status = 'ACTIVE'
        and ca.assigned_to_crm_user_id = v_actor
    )
  ) into v_allowed;

  if not v_allowed then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select c.stage into v_from_stage
  from public.contacts c
  where c.id = p_contact_id;

  if v_from_stage is null then
    raise exception 'CONTACT_NOT_FOUND';
  end if;

  -- INACTIVE requires admin approval: create request only
  if p_to_stage = 'INACTIVE' then
    insert into public.contact_stage_requests (
      contact_id,
      requested_stage,
      requested_by_crm_user_id,
      request_note
    ) values (
      p_contact_id,
      p_to_stage,
      v_actor,
      p_note
    );

    return query select 'REQUESTED'::text, 'Inactive request sent for admin approval'::text;
    return;
  end if;

  -- Apply stage update
  update public.contacts
  set stage = p_to_stage
  where id = p_contact_id;

  -- Audit
  insert into public.contact_stage_events (
    contact_id,
    actor_crm_user_id,
    from_stage,
    to_stage,
    occurred_at,
    note
  ) values (
    p_contact_id,
    v_actor,
    v_from_stage,
    p_to_stage,
    now(),
    p_note
  );

  return query select 'UPDATED'::text, 'Stage updated'::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_contact_duplicate(p_full_name text, p_phone text, p_email text)
 RETURNS TABLE(contact_id uuid, match_type text, match_score numeric, contact_info jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  clean_phone text;
  clean_email text;
begin
  clean_phone := public.normalize_phone(p_phone);
  clean_email := lower(trim(coalesce(p_email, '')));

  if clean_email != '' then
    return query
    select c.id, 'EMAIL_EXACT'::text, 1.0::numeric,
           jsonb_build_object('full_name', c.full_name, 'email', c.email, 'phone', c.phone, 'company_id', c.company_id)
    from public.contacts c
    where lower(trim(c.email)) = clean_email
    limit 1;

    if found then return; end if;
  end if;

  if length(clean_phone) >= 8 then
    return query
    select c.id, 'PHONE_EXACT'::text, 1.0::numeric,
           jsonb_build_object('full_name', c.full_name, 'email', c.email, 'phone', c.phone, 'company_id', c.company_id)
    from public.contacts c
    where public.normalize_phone(c.phone) = clean_phone
    limit 1;

    if found then return; end if;
  end if;

  if p_full_name is not null and length(p_full_name) > 3 then
    return query
    select c.id, 'NAME_SIMILAR'::text,
           similarity(lower(c.full_name), lower(p_full_name))::numeric,
           jsonb_build_object('full_name', c.full_name, 'email', c.email, 'phone', c.phone, 'company_id', c.company_id)
    from public.contacts c
    where similarity(lower(c.full_name), lower(p_full_name)) > 0.7
    order by similarity(lower(c.full_name), lower(p_full_name)) desc
    limit 1;
  end if;

  return;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.clean_email(p_email text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
select nullif(
  lower(trim(
    regexp_replace(
      replace(
        replace(
          replace(
            replace(
              replace(coalesce(p_email,''), chr(65279), ''),  -- BOM
            chr(160), ' '),                                   -- NBSP
          chr(8203), ''),                                     -- zero-width space
        chr(8239), ' '),                                      -- narrow NBSP
      '�', ''                                                 -- replacement char
      ),
      '[^a-z0-9._%+\-@]+',
      '',
      'g'
    )
  )),
  ''
);
$function$
;

CREATE OR REPLACE FUNCTION public.close_assignments_when_contact_inactive()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if (old.is_active is distinct from new.is_active)
     and new.is_active = false then

    update public.contact_assignments
    set status = 'CLOSED',
        ended_at = now()
    where contact_id = new.id
      and status = 'ACTIVE'
      and ended_at is null;

  end if;

  return new;
end;
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


CREATE OR REPLACE FUNCTION public.contacts_set_created_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.created_by_crm_user_id is null then
    new.created_by_crm_user_id := public.current_crm_user_id();
  end if;
  return new;
end;
$function$
;

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


CREATE OR REPLACE FUNCTION public.create_enquiry(p_contact_id uuid, p_enquiry_type text, p_subject text, p_description text DEFAULT NULL::text, p_estimated_value numeric DEFAULT NULL::numeric, p_priority text DEFAULT 'MEDIUM'::text, p_vessel_type text DEFAULT NULL::text, p_cargo_type text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_enquiry_id uuid;
  v_company_id uuid;
  v_assignment_id uuid;
begin
  -- company from contact
  select company_id into v_company_id
  from public.contacts
  where id = p_contact_id;

  -- best-effort assignment link (if any active assignment exists)
  select ca.id into v_assignment_id
  from public.contact_assignments ca
  where ca.contact_id = p_contact_id
    and ca.status = 'ACTIVE'
  order by ca.assigned_at desc
  limit 1;

  insert into public.enquiries (
    contact_id,
    source_contact_id,
    company_id,
    assignment_id,
    enquiry_type,
    subject,
    description,
    estimated_value,
    priority,
    vessel_type,
    cargo_type,
    status,
    assigned_to,
    assigned_at,
    created_by
  )
  values (
    p_contact_id,
    p_contact_id,
    v_company_id,
    v_assignment_id,
    p_enquiry_type,
    p_subject,
    p_description,
    p_estimated_value,
    p_priority,
    p_vessel_type,
    p_cargo_type,
    'RECEIVED',                      -- tanker status
    public.current_crm_user_id(),
    now(),
    public.current_crm_user_id()
  )
  returning id into v_enquiry_id;

  return v_enquiry_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_next_company_recurring_followup(p_completed_followup_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_followup RECORD;
  v_next_due_date TIMESTAMPTZ;
  v_next_followup_id UUID;
  v_root_parent_id UUID;
BEGIN
  SELECT * INTO v_followup
  FROM company_followups
  WHERE id = p_completed_followup_id;

  IF NOT v_followup.recurrence_enabled THEN
    RETURN NULL;
  END IF;

  v_next_due_date := calculate_next_followup_date(
    v_followup.due_at,
    v_followup.recurrence_frequency,
    COALESCE(v_followup.recurrence_interval, 1)
  );

  IF v_followup.recurrence_end_date IS NOT NULL 
     AND v_next_due_date::DATE > v_followup.recurrence_end_date THEN
    RETURN NULL;
  END IF;

  v_root_parent_id := COALESCE(v_followup.parent_followup_id, v_followup.id);

  INSERT INTO company_followups (
    company_id, company_assignment_id, followup_type, followup_reason, notes, due_at,
    status, recurrence_enabled, recurrence_frequency, recurrence_interval, recurrence_end_date,
    parent_followup_id, recurrence_count, created_by
  ) VALUES (
    v_followup.company_id, v_followup.company_assignment_id, v_followup.followup_type, 
    v_followup.followup_reason, v_followup.notes, v_next_due_date, 'OPEN',
    v_followup.recurrence_enabled, v_followup.recurrence_frequency, v_followup.recurrence_interval,
    v_followup.recurrence_end_date, v_root_parent_id, COALESCE(v_followup.recurrence_count, 0) + 1,
    v_followup.created_by
  )
  RETURNING id INTO v_next_followup_id;

  RETURN v_next_followup_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_next_recurring_followup(p_completed_followup_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_followup RECORD;
  v_next_due_date TIMESTAMPTZ;
  v_next_followup_id UUID;
  v_root_parent_id UUID;
BEGIN
  -- Get the completed followup details
  SELECT * INTO v_followup
  FROM contact_followups
  WHERE id = p_completed_followup_id;

  -- Exit if not recurring or already past end date
  IF NOT v_followup.recurrence_enabled THEN
    RETURN NULL;
  END IF;

  -- Calculate next due date
  v_next_due_date := calculate_next_followup_date(
    v_followup.due_at,
    v_followup.recurrence_frequency,
    COALESCE(v_followup.recurrence_interval, 1)
  );

  -- Check if past end date
  IF v_followup.recurrence_end_date IS NOT NULL 
     AND v_next_due_date::DATE > v_followup.recurrence_end_date THEN
    RETURN NULL;
  END IF;

  -- Find root parent (for chaining)
  v_root_parent_id := COALESCE(v_followup.parent_followup_id, v_followup.id);

  -- Create next followup
  INSERT INTO contact_followups (
    contact_id,
    assignment_id,
    followup_type,
    followup_reason,
    notes,
    due_at,
    status,
    recurrence_enabled,
    recurrence_frequency,
    recurrence_interval,
    recurrence_end_date,
    parent_followup_id,
    recurrence_count,
    created_by
  ) VALUES (
    v_followup.contact_id,
    v_followup.assignment_id,
    v_followup.followup_type,
    v_followup.followup_reason,
    v_followup.notes,
    v_next_due_date,
    'OPEN',
    v_followup.recurrence_enabled,
    v_followup.recurrence_frequency,
    v_followup.recurrence_interval,
    v_followup.recurrence_end_date,
    v_root_parent_id,
    COALESCE(v_followup.recurrence_count, 0) + 1,
    v_followup.created_by
  )
  RETURNING id INTO v_next_followup_id;

  -- Create notification for the new followup
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
      'Recurring Follow-up Created',
      'Next follow-up: ' || v_followup.followup_reason,
      '/contacts/' || v_followup.contact_id,
      v_next_followup_id,
      jsonb_build_object(
        'contact_id', v_followup.contact_id,
        'followup_id', v_next_followup_id,
        'recurrence_count', COALESCE(v_followup.recurrence_count, 0) + 1
      )
    FROM crm_users cu
    WHERE cu.id = v_followup.created_by;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore if notifications table doesn't exist
  END;

  RETURN v_next_followup_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_nudge(p_contact_id uuid, p_followup_type text, p_followup_reason text, p_notes text, p_due_at timestamp with time zone, p_assigned_to_crm_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment_id UUID;
  v_followup_id UUID;
  v_primary_user_id UUID;
  v_notification_id UUID;
BEGIN
  -- Get current user (should be PRIMARY owner)
  v_primary_user_id := current_crm_user_id();
  
  IF v_primary_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated as CRM user';
  END IF;
  
  -- Verify user is PRIMARY owner of this contact
  SELECT ca.id INTO v_assignment_id
  FROM contact_assignments ca
  WHERE ca.contact_id = p_contact_id
    AND ca.assigned_to_crm_user_id = v_primary_user_id
    AND ca.status = 'ACTIVE'
    AND ca.assignment_role = 'PRIMARY';
  
  IF v_assignment_id IS NULL THEN
    RAISE EXCEPTION 'You must be the PRIMARY owner to create nudges';
  END IF;
  
  -- Create the followup (nudge)
  INSERT INTO contact_followups (
    contact_id,
    assignment_id,
    followup_type,
    followup_reason,
    notes,
    due_at,
    status,
    created_by,
    assigned_to_crm_user_id
  ) VALUES (
    p_contact_id,
    v_assignment_id,
    p_followup_type,
    p_followup_reason,
    p_notes,
    p_due_at,
    'OPEN',
    v_primary_user_id,
    p_assigned_to_crm_user_id
  )
  RETURNING id INTO v_followup_id;
  
  -- Create notification for the assigned user
  INSERT INTO app_notifications (
    user_id,
    notif_type,
    title,
    body,
    link_path,
    followup_id,
    is_read,
    meta
  )
  SELECT
    cu_target.auth_user_id,
    'FOLLOWUP_NUDGE',
    'New Follow-up Assigned',
    'You have been assigned to follow up on ' || c.full_name || ' by ' || cu_primary.full_name,
    '/contacts/' || p_contact_id,
    v_followup_id,
    false,
    jsonb_build_object(
      'contact_id', p_contact_id,
      'followup_id', v_followup_id,
      'created_by', v_primary_user_id,
      'due_at', p_due_at
    )
  FROM contacts c
  CROSS JOIN crm_users cu_primary
  CROSS JOIN crm_users cu_target
  WHERE c.id = p_contact_id
    AND cu_primary.id = v_primary_user_id
    AND cu_target.id = p_assigned_to_crm_user_id
  RETURNING id INTO v_notification_id;
  
  RAISE NOTICE '✅ Nudge created: followup_id=%, notification_id=%', v_followup_id, v_notification_id;
  
  RETURN v_followup_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.crm_users_normalize_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.current_crm_role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select cu.role
  from public.crm_users cu
  where cu.auth_user_id = auth.uid()
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.current_crm_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select cu.id
  from public.crm_users cu
  where cu.auth_user_id = auth.uid()
    and coalesce(cu.active, true) = true
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.debug_auth_context()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_object(
    'auth_uid', auth.uid(),
    'crm_user_id', (select id from public.crm_users where auth_user_id = auth.uid()),
    'is_admin', public.is_admin()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.debug_dashboard_context()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_object(
    'auth_uid', auth.uid(),
    'crm_user_id', public.current_crm_user_id(),
    'is_admin', public.is_admin()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.decide_stage_request(p_request_id uuid, p_decision text, p_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := public.current_crm_user_id();
  v_req record;
  v_from_stage text;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_decision not in ('APPROVED','REJECTED') then
    raise exception 'INVALID_DECISION';
  end if;

  select *
  into v_req
  from public.contact_stage_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if v_req.status <> 'PENDING' then
    raise exception 'REQUEST_ALREADY_DECIDED';
  end if;

  select c.stage
  into v_from_stage
  from public.contacts c
  where c.id = v_req.contact_id;

  update public.contact_stage_requests
  set status = p_decision,
      decided_by_crm_user_id = v_actor,
      decided_at = now(),
      decision_notes = p_notes
  where id = p_request_id;

  if p_decision = 'APPROVED' then
    update public.contacts
    set stage = v_req.requested_stage
    where id = v_req.contact_id;

    insert into public.contact_stage_events (
      contact_id, actor_crm_user_id, from_stage, to_stage, occurred_at, note
    ) values (
      v_req.contact_id, v_actor, v_from_stage, v_req.requested_stage, now(), p_notes
    );

    -- Critical governance: INACTIVE => close all active assignments (unassign)
    if v_req.requested_stage = 'INACTIVE' then
      update public.contact_assignments
      set status = 'CLOSED'
      where contact_id = v_req.contact_id
        and status = 'ACTIVE';
    end if;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.derive_enquiry_mode(p_enquiry_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select case
    when e.cargo_type is not null
      or e.quantity is not null
      or e.loading_port is not null
      or e.discharge_port is not null
      or e.laycan_from is not null
      or e.laycan_to is not null
      then 'CARGO_OPEN'
    when e.vessel_name is not null
      or e.vessel_type is not null
      then 'VESSEL_OPEN'
    else 'GENERAL'
  end
  from public.enquiries e
  where e.id = p_enquiry_id
$function$
;

CREATE OR REPLACE FUNCTION public.directory_contacts_ro()
 RETURNS TABLE(contact_id uuid, full_name text, company_id uuid, company_name text, is_active boolean, primary_owner_id uuid, primary_stage text, secondary_owner_id uuid, is_unassigned boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with primary_assignment as (
    select distinct on (ca.contact_id)
      ca.contact_id,
      ca.assigned_to_crm_user_id as primary_owner_id,
      ca.stage as primary_stage
    from public.contact_assignments ca
    where ca.status = 'ACTIVE'
      and ca.ended_at is null
      and upper(trim(ca.assignment_role)) = 'PRIMARY'
    order by ca.contact_id, ca.assigned_at desc
  ),
  secondary_assignment as (
    select distinct on (ca.contact_id)
      ca.contact_id,
      ca.assigned_to_crm_user_id as secondary_owner_id
    from public.contact_assignments ca
    where ca.status = 'ACTIVE'
      and ca.ended_at is null
      and upper(trim(ca.assignment_role)) = 'SECONDARY'
    order by ca.contact_id, ca.assigned_at desc
  )
  select
    c.id as contact_id,
    c.full_name,
    c.company_id,
    co.company_name,
    c.is_active,
    p.primary_owner_id,
    p.primary_stage,
    s.secondary_owner_id,
    (p.primary_owner_id is null) as is_unassigned
  from public.contacts c
  left join public.companies co on co.id = c.company_id
  left join primary_assignment p on p.contact_id = c.id
  left join secondary_assignment s on s.contact_id = c.id
  where coalesce(c.is_deleted,false) = false;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_task_created_by_from_auth()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_crm_user_id uuid;
begin
  -- map auth.uid() -> crm_users.id
  select cu.id into v_crm_user_id
  from public.crm_users cu
  where cu.auth_user_id = auth.uid();

  if v_crm_user_id is null then
    raise exception 'No crm_users row found for auth user %', auth.uid();
  end if;

  -- Always enforce creator (prevents client from spoofing)
  new.created_by_crm_user_id := v_crm_user_id;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enquiries_guard_created_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v uuid;
begin
  if new.created_by is null then
    v := public.current_crm_user_id();
    if v is not null then
      new.created_by := v;
    end if;
  end if;

  return new;
end;
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
    e.contact_id,
    e.company_id,
    e.created_by,
    e.created_at,
    e.updated_at,
    cu.full_name AS created_by_name
   FROM (public.enquiries e
     LEFT JOIN public.crm_users cu ON ((cu.id = e.created_by)))
  WHERE (e.is_draft = false);


CREATE OR REPLACE FUNCTION public.find_contacts_needing_followup(p_days_threshold integer DEFAULT 7)
 RETURNS TABLE(contact_id uuid, full_name text, company_name text, last_interaction_at timestamp with time zone, days_since_last_touch numeric, total_interactions bigint, assigned_to_name text)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT 
    c.id as contact_id,
    c.full_name,
    co.company_name,
    MAX(i.interaction_at) as last_interaction_at,
    EXTRACT(DAY FROM (now() - MAX(i.interaction_at))) as days_since_last_touch,
    COUNT(i.id) as total_interactions,
    cu.full_name as assigned_to_name
  FROM contacts c
  LEFT JOIN companies co ON co.id = c.company_id
  LEFT JOIN interactions i ON i.contact_id = c.id
  LEFT JOIN contact_assignments ca ON ca.contact_id = c.id AND ca.status = 'ACTIVE'
  LEFT JOIN crm_users cu ON cu.id = ca.assigned_to_crm_user_id
  WHERE ca.assigned_to_crm_user_id = current_crm_user_id()
    OR is_admin()
  GROUP BY c.id, c.full_name, co.company_name, cu.full_name
  HAVING MAX(i.interaction_at) < now() - (p_days_threshold || ' days')::interval
    OR MAX(i.interaction_at) IS NULL
  ORDER BY days_since_last_touch DESC NULLS FIRST;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_crm_user_upsert_self(p_full_name text, p_email text, p_role text DEFAULT 'Broker'::text, p_region_focus text DEFAULT NULL::text, p_active boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_auth uuid := auth.uid();
  v_id uuid;
begin
  if v_auth is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.crm_users (auth_user_id, full_name, email, role, region_focus, active)
  values (v_auth, p_full_name, p_email, coalesce(p_role,'Broker'), p_region_focus, p_active)
  on conflict (auth_user_id)
  do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    region_focus = excluded.region_focus,
    active = excluded.active,
    updated_at = now();

  select id into v_id
  from public.crm_users
  where auth_user_id = v_auth;

  return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.fn_enqueue_whatsapp_delivery(p_notification_log_id uuid, p_recipient text, p_template_name text, p_template_language text, p_template_params jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_id uuid;
begin
  insert into public.notification_delivery_queue (
    notification_log_id,
    channel,
    recipient,
    template_name,
    template_language,
    template_params,
    status,
    attempts,
    next_attempt_at
  )
  values (
    p_notification_log_id,
    'WHATSAPP',
    p_recipient,
    p_template_name,
    coalesce(nullif(trim(p_template_language), ''), 'en'),
    coalesce(p_template_params, '{}'::jsonb),
    'PENDING',
    0,
    now()
  )
  returning id into v_id;

  return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.fn_promote_contact_to_achievement()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update public.contact_assignments
     set stage = 'ACHIEVEMENT',
         stage_changed_at = now(),
         stage_changed_by = coalesce(new.linked_by, stage_changed_by)
   where contact_id = new.contact_id
     and status = 'ACTIVE'
     and stage <> 'ACHIEVEMENT';
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_enquiry_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_year text;
  v_seq text;
begin
  v_year := to_char(now(), 'YYYY');
  v_seq := lpad(nextval('public.enquiry_number_seq')::text, 4, '0');
  return 'ENQ-' || v_year || '-' || v_seq;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_fixture_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_year text; v_seq text;
begin
  v_year := to_char(now(),'YYYY');
  v_seq := lpad(nextval('public.fixture_number_seq')::text,4,'0');
  return 'FX-'||v_year||'-'||v_seq;
end $function$
;

CREATE OR REPLACE FUNCTION public.generate_quote_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_year text;
  v_seq text;
begin
  v_year := to_char(now(), 'YYYY');
  v_seq := lpad(nextval('public.quote_number_seq')::text, 4, '0');
  return 'QTE-' || v_year || '-' || v_seq;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_assignment_summary()
 RETURNS TABLE(user_id uuid, user_name text, total_contacts bigint, primary_count bigint, secondary_count bigint, unassigned_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.full_name AS user_name,
    
    -- Total assigned to this user (primary + secondary)
    COUNT(DISTINCT ca.contact_id) AS total_contacts,
    
    -- Primary assignments
    COUNT(DISTINCT CASE 
      WHEN LOWER(ca.assignment_role) = 'primary' 
      THEN ca.contact_id 
    END) AS primary_count,
    
    -- Secondary assignments
    COUNT(DISTINCT CASE 
      WHEN LOWER(ca.assignment_role) = 'secondary' 
      THEN ca.contact_id 
    END) AS secondary_count,
    
    -- Unassigned: contacts created by user but no primary owner
    (
      SELECT COUNT(*)::BIGINT
      FROM contacts c
      WHERE c.created_by_crm_user_id = u.id
        AND c.is_archived = false
        AND NOT EXISTS (
          SELECT 1 
          FROM contact_assignments ca2
          WHERE ca2.contact_id = c.id
            AND LOWER(ca2.assignment_role) = 'primary'
            AND ca2.status = 'ACTIVE'
        )
    ) AS unassigned_count
    
  FROM crm_users u
  LEFT JOIN contact_assignments ca 
    ON u.id = ca.assigned_to 
    AND ca.status = 'ACTIVE'
  LEFT JOIN contacts c 
    ON ca.contact_id = c.id 
    AND c.is_archived = false
  WHERE u.active = true
  GROUP BY u.id, u.full_name
  ORDER BY u.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_contact_creator_stats()
 RETURNS TABLE(creator_crm_user_id uuid, creator_name text, creator_email text, contacts_added bigint, last_added_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    c.created_by_crm_user_id as creator_crm_user_id,
    u.full_name as creator_name,
    u.email as creator_email,
    count(*) as contacts_added,
    max(c.created_at) as last_added_at
  from public.contacts c
  join public.crm_users u
    on u.id = c.created_by_crm_user_id
  where c.created_by_crm_user_id is not null
  group by c.created_by_crm_user_id, u.full_name, u.email
  order by contacts_added desc, last_added_at desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_dashboard_followups(p_days integer DEFAULT 7)
 RETURNS TABLE(interaction_id uuid, contact_id uuid, contact_name text, next_follow_up_at timestamp with time zone, last_interaction_at timestamp with time zone, interaction_type text, notes text)
 LANGUAGE sql
 STABLE
AS $function$
  select
    i.id as interaction_id,
    i.contact_id,
    c.full_name as contact_name,
    i.next_follow_up_at,
    i.interaction_at as last_interaction_at,
    i.interaction_type,
    i.notes
  from public.contact_interactions i
  join public.contacts c on c.id = i.contact_id
  where
    i.next_follow_up_at is not null
    and i.next_follow_up_at <= now() + (p_days || ' days')::interval
    and (
      public.is_admin()
      or exists (
        select 1
        from public.contact_assignments ca
        where ca.contact_id = i.contact_id
          and ca.ended_at is null
          and ca.status = 'ACTIVE'
          and ca.assignment_role = 'PRIMARY'
          and ca.assigned_to_crm_user_id = public.current_crm_user_id()
      )
    )
  order by i.next_follow_up_at asc;
$function$
;

CREATE OR REPLACE FUNCTION public.get_dashboard_recent_interactions(p_limit integer DEFAULT 10)
 RETURNS TABLE(interaction_id uuid, contact_id uuid, contact_name text, interaction_type text, notes text, interaction_at timestamp with time zone)
 LANGUAGE sql
 STABLE
AS $function$
  select
    i.id as interaction_id,
    i.contact_id,
    c.full_name as contact_name,
    i.interaction_type,
    i.notes,
    i.interaction_at
  from public.contact_interactions i
  join public.contacts c on c.id = i.contact_id
  where
    public.is_admin()
    or exists (
      select 1
      from public.contact_assignments ca
      where ca.contact_id = i.contact_id
        and ca.ended_at is null
        and ca.status = 'ACTIVE'
        and ca.assignment_role = 'PRIMARY'
        and ca.assigned_to_crm_user_id = public.current_crm_user_id()
    )
  order by i.interaction_at desc
  limit p_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.get_interaction_stats(p_start_date date DEFAULT (CURRENT_DATE - 30), p_end_date date DEFAULT CURRENT_DATE, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(interaction_date date, interaction_type text, interaction_count bigint, unique_contacts bigint, positive_outcomes bigint, negative_outcomes bigint, no_response bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT 
    DATE(i.interaction_at) as interaction_date,
    i.interaction_type,
    COUNT(*) as interaction_count,
    COUNT(DISTINCT i.contact_id) as unique_contacts,
    COUNT(*) FILTER (WHERE i.outcome IN ('POSITIVE', 'INTERESTED', 'MEETING_SCHEDULED')) as positive_outcomes,
    COUNT(*) FILTER (WHERE i.outcome IN ('NEGATIVE', 'NOT_INTERESTED')) as negative_outcomes,
    COUNT(*) FILTER (WHERE i.outcome IN ('NO_RESPONSE', 'NO_ANSWER')) as no_response
  FROM interactions i
  WHERE DATE(i.interaction_at) BETWEEN p_start_date AND p_end_date
    AND (p_user_id IS NULL OR i.created_by = p_user_id)
  GROUP BY DATE(i.interaction_at), i.interaction_type
  ORDER BY interaction_date DESC, interaction_count DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_create_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, full_name, role, region_focus, is_active, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'User'),
    coalesce(new.raw_user_meta_data->>'region_focus', null),
    true,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_user_deactivation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- only when active flips true -> false
  if old.active is true and new.active is false then

    update public.contact_assignments
    set
      status = 'CLOSED',
      ended_at = now(),
      -- keep ended_by_crm_user_id null if you don't have a safe actor here
      notes = coalesce(notes,'') || E'\n[CLOSED: user deactivated]'
    where assigned_to_crm_user_id = new.id
      and status in ('ACTIVE','active')
      and ended_at is null;

  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.has_any_role(roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  select exists (
    select 1
    from public.crm_users cu
    where cu.auth_user_id = auth.uid()
      and cu.active = true
      and cu.role = any(roles)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(public.current_crm_role() = any(roles), false)
$function$
;

CREATE OR REPLACE FUNCTION public.heal_missed_recurring_followups()
 RETURNS TABLE(followup_id uuid, contact_id uuid, next_due_date timestamp with time zone, action text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_followup RECORD;
  v_next_followup_id UUID;
BEGIN
  -- Find recurring followups that should have been completed by now
  -- but no next followup exists yet
  FOR v_followup IN
    SELECT 
      cf.*,
      c.full_name as contact_name
    FROM contact_followups cf
    JOIN contacts c ON c.id = cf.contact_id
    WHERE cf.recurrence_enabled = true
      AND cf.status = 'OPEN'
      AND cf.due_at < now() - interval '1 day' -- More than 1 day overdue
      AND NOT EXISTS (
        SELECT 1 FROM contact_followups cf2
        WHERE cf2.parent_followup_id = cf.id
          OR (cf.parent_followup_id IS NOT NULL AND cf2.parent_followup_id = cf.parent_followup_id)
        AND cf2.due_at > cf.due_at
      )
  LOOP
    -- Mark old one as missed
    UPDATE contact_followups
    SET 
      status = 'MISSED',
      updated_at = now()
    WHERE id = v_followup.id;

    -- Create next followup
    v_next_followup_id := create_next_recurring_followup(v_followup.id);

    IF v_next_followup_id IS NOT NULL THEN
      followup_id := v_followup.id;
      contact_id := v_followup.contact_id;
      next_due_date := calculate_next_followup_date(
        v_followup.due_at,
        v_followup.recurrence_frequency,
        COALESCE(v_followup.recurrence_interval, 1)
      );
      action := 'HEALED - Created next followup';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.import_single_contact(staging_id uuid, force_import_duplicate boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  row_data record;
  new_company_id uuid;
  new_contact_id uuid;

  -- For contacts.phone_type constraint (must match CHECK: WHATSAPP/LANDLINE)
  mapped_contact_phone_type text;

  -- For contact_phones.phone_type (keep your existing label style if your table expects it)
  mapped_phone_type_for_phones text;
BEGIN
  SELECT * INTO row_data
  FROM public.contact_import_staging
  WHERE id = staging_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staging row not found: %', staging_id;
  END IF;

  IF row_data.status = 'FAILED' THEN
    RAISE EXCEPTION 'Row failed validation: %', row_data.validation_errors;
  END IF;

  IF row_data.status = 'DUPLICATE' AND NOT force_import_duplicate THEN
    RAISE EXCEPTION 'Row is marked DUPLICATE. Set force_import_duplicate=true to override.';
  END IF;

  ---------------------------------------------------------------------------
  -- 1) Company: MUST be set (contacts.company_id is NOT NULL)
  ---------------------------------------------------------------------------

  -- If company_name provided, find or create it
  IF row_data.company_name IS NOT NULL AND btrim(row_data.company_name) <> '' THEN
    SELECT id INTO new_company_id
    FROM public.companies
    WHERE lower(btrim(company_name)) = lower(btrim(row_data.company_name))
    LIMIT 1;

    IF new_company_id IS NULL THEN
      -- Use a safe allowed type that does NOT require "other_text"
      INSERT INTO public.companies (company_name, company_type, country, company_type_other_text)
      VALUES (btrim(row_data.company_name), 'Broker', row_data.country_code, NULL)
      RETURNING id INTO new_company_id;
    END IF;
  END IF;

  -- If still NULL, fall back to INDIVIDUAL / UNKNOWN (you already created this)
  IF new_company_id IS NULL THEN
    SELECT id INTO new_company_id
    FROM public.companies
    WHERE company_name = 'INDIVIDUAL / UNKNOWN'
    LIMIT 1;

    IF new_company_id IS NULL THEN
      RAISE EXCEPTION 'Default company INDIVIDUAL / UNKNOWN not found';
    END IF;
  END IF;

  ---------------------------------------------------------------------------
  -- 2) Phone type mapping
  --    contacts.phone_type must satisfy: WHATSAPP / LANDLINE
  ---------------------------------------------------------------------------
  mapped_contact_phone_type :=
    CASE
      WHEN row_data.phone_type IS NULL OR btrim(row_data.phone_type) = '' THEN 'LANDLINE'
      WHEN upper(btrim(row_data.phone_type)) LIKE '%WHATS%' THEN 'WHATSAPP'
      WHEN upper(btrim(row_data.preferred_channel)) LIKE '%WHATS%' THEN 'WHATSAPP'
      ELSE 'LANDLINE'
    END;

  -- Keep your existing labels for contact_phones (adjust if your constraint differs)
  mapped_phone_type_for_phones :=
    CASE
      WHEN mapped_contact_phone_type = 'WHATSAPP' THEN 'WhatsApp'
      ELSE 'Landline'
    END;

  ---------------------------------------------------------------------------
  -- 3) Insert contact (SET company_id + SET contacts.phone_type + created_by)
  ---------------------------------------------------------------------------
  INSERT INTO public.contacts (
    full_name,
    designation,
    company_id,
    country_code,
    phone,
    phone_type,
    email,
    preferred_channel,
    notes,
    created_by_crm_user_id
  )
  VALUES (
    btrim(row_data.full_name),
    row_data.designation,
    new_company_id,
    row_data.country_code,
    row_data.phone,
    mapped_contact_phone_type,
    row_data.email,
    row_data.preferred_channel,
    row_data.notes,
    COALESCE(row_data.imported_by_crm_user_id, public.current_crm_user_id())
  )
  RETURNING id INTO new_contact_id;

  ---------------------------------------------------------------------------
  -- 4) Insert into contact_phones
  ---------------------------------------------------------------------------
  IF row_data.phone IS NOT NULL AND btrim(row_data.phone) <> '' THEN
    INSERT INTO public.contact_phones (
      contact_id,
      phone_type,
      phone_number,
      is_primary
    )
    VALUES (
      new_contact_id,
      mapped_phone_type_for_phones,
      row_data.phone,
      true
    );
  END IF;

  ---------------------------------------------------------------------------
  -- 5) Mark staging row imported
  ---------------------------------------------------------------------------
  UPDATE public.contact_import_staging
  SET
    status = 'IMPORTED',
    created_contact_id = new_contact_id,
    created_at = now(),
    validation_errors = '[]'::jsonb
  WHERE id = staging_id;

  RETURN new_contact_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.import_validated_batch(p_batch_id uuid, skip_duplicates boolean DEFAULT true)
 RETURNS TABLE(imported_count bigint, skipped_count bigint, failed_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  staging_row RECORD;
  new_contact_id UUID;
  imported INT := 0;
  skipped INT := 0;
  failed INT := 0;
BEGIN
  -- Import each row based on skip_duplicates flag
  FOR staging_row IN
    SELECT id, status
    FROM contact_import_staging
    WHERE batch_id = p_batch_id
      AND (
        status = 'VALIDATED'
        OR (NOT skip_duplicates AND status = 'DUPLICATE')
      )
  LOOP
    BEGIN
      new_contact_id := import_single_contact(
        staging_row.id,
        NOT skip_duplicates
      );
      imported := imported + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE contact_import_staging
      SET
        status = 'FAILED',
        validation_errors = COALESCE(validation_errors, '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object('field','import','message', SQLERRM)
        )
      WHERE id = staging_row.id;

      failed := failed + 1;
    END;
  END LOOP;

  -- Count skipped duplicates only when we are skipping them
  IF skip_duplicates THEN
    SELECT count(*) INTO skipped
    FROM contact_import_staging
    WHERE batch_id = p_batch_id
      AND status = 'DUPLICATE';
  END IF;

  RETURN QUERY SELECT imported::BIGINT, skipped::BIGINT, failed::BIGINT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.import_validated_contacts(p_batch_id uuid)
 RETURNS TABLE(imported_count integer, skipped_duplicate_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  with
  src as (
    select *
    from public.contact_import_staging s
    where s.batch_id = p_batch_id
      and s.status = 'VALIDATED'
  ),

  company_type_template as (
    select c.company_type
    from public.companies c
    where c.company_type is not null
    limit 1
  ),

  -- Ensure fallback company exists (company_name unique)
  default_company as (
    insert into public.companies (company_name, company_type)
    select 'UNKNOWN / UNASSIGNED', (select company_type from company_type_template)
    on conflict (company_name) do update
      set company_name = excluded.company_name
    returning id
  ),

  -- Create companies needed for this batch (company_name unique)
  company_upsert as (
    insert into public.companies (company_name, company_type)
    select distinct
      regexp_replace(trim(s.company_name), '\s+', ' ', 'g') as company_name,
      (select company_type from company_type_template) as company_type
    from src s
    where s.duplicate_contact_id is null
      and nullif(trim(s.company_name), '') is not null
    on conflict (company_name) do update
      set company_name = excluded.company_name
    returning id, company_name
  ),

  -- FIXED: Resolve company_id. If company_name is present, NEVER fall back to UNKNOWN.
  resolved as (
    select
      s.id as staging_id,
      case
        when nullif(trim(s.company_name), '') is not null then
          (
            select c.id
            from public.companies c
            where lower(regexp_replace(trim(c.company_name), '\s+', ' ', 'g')) =
                  lower(regexp_replace(trim(s.company_name), '\s+', ' ', 'g'))
            limit 1
          )
        else
          (select id from default_company limit 1)
      end as resolved_company_id
    from src s
    where s.duplicate_contact_id is null
  ),

  mark_dups as (
    update public.contact_import_staging s
    set status = 'SKIPPED_DUPLICATE',
        imported_at = now()
    where s.batch_id = p_batch_id
      and s.status = 'VALIDATED'
      and s.duplicate_contact_id is not null
    returning s.id
  ),

  inserted_contacts as (
    insert into public.contacts
      (created_from_staging_id, full_name, designation, email, company_id, country_code,
       ice_handle, preferred_channel, notes, is_active)
    select
      s.id,
      nullif(trim(s.full_name), ''),
      nullif(trim(s.designation), ''),
      nullif(trim(s.email), ''),
      r.resolved_company_id,
      nullif(trim(s.country_code), ''),
      nullif(trim(s.ice_handle), ''),
      nullif(trim(s.preferred_channel), ''),
      nullif(trim(s.notes), ''),
      true
    from src s
    join resolved r on r.staging_id = s.id
    where s.duplicate_contact_id is null
    on conflict (created_from_staging_id) where created_from_staging_id is not null
    do update set
      full_name = excluded.full_name,
      designation = excluded.designation,
      email = excluded.email,
      company_id = excluded.company_id,
      country_code = excluded.country_code,
      ice_handle = excluded.ice_handle,
      preferred_channel = excluded.preferred_channel,
      notes = excluded.notes,
      is_active = excluded.is_active
    returning id as contact_id, created_from_staging_id as staging_id
  ),

  mark_imported as (
    update public.contact_import_staging s
    set created_contact_id = ic.contact_id,
        imported_at = now(),
        status = 'IMPORTED'
    from inserted_contacts ic
    where s.id = ic.staging_id
    returning s.id
  )

  select
    (select count(*) from mark_imported)::int as imported_count,
    (select count(*) from mark_dups)::int as skipped_duplicate_count;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.interactions_set_created_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
begin
  if new.created_by is null then
    new.created_by := public.current_crm_user_id();
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  select public.has_any_role(array['Admin','CEO']);
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_ceo()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.crm_users
    where auth_user_id = auth.uid()
      and active = true
      and role in ('Admin','CEO')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role IN ('ADMIN', 'CEO')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_ceo_mode()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  select exists (
    select 1
    from public.crm_users u
    where u.auth_user_id = auth.uid()
      and upper(u.role) in ('CEO','ADMIN')
      and u.active = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_linked_active_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1
    from public.crm_users cu
    where cu.auth_user_id = auth.uid()
      and cu.active = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_manager()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select public.has_any_role(array['Manager','CEO','Admin']);
$function$
;

CREATE OR REPLACE FUNCTION public.is_valid_email(p_email text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
select
  p_email is not null
  and p_email ~* '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$';
$function$
;

CREATE OR REPLACE FUNCTION public.jwt_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
begin
  return coalesce(
    auth.jwt() ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.link_auth_user_to_crm_user()
 RETURNS TABLE(crm_user_id uuid, full_name text, email text, role text, active boolean, auth_user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_row public.crm_users%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_email = '' then
    raise exception 'EMAIL_MISSING_IN_SESSION';
  end if;

  -- Domain gate
  if right(v_email, length('@aqmaritime.com')) <> '@aqmaritime.com' then
    raise exception 'DOMAIN_NOT_ALLOWED';
  end if;

  -- Find provisioned crm_user by email
  select *
    into v_row
  from public.crm_users cu
  where lower(cu.email) = v_email
  limit 1;

  if not found then
    raise exception 'NOT_PROVISIONED';
  end if;

  if v_row.active is distinct from true then
    raise exception 'USER_INACTIVE';
  end if;

  -- Block if this email is already bound to a different auth uid
  if v_row.auth_user_id is not null and v_row.auth_user_id <> v_uid then
    raise exception 'EMAIL_ALREADY_LINKED_TO_ANOTHER_AUTH_UID';
  end if;

  -- Block if this auth uid is already bound to some other email
  if exists (
    select 1
    from public.crm_users cu
    where cu.auth_user_id = v_uid
      and lower(cu.email) <> v_email
  ) then
    raise exception 'AUTH_UID_ALREADY_LINKED_TO_DIFFERENT_EMAIL';
  end if;

  -- Idempotent link
  update public.crm_users
     set auth_user_id = v_uid
   where id = v_row.id;

  return query
  select cu.id, cu.full_name, cu.email, cu.role, cu.active, cu.auth_user_id
  from public.crm_users cu
  where cu.id = v_row.id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.link_google_user_to_crm_user()
 RETURNS public.crm_users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(
    coalesce(
      auth.jwt() ->> 'email',
      auth.jwt() -> 'user_metadata' ->> 'email'
    )
  );
  v_user public.crm_users;
begin
  if v_uid is null then
    raise exception 'NO_SESSION';
  end if;

  if v_email is null or v_email = '' then
    raise exception 'NO_EMAIL_IN_TOKEN';
  end if;

  if right(v_email, length('@aqmaritime.com')) <> '@aqmaritime.com' then
    raise exception 'DOMAIN_RESTRICTED';
  end if;

  select * into v_user
  from public.crm_users
  where lower(email) = v_email
  limit 1;

  if not found then
    raise exception 'NOT_PROVISIONED';
  end if;

  if coalesce(v_user.active, false) = false then
    raise exception 'USER_INACTIVE';
  end if;

  if v_user.auth_user_id = v_uid then
    return v_user;
  end if;

  if v_user.auth_user_id is not null and v_user.auth_user_id <> v_uid then
    raise exception 'ALREADY_LINKED_TO_DIFFERENT_UID';
  end if;

  update public.crm_users
     set auth_user_id = v_uid
   where id = v_user.id
   returning * into v_user;

  return v_user;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.log_contact_stage_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
begin
  if (tg_op = 'UPDATE')
     and new.status = 'ACTIVE'
     and lower(coalesce(new.assignment_role,'')) = 'primary'
     and new.stage is distinct from old.stage then

    insert into public.contact_stage_events (
      contact_id,
      actor_crm_user_id,
      from_stage,
      to_stage,
      occurred_at
    )
    values (
      new.contact_id,
      new.stage_changed_by_crm_user_id,
      old.stage,
      new.stage,
      now()
    );
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.log_enquiry_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    insert into public.enquiry_activities(enquiry_id, activity_type, description, created_by)
    values (new.id, 'CREATED', 'Enquiry created: ' || new.subject, new.created_by);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status is distinct from new.status then
      insert into public.enquiry_activities(enquiry_id, activity_type, description, old_value, new_value, created_by)
      values (
        new.id,
        case
          when new.status='WON' then 'WON'
          when new.status='LOST' then 'LOST'
          when new.status='CANCELLED' then 'CANCELLED'
          else 'STATUS_CHANGED'
        end,
        'Status changed from ' || old.status || ' to ' || new.status,
        old.status,
        new.status,
        public.current_crm_user_id()
      );
    end if;

    if old.assigned_to is distinct from new.assigned_to then
      insert into public.enquiry_activities(enquiry_id, activity_type, description, old_value, new_value, created_by)
      values (
        new.id,
        'ASSIGNED',
        'Assigned change',
        old.assigned_to::text,
        new.assigned_to::text,
        public.current_crm_user_id()
      );
    end if;

    return new;
  end if;

  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.log_interaction(p_contact_id uuid, p_interaction_type text, p_notes text, p_subject text DEFAULT NULL::text, p_outcome text DEFAULT NULL::text, p_duration_minutes integer DEFAULT NULL::integer, p_next_action text DEFAULT NULL::text, p_next_action_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_interaction_id UUID;
  v_assignment_id UUID;
  v_followup_id UUID;
BEGIN
  -- Get the active assignment for this contact and user
  SELECT id INTO v_assignment_id
  FROM contact_assignments
  WHERE contact_id = p_contact_id
    AND assigned_to_crm_user_id = current_crm_user_id()
    AND status = 'ACTIVE'
  LIMIT 1;
  
  -- Insert interaction (works with or without new columns)
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
    created_by
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
    current_crm_user_id()
  )
  RETURNING id INTO v_interaction_id;
  
  -- Create followup if next action specified and followups table exists
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
      
      -- Notify user about the followup (if notifications table exists)
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
            'contact_id', p_contact_id,
            'followup_id', v_followup_id,
            'interaction_id', v_interaction_id
          )
        FROM crm_users cu
        WHERE cu.id = current_crm_user_id();
      EXCEPTION WHEN OTHERS THEN
        -- Silently ignore if app_notifications doesn't exist
        NULL;
      END;
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore if contact_followups doesn't exist
      NULL;
    END;
  END IF;
  
  RETURN v_interaction_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_vessel_sanctions_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    insert into public.vessel_sanctions_history (
      vessel_id, source_id, old_status, new_status, changed_by_user_id, reason
    ) values (
      new.vessel_id, new.source_id, old.status, new.status, new.checked_by_user_id,
      coalesce(new.notes, 'status updated')
    );
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.merge_contacts(p_keep_contact_id uuid, p_merge_contact_id uuid, p_actor_crm_user_id uuid, p_overwrite boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  keep_c contacts%rowtype;
  merge_c contacts%rowtype;
BEGIN
  IF p_keep_contact_id = p_merge_contact_id THEN
    RAISE EXCEPTION 'keep_contact_id and merge_contact_id cannot be the same';
  END IF;

  SELECT * INTO keep_c FROM contacts WHERE id = p_keep_contact_id AND is_deleted = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Keep contact not found or deleted: %', p_keep_contact_id;
  END IF;

  SELECT * INTO merge_c FROM contacts WHERE id = p_merge_contact_id AND is_deleted = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merge contact not found or deleted: %', p_merge_contact_id;
  END IF;

  UPDATE contacts k
  SET
    full_name = CASE
      WHEN p_overwrite AND COALESCE(trim(merge_c.full_name),'') <> '' THEN merge_c.full_name
      WHEN COALESCE(trim(k.full_name),'') = '' AND COALESCE(trim(merge_c.full_name),'') <> '' THEN merge_c.full_name
      ELSE k.full_name
    END,
    designation = CASE
      WHEN p_overwrite AND COALESCE(trim(merge_c.designation),'') <> '' THEN merge_c.designation
      WHEN COALESCE(trim(k.designation),'') = '' AND COALESCE(trim(merge_c.designation),'') <> '' THEN merge_c.designation
      ELSE k.designation
    END,
    company_id = CASE
      WHEN p_overwrite AND merge_c.company_id IS NOT NULL THEN merge_c.company_id
      WHEN k.company_id IS NULL AND merge_c.company_id IS NOT NULL THEN merge_c.company_id
      ELSE k.company_id
    END,
    country_code = CASE
      WHEN p_overwrite AND COALESCE(trim(merge_c.country_code),'') <> '' THEN merge_c.country_code
      WHEN COALESCE(trim(k.country_code),'') = '' AND COALESCE(trim(merge_c.country_code),'') <> '' THEN merge_c.country_code
      ELSE k.country_code
    END,
    email = CASE
      WHEN p_overwrite AND COALESCE(trim(merge_c.email),'') <> '' THEN merge_c.email
      WHEN COALESCE(trim(k.email),'') = '' AND COALESCE(trim(merge_c.email),'') <> '' THEN merge_c.email
      ELSE k.email
    END,
    phone = CASE
      WHEN p_overwrite AND COALESCE(trim(merge_c.phone),'') <> '' THEN merge_c.phone
      WHEN COALESCE(trim(k.phone),'') = '' AND COALESCE(trim(merge_c.phone),'') <> '' THEN merge_c.phone
      ELSE k.phone
    END,
    ice_handle = CASE
      WHEN p_overwrite AND COALESCE(trim(merge_c.ice_handle),'') <> '' THEN merge_c.ice_handle
      WHEN COALESCE(trim(k.ice_handle),'') = '' AND COALESCE(trim(merge_c.ice_handle),'') <> '' THEN merge_c.ice_handle
      ELSE k.ice_handle
    END,
    preferred_channel = CASE
      WHEN p_overwrite AND COALESCE(trim(merge_c.preferred_channel),'') <> '' THEN merge_c.preferred_channel
      WHEN COALESCE(trim(k.preferred_channel),'') = '' AND COALESCE(trim(merge_c.preferred_channel),'') <> '' THEN merge_c.preferred_channel
      ELSE k.preferred_channel
    END,
    notes = CASE
      WHEN p_overwrite AND COALESCE(trim(merge_c.notes),'') <> '' THEN merge_c.notes
      WHEN COALESCE(trim(k.notes),'') = '' AND COALESCE(trim(merge_c.notes),'') <> '' THEN merge_c.notes
      ELSE k.notes
    END
  WHERE k.id = p_keep_contact_id;

  INSERT INTO contact_phones (contact_id, phone_type, phone_number, is_primary)
  SELECT
    p_keep_contact_id,
    COALESCE(p.phone_type, 'mobile'),
    p.phone_number,
    false
  FROM contact_phones p
  WHERE p.contact_id = p_merge_contact_id
    AND COALESCE(trim(p.phone_number),'') <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM contact_phones k
      WHERE k.contact_id = p_keep_contact_id
        AND normalize_phone(k.phone_number) = normalize_phone(p.phone_number)
    );

  UPDATE contacts
  SET
    is_deleted = true,
    deleted_at = now(),
    deleted_by_crm_user_id = p_actor_crm_user_id
  WHERE id = p_merge_contact_id;

  RETURN jsonb_build_object('ok', true, 'kept', p_keep_contact_id, 'merged', p_merge_contact_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_assignment_role()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.assignment_role is null then
    new.assignment_role := 'SECONDARY';
  else
    new.assignment_role := upper(btrim(new.assignment_role));
    if new.assignment_role in ('PRIMARY','PRI','P') then
      new.assignment_role := 'PRIMARY';
    elsif new.assignment_role in ('SECONDARY','SEC','S') then
      new.assignment_role := 'SECONDARY';
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_phone(phone_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
  select regexp_replace(coalesce(phone_text, ''), '[^0-9]', '', 'g');
$function$
;

CREATE OR REPLACE FUNCTION public.on_enquiry_created_add_participant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Use created_by (already stored on row) instead of current_crm_user_id()
  perform public.add_enquiry_participant(new.id, new.created_by, 'INITIATOR');

  if new.assigned_to is not null then
    perform public.add_enquiry_participant(new.id, new.assigned_to, 'OWNER');
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.on_enquiry_participation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Initiator always gets access to work the enquiry
  perform public.add_enquiry_participant(new.id, new.created_by, 'INITIATOR');

  -- If assigned_to set, also add as OWNER
  if new.assigned_to is not null then
    perform public.add_enquiry_participant(new.id, new.assigned_to, 'OWNER');
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.on_quote_created_add_participant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.add_enquiry_participant(new.enquiry_id, new.created_by, 'PARTICIPANT');
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.on_quote_participation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.add_enquiry_participant(new.enquiry_id, new.created_by, 'PARTICIPANT');
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.process_inactive_request(p_request_id uuid, p_approve boolean, p_admin_notes text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
BEGIN
  -- Only admin can process
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can process requests';
  END IF;
  
  -- Get request
  SELECT * INTO v_request
  FROM contact_stage_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_request.status != 'PENDING' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;
  
  IF p_approve THEN
    -- Approve: Close the assignment
    UPDATE contact_assignments
    SET 
      status = 'CLOSED',
      stage = 'INACTIVE',
      updated_at = now()
    WHERE contact_id = v_request.contact_id
      AND status = 'ACTIVE';
    
    -- Update request
    UPDATE contact_stage_requests
    SET 
      status = 'APPROVED',
      decided_by_crm_user_id = current_crm_user_id(),
      decided_at = now(),
      decision_notes = p_admin_notes
    WHERE id = p_request_id;
    
    RAISE NOTICE '✅ Request approved - contact now unassigned';
  ELSE
    -- Reject: Keep current stage
    UPDATE contact_stage_requests
    SET 
      status = 'REJECTED',
      decided_by_crm_user_id = current_crm_user_id(),
      decided_at = now(),
      decision_notes = p_admin_notes
    WHERE id = p_request_id;
    
    RAISE NOTICE '✅ Request rejected - contact remains assigned';
  END IF;
  
  -- Notify requester
  INSERT INTO app_notifications (
    user_id,
    notif_type,
    title,
    body,
    link_path,
    meta
  )
  SELECT
    cu.auth_user_id,
    CASE 
      WHEN p_approve THEN 'STAGE_REQUEST_APPROVED'
      ELSE 'STAGE_REQUEST_REJECTED'
    END,
    CASE 
      WHEN p_approve THEN 'Request Approved'
      ELSE 'Request Rejected'
    END,
    'Your request to mark contact as INACTIVE was ' ||
    CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    '/contacts/' || v_request.contact_id,
    jsonb_build_object(
      'request_id', p_request_id,
      'approved', p_approve,
      'admin_notes', p_admin_notes
    )
  FROM crm_users cu
  WHERE cu.id = v_request.requested_by_crm_user_id;
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.purge_contacts_and_delete_company(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_name text;
  v_contact_ids uuid[];
  v_contacts_deleted bigint := 0;
begin
  select name into v_company_name
  from public.companies
  where id = p_company_id;

  if v_company_name is null then
    raise exception 'Company not found: %', p_company_id;
  end if;

  select array_agg(id) into v_contact_ids
  from public.contacts
  where company_id = p_company_id;

  if v_contact_ids is null then
    delete from public.companies where id = p_company_id;

    return jsonb_build_object(
      'action', 'PURGE_AND_DELETE_COMPANY',
      'company_id', p_company_id,
      'company_name', v_company_name,
      'contacts_purged', 0
    );
  end if;

  -- A) Child tables referencing contacts (your exact FK list)
  delete from public.contact_assignment_audit where contact_id = any(v_contact_ids);
  delete from public.contact_assignments       where contact_id = any(v_contact_ids);
  delete from public.contact_followups         where contact_id = any(v_contact_ids);
  delete from public.contact_interactions      where contact_id = any(v_contact_ids);
  delete from public.contact_phones            where contact_id = any(v_contact_ids);
  delete from public.contact_private_details   where contact_id = any(v_contact_ids);
  delete from public.contact_stage_events      where contact_id = any(v_contact_ids);
  delete from public.contact_stage_requests    where contact_id = any(v_contact_ids);

  delete from public.follow_ups                where contact_id = any(v_contact_ids);
  delete from public.interactions              where contact_id = any(v_contact_ids);

  delete from public.enquiry_quotes            where sent_to_contact_id = any(v_contact_ids);
  delete from public.enquiry_recipients        where contact_id = any(v_contact_ids);
  delete from public.enquiry_responses         where contact_id = any(v_contact_ids);
  delete from public.enquiries                 where contact_id = any(v_contact_ids)
                                             or source_contact_id = any(v_contact_ids);

  delete from public.fixture_parties           where contact_id = any(v_contact_ids);

  delete from public.leads                     where source_contact_id = any(v_contact_ids);

  delete from public.options_shown
   where charterer_contact_id = any(v_contact_ids)
      or owner_contact_id = any(v_contact_ids);

  delete from public.contact_import_staging
   where created_contact_id = any(v_contact_ids)
      or duplicate_contact_id = any(v_contact_ids);

  -- B) Delete contacts
  delete from public.contacts
  where id = any(v_contact_ids);

  get diagnostics v_contacts_deleted = row_count;

  -- C) Company-level child tables (only if they exist)
  if to_regclass('public.company_followups') is not null then
    execute 'delete from public.company_followups where company_id = $1' using p_company_id;
  end if;

  if to_regclass('public.company_assignments') is not null then
    execute 'delete from public.company_assignments where company_id = $1' using p_company_id;
  end if;

  -- D) Delete company
  delete from public.companies
  where id = p_company_id;

  return jsonb_build_object(
    'action', 'PURGE_AND_DELETE_COMPANY',
    'company_id', p_company_id,
    'company_name', v_company_name,
    'contacts_purged', v_contacts_deleted
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reassign_contact_owner(p_contact_id uuid, p_new_owner_id uuid, p_assignment_role text, p_reassigned_by uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_old_assignment_id UUID;
  v_existing_status TEXT;
BEGIN
  -- Validate role
  IF UPPER(p_assignment_role) NOT IN ('PRIMARY', 'SECONDARY') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid assignment role');
  END IF;

  -- Step 1: Check if there's an existing active assignment
  SELECT id, status INTO v_old_assignment_id, v_existing_status
  FROM contact_assignments
  WHERE contact_id = p_contact_id
    AND LOWER(assignment_role) = LOWER(p_assignment_role)
    AND status = 'ACTIVE'
  LIMIT 1;

  -- Step 2: If exists, close it
  IF v_old_assignment_id IS NOT NULL THEN
    UPDATE contact_assignments
    SET status = 'CLOSED',
        ended_at = NOW(),
        ended_by_crm_user_id = p_reassigned_by
    WHERE id = v_old_assignment_id;
  END IF;

  -- Step 3: Create new assignment
  INSERT INTO contact_assignments (
    contact_id,
    assigned_to,
    assigned_by,
    assignment_role,
    status,
    assigned_at,
    assigned_to_crm_user_id,
    assigned_by_crm_user_id,
    created_by_crm_user_id
  ) VALUES (
    p_contact_id,
    p_new_owner_id,
    p_reassigned_by,
    LOWER(p_assignment_role),
    'ACTIVE',
    NOW(),
    p_new_owner_id,
    p_reassigned_by,
    p_reassigned_by
  );

  -- Step 4: Update contacts table if PRIMARY
  IF UPPER(p_assignment_role) = 'PRIMARY' THEN
    UPDATE contacts
    SET assigned_to_user_id = p_new_owner_id,
        updated_at = NOW()
    WHERE id = p_contact_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contact reassigned successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return detailed error for debugging
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.remove_secondary_owner(p_contact_id uuid, p_removed_by uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE contact_assignments
  SET status = 'INACTIVE',
      ended_at = NOW(),
      ended_by_crm_user_id = p_removed_by
  WHERE contact_id = p_contact_id
    AND assignment_role = 'SECONDARY'
    AND status = 'ACTIVE';

  RETURN json_build_object(
    'success', true,
    'message', 'Secondary owner removed'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_inactive(p_contact_id uuid, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request_id UUID;
  v_assignment_id UUID;
BEGIN
  -- Get current user's PRIMARY assignment
  SELECT id INTO v_assignment_id
  FROM contact_assignments
  WHERE contact_id = p_contact_id
    AND assigned_to_crm_user_id = current_crm_user_id()
    AND assignment_role = 'PRIMARY'
    AND status = 'ACTIVE';
  
  IF v_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Not assigned as PRIMARY owner';
  END IF;
  
  -- Create request
  INSERT INTO contact_stage_requests (
    contact_id,
    requested_stage,
    requested_by_crm_user_id,
    requested_at,
    status,
    decision_notes
  ) VALUES (
    p_contact_id,
    'INACTIVE',
    current_crm_user_id(),
    now(),
    'PENDING',
    p_reason
  )
  RETURNING id INTO v_request_id;
  
  -- Notify admins
  INSERT INTO app_notifications (
    user_id,
    notif_type,
    title,
    body,
    link_path,
    meta
  )
  SELECT
    cu.auth_user_id,
    'STAGE_REQUEST_PENDING',
    'Inactive Request',
    'User ' || requester.full_name || ' requests to mark contact ' || c.full_name || ' as INACTIVE',
    '/contacts/' || p_contact_id,
    jsonb_build_object(
      'request_id', v_request_id,
      'contact_id', p_contact_id,
      'requested_by', current_crm_user_id()
    )
  FROM crm_users cu
  CROSS JOIN crm_users requester
  CROSS JOIN contacts c
  WHERE cu.role IN ('Admin', 'CEO')
    AND cu.active = true
    AND requester.id = current_crm_user_id()
    AND c.id = p_contact_id;
  
  RAISE NOTICE '✅ Inactive request created: %', v_request_id;
  
  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_duplicate(p_action text, p_contact_ids uuid[], p_keep_id uuid, p_resolved_by uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_contact_to_delete UUID;
BEGIN
  -- Validate action
  IF p_action NOT IN ('keep', 'merge', 'delete') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;

  -- Validate we have exactly 2 contacts
  IF array_length(p_contact_ids, 1) != 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must provide exactly 2 contact IDs');
  END IF;

  IF p_action = 'keep' THEN
    -- Mark as resolved, no deletion
    UPDATE contacts
    SET duplicate_status = 'resolved'
    WHERE id = ANY(p_contact_ids);

  ELSIF p_action = 'delete' THEN
    -- Delete both contacts
    UPDATE contacts
    SET is_archived = true,
        archived_at = NOW(),
        duplicate_status = 'resolved'
    WHERE id = ANY(p_contact_ids);

  ELSIF p_action = 'merge' THEN
    -- Determine which to delete
    v_contact_to_delete := (
      SELECT unnest(p_contact_ids)
      WHERE unnest(p_contact_ids) != p_keep_id
      LIMIT 1
    );

    -- Transfer assignments to kept contact
    UPDATE contact_assignments
    SET contact_id = p_keep_id
    WHERE contact_id = v_contact_to_delete;

    -- Archive the duplicate
    UPDATE contacts
    SET is_archived = true,
        archived_at = NOW(),
        duplicate_status = 'resolved',
        merged_into_contact_id = p_keep_id,
        resolved_by = p_resolved_by,
        resolved_at = NOW()
    WHERE id = v_contact_to_delete;

    -- Mark kept contact as resolved
    UPDATE contacts
    SET duplicate_status = 'resolved',
        resolved_by = p_resolved_by,
        resolved_at = NOW()
    WHERE id = p_keep_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Duplicate resolved');

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_duplicate_contact(p_action text, p_keep_contact_id uuid, p_other_contact_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_now timestamptz := now();
  v_uid uuid := auth.uid();
  v_has_assignments boolean := false;
  v_has_interactions boolean := false;
  v_has_followups boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_action not in ('keep_this','keep_both','delete') then
    raise exception 'Invalid action: %', p_action;
  end if;

  if p_action in ('keep_this','delete') and p_keep_contact_id is null then
    raise exception 'keep_contact_id is required for action %', p_action;
  end if;

  if p_other_contact_id is null then
    raise exception 'other_contact_id is required';
  end if;

  -- Basic existence check
  if not exists (select 1 from public.contacts where id = p_other_contact_id) then
    raise exception 'Other contact not found: %', p_other_contact_id;
  end if;

  if p_keep_contact_id is not null and not exists (select 1 from public.contacts where id = p_keep_contact_id) then
    raise exception 'Keep contact not found: %', p_keep_contact_id;
  end if;

  -- Detect linked data for delete gating (defensive: only checks tables if they exist)
  if to_regclass('public.contact_assignments') is not null then
    select exists(
      select 1 from public.contact_assignments
      where contact_id = p_other_contact_id
    ) into v_has_assignments;
  end if;

  if to_regclass('public.interactions') is not null then
    select exists(
      select 1 from public.interactions
      where contact_id = p_other_contact_id
    ) into v_has_interactions;
  end if;

  if to_regclass('public.followups') is not null then
    select exists(
      select 1 from public.followups
      where contact_id = p_other_contact_id
    ) into v_has_followups;
  end if;

  -- Action: KEEP BOTH (clear duplicate flags on BOTH, no archive)
  if p_action = 'keep_both' then
    update public.contacts
      set duplicate_status = 'cleared',
          merged_into_contact_id = null,
          resolved_by = v_uid,
          resolved_at = v_now
    where id in (p_other_contact_id, coalesce(p_keep_contact_id, p_other_contact_id));

    return jsonb_build_object(
      'ok', true,
      'action', p_action,
      'kept', p_keep_contact_id,
      'other', p_other_contact_id
    );
  end if;

  -- Action: KEEP THIS (soft-archive the other; mark resolved and link)
  if p_action = 'keep_this' then
    if p_keep_contact_id = p_other_contact_id then
      raise exception 'keep_contact_id and other_contact_id cannot be same';
    end if;

    -- Winner is also marked cleared/resolved to remove from Duplicate Risk
    update public.contacts
      set duplicate_status = 'cleared',
          resolved_by = v_uid,
          resolved_at = v_now
    where id = p_keep_contact_id;

    update public.contacts
      set duplicate_status = 'resolved',
          merged_into_contact_id = p_keep_contact_id,
          resolved_by = v_uid,
          resolved_at = v_now,
          is_archived = true,
          archived_at = v_now
    where id = p_other_contact_id;

    return jsonb_build_object(
      'ok', true,
      'action', p_action,
      'kept', p_keep_contact_id,
      'other', p_other_contact_id,
      'archived_other', true
    );
  end if;

  -- Action: DELETE (only allowed if no linked data; otherwise block)
  if p_action = 'delete' then
    if (v_has_assignments or v_has_interactions or v_has_followups) then
      raise exception 'Delete blocked: contact has linked data (assignments=% interactions=% followups=%). Use Keep This instead.',
        v_has_assignments, v_has_interactions, v_has_followups;
    end if;

    delete from public.contacts
    where id = p_other_contact_id;

    -- Also mark the "winner" as cleared so it exits Duplicate Risk
    update public.contacts
      set duplicate_status = 'cleared',
          resolved_by = v_uid,
          resolved_at = v_now
    where id = p_keep_contact_id;

    return jsonb_build_object(
      'ok', true,
      'action', p_action,
      'kept', p_keep_contact_id,
      'deleted_other', p_other_contact_id
    );
  end if;

  raise exception 'Unhandled action';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_can_close_secondary(p_assignment_id uuid, p_actor_crm_user_id uuid)
 RETURNS TABLE(contact_id uuid, actor_is_current_primary boolean)
 LANGUAGE sql
 STABLE
AS $function$
  select
    ca.contact_id,
    exists (
      select 1
      from contact_assignments p
      where p.contact_id = ca.contact_id
        and p.assignment_role = 'PRIMARY'
        and p.status in ('ACTIVE','active')
        and p.ended_at is null
        and p.assigned_to_crm_user_id = p_actor_crm_user_id
    ) as actor_is_current_primary
  from contact_assignments ca
  where ca.id = p_assignment_id;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_close_enquiry(p_enquiry_id uuid, p_closed_status text DEFAULT 'CLOSED'::text, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_actor uuid;
begin
  v_actor := public.current_crm_user_id();

  update public.enquiries
  set
    closed_status = p_closed_status,
    closed_at = now(),
    status = 'CLOSED',
    lifecycle_state = 'CLOSED',
    cancellation_reason = coalesce(cancellation_reason, p_reason),
    updated_at = now()
  where id = p_enquiry_id
    and created_by = v_actor;

  if not found then
    raise exception 'Not authorized or enquiry not found: %', p_enquiry_id;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_close_secondary(p_assignment_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_actor uuid;
  v_role text;
begin
  v_actor := public.current_crm_user_id();

  select assignment_role into v_role
  from contact_assignments
  where id = p_assignment_id;

  if not found then
    raise exception 'Assignment not found: %', p_assignment_id;
  end if;

  if v_role <> 'SECONDARY' then
    raise exception 'Not a SECONDARY assignment: %', p_assignment_id;
  end if;

  update contact_assignments
  set
    status  = 'CLOSED',
    ended_at = now(),
    notes = public.append_audit_note(
      notes,
      '[SECONDARY closed by ' || coalesce(v_actor::text,'UNKNOWN') || '] ' || coalesce(p_reason,'')
    )
  where id = p_assignment_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_create_enquiry(p_subject text, p_description text DEFAULT NULL::text, p_enquiry_type text DEFAULT NULL::text, p_enq_type text DEFAULT NULL::text, p_vessel_type text DEFAULT NULL::text, p_cargo_type text DEFAULT NULL::text, p_quantity numeric DEFAULT NULL::numeric, p_quantity_unit text DEFAULT NULL::text, p_loading_port text DEFAULT NULL::text, p_discharge_port text DEFAULT NULL::text, p_laycan_from date DEFAULT NULL::date, p_laycan_to date DEFAULT NULL::date, p_currency text DEFAULT NULL::text, p_budget_min numeric DEFAULT NULL::numeric, p_budget_max numeric DEFAULT NULL::numeric, p_priority text DEFAULT NULL::text, p_is_draft boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_actor uuid;
  v_id uuid;
begin
  v_actor := public.current_crm_user_id();

  if v_actor is null then
    raise exception 'CRM user mapping missing for this auth user';
  end if;

  insert into public.enquiries (
    subject,
    description,
    enquiry_type,
    enq_type,
    vessel_type,
    cargo_type,
    quantity,
    quantity_unit,
    loading_port,
    discharge_port,
    laycan_from,
    laycan_to,
    currency,
    budget_min,
    budget_max,
    priority,
    is_draft,
    lifecycle_state,
    status,
    created_by,
    created_at,
    updated_at
  ) values (
    p_subject,
    p_description,
    p_enquiry_type,
    p_enq_type,
    p_vessel_type,
    p_cargo_type,
    p_quantity,
    p_quantity_unit,
    p_loading_port,
    p_discharge_port,
    p_laycan_from,
    p_laycan_to,
    p_currency,
    p_budget_min,
    p_budget_max,
    p_priority,
    coalesce(p_is_draft,false),
    'OPEN',
    'OPEN',
    v_actor,
    now(),
    now()
  )
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_create_enquiry_fast(p_mode text, p_subject text, p_cargo_type text DEFAULT NULL::text, p_quantity numeric DEFAULT NULL::numeric, p_quantity_unit text DEFAULT NULL::text, p_vessel_type text DEFAULT NULL::text, p_vessel_name text DEFAULT NULL::text, p_lp text DEFAULT NULL::text, p_dp text DEFAULT NULL::text, p_laycan_from date DEFAULT NULL::date, p_laycan_to date DEFAULT NULL::date, p_priority text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_other_requirements jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_actor uuid;
  v_enquiry_id uuid;
begin
  v_actor := public.current_crm_user_id();
  if v_actor is null then
    raise exception 'CRM user mapping missing for this auth user';
  end if;

  p_mode := upper(trim(p_mode));

  if p_mode not in ('SPOT','VOY','TC','CVC','BB','SNP') then
    raise exception 'Invalid enquiry mode: %', p_mode;
  end if;

  if p_subject is null or length(trim(p_subject)) = 0 then
    raise exception 'Subject is required';
  end if;

  -- Mode-specific required fields
  if p_mode in ('SPOT','VOY','CVC','BB') then
    if p_cargo_type is null or length(trim(p_cargo_type)) = 0 then
      raise exception 'cargo_type is required for %', p_mode;
    end if;
    if p_quantity is null then
      raise exception 'quantity is required for %', p_mode;
    end if;
    if p_quantity_unit is null or length(trim(p_quantity_unit)) = 0 then
      raise exception 'quantity_unit is required for %', p_mode;
    end if;
    if p_lp is null or length(trim(p_lp)) = 0 then
      raise exception 'LP is required for %', p_mode;
    end if;
    if p_dp is null or length(trim(p_dp)) = 0 then
      raise exception 'DP is required for %', p_mode;
    end if;
    if p_laycan_from is null or p_laycan_to is null then
      raise exception 'laycan_from and laycan_to are required for %', p_mode;
    end if;
  end if;

  if p_mode = 'TC' then
    if p_vessel_type is null or length(trim(p_vessel_type)) = 0 then
      raise exception 'vessel_type is required for TC';
    end if;
    if p_lp is null or length(trim(p_lp)) = 0 then
      raise exception 'Delivery port is required for TC';
    end if;
    if p_dp is null or length(trim(p_dp)) = 0 then
      raise exception 'Redelivery port is required for TC';
    end if;
    if p_laycan_from is null or p_laycan_to is null then
      raise exception 'laycan_from and laycan_to are required for TC';
    end if;
  end if;

  if p_mode = 'SNP' then
    if p_vessel_name is null or length(trim(p_vessel_name)) = 0 then
      raise exception 'vessel_name is required for SNP';
    end if;
    if p_vessel_type is null or length(trim(p_vessel_type)) = 0 then
      raise exception 'vessel_type is required for SNP';
    end if;
    if p_lp is null or length(trim(p_lp)) = 0 then
      raise exception 'Port 1 is required for SNP';
    end if;
    if p_dp is null or length(trim(p_dp)) = 0 then
      raise exception 'Port 2 is required for SNP';
    end if;
    if p_laycan_from is null or p_laycan_to is null then
      raise exception 'laycan_from and laycan_to are required for SNP';
    end if;
  end if;

  -- Insert into enquiries (detailed mode stored here)
  insert into public.enquiries (
    subject,
    notes,
    enquiry_mode,
    cargo_type,
    quantity,
    quantity_unit,
    vessel_type,
    vessel_name,
    loading_port,
    discharge_port,
    laycan_from,
    laycan_to,
    priority,
    other_requirements,
    lifecycle_state,
    status,
    created_by,
    created_at,
    updated_at
  ) values (
    p_subject,
    p_notes,
    p_mode,
    p_cargo_type,
    p_quantity,
    p_quantity_unit,
    p_vessel_type,
    p_vessel_name,
    p_lp,
    p_dp,
    p_laycan_from,
    p_laycan_to,
    p_priority,
    p_other_requirements,
    'OPEN',
    'OPEN',
    v_actor,
    now(),
    now()
  )
  returning id into v_enquiry_id;

  -- Insert into enquiry_feed (category mode ONLY; enquiries always go to CARGO_OPEN)
  insert into public.enquiry_feed (
    enquiry_id,
    enquiry_number,
    enquiry_mode,
    subject,
    status,
    priority,
    created_by,
    created_at,
    updated_at
  ) values (
    v_enquiry_id,
    (select enquiry_number from public.enquiries where id = v_enquiry_id),
    'CARGO_OPEN',
    p_subject,
    'OPEN',
    p_priority,
    v_actor,
    now(),
    now()
  );

  return v_enquiry_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_create_enquiry_fast(p_mode text, p_subject text, p_cargo_type text DEFAULT NULL::text, p_quantity numeric DEFAULT NULL::numeric, p_quantity_unit text DEFAULT NULL::text, p_vessel_type text DEFAULT NULL::text, p_vessel_name text DEFAULT NULL::text, p_lp text DEFAULT NULL::text, p_dp text DEFAULT NULL::text, p_laycan_from date DEFAULT NULL::date, p_laycan_to date DEFAULT NULL::date, p_priority text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_other_requirements jsonb DEFAULT NULL::jsonb, p_actor_crm_user_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_actor uuid;
  v_enquiry_id uuid;
begin
  v_actor := coalesce(p_actor_crm_user_id, public.current_crm_user_id());

  if v_actor is null then
    raise exception 'CRM user mapping missing for this auth user (or actor override not provided)';
  end if;

  p_mode := upper(trim(p_mode));
  if p_mode not in ('SPOT','VOY','TC','CVC','BB','SNP') then
    raise exception 'Invalid enquiry mode: %', p_mode;
  end if;

  if p_subject is null or length(trim(p_subject)) = 0 then
    raise exception 'Subject is required';
  end if;

  -- Required fields by mode
  if p_mode in ('SPOT','VOY','CVC','BB') then
    if p_cargo_type is null or length(trim(p_cargo_type)) = 0 then
      raise exception 'cargo_type is required for %', p_mode;
    end if;
    if p_quantity is null then
      raise exception 'quantity is required for %', p_mode;
    end if;
    if p_quantity_unit is null or length(trim(p_quantity_unit)) = 0 then
      raise exception 'quantity_unit is required for %', p_mode;
    end if;
    if p_lp is null or length(trim(p_lp)) = 0 then
      raise exception 'LP is required for %', p_mode;
    end if;
    if p_dp is null or length(trim(p_dp)) = 0 then
      raise exception 'DP is required for %', p_mode;
    end if;
    if p_laycan_from is null or p_laycan_to is null then
      raise exception 'laycan_from and laycan_to are required for %', p_mode;
    end if;
  end if;

  if p_mode = 'TC' then
    if p_vessel_type is null or length(trim(p_vessel_type)) = 0 then
      raise exception 'vessel_type is required for TC';
    end if;
    if p_lp is null or length(trim(p_lp)) = 0 then
      raise exception 'Delivery port is required for TC';
    end if;
    if p_dp is null or length(trim(p_dp)) = 0 then
      raise exception 'Redelivery port is required for TC';
    end if;
    if p_laycan_from is null or p_laycan_to is null then
      raise exception 'laycan_from and laycan_to are required for TC';
    end if;
  end if;

  if p_mode = 'SNP' then
    if p_vessel_name is null or length(trim(p_vessel_name)) = 0 then
      raise exception 'vessel_name is required for SNP';
    end if;
    if p_vessel_type is null or length(trim(p_vessel_type)) = 0 then
      raise exception 'vessel_type is required for SNP';
    end if;
    if p_lp is null or length(trim(p_lp)) = 0 then
      raise exception 'Port 1 is required for SNP';
    end if;
    if p_dp is null or length(trim(p_dp)) = 0 then
      raise exception 'Port 2 is required for SNP';
    end if;
    if p_laycan_from is null or p_laycan_to is null then
      raise exception 'laycan_from and laycan_to are required for SNP';
    end if;
  end if;

  insert into public.enquiries (
    subject, notes, enquiry_mode,
    cargo_type, quantity, quantity_unit,
    vessel_type, vessel_name,
    loading_port, discharge_port,
    laycan_from, laycan_to,
    priority, other_requirements,
    lifecycle_state, status,
    created_by, created_at, updated_at
  ) values (
    p_subject, p_notes, p_mode,
    p_cargo_type, p_quantity, p_quantity_unit,
    p_vessel_type, p_vessel_name,
    p_lp, p_dp,
    p_laycan_from, p_laycan_to,
    p_priority, p_other_requirements,
    'OPEN', 'OPEN',
    v_actor, now(), now()
  )
  returning id into v_enquiry_id;

  insert into public.enquiry_feed (
    enquiry_id, enquiry_number, enquiry_mode,
    subject, status, priority,
    created_by, created_at, updated_at
  ) values (
    v_enquiry_id,
    (select enquiry_number from public.enquiries where id = v_enquiry_id),
    'CARGO_OPEN',
    p_subject, 'OPEN', p_priority,
    v_actor, now(), now()
  );

  return v_enquiry_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_create_enquiry_fast(p_mode text, p_subject text, p_cargo_type text DEFAULT NULL::text, p_quantity numeric DEFAULT NULL::numeric, p_quantity_unit text DEFAULT NULL::text, p_vessel_type text DEFAULT NULL::text, p_vessel_name text DEFAULT NULL::text, p_lp text DEFAULT NULL::text, p_dp text DEFAULT NULL::text, p_laycan_from date DEFAULT NULL::date, p_laycan_to date DEFAULT NULL::date, p_priority text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_other_requirements jsonb DEFAULT NULL::jsonb, p_is_draft boolean DEFAULT false, p_actor_crm_user_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_actor uuid;
  v_enquiry_id uuid;
  v_lifecycle_state text;
  v_status text;
  v_issued_at timestamptz;
begin
  v_actor := coalesce(p_actor_crm_user_id, public.current_crm_user_id());
  if v_actor is null then
    raise exception 'CRM user mapping missing for this auth user (or actor override not provided)';
  end if;

  p_mode := upper(trim(p_mode));
  if p_mode not in ('SPOT','VOY','TC','CVC','BB','SNP') then
    raise exception 'Invalid enquiry mode: %', p_mode;
  end if;

  if p_subject is null or length(trim(p_subject)) = 0 then
    raise exception 'Subject is required';
  end if;

  -- lifecycle_state per constraint
  if coalesce(p_is_draft,false) = true then
    v_lifecycle_state := 'DRAFT';
    v_status := 'DRAFT';
    v_issued_at := null;
  else
    v_lifecycle_state := 'ISSUED';
    v_status := 'OPEN';
    v_issued_at := now();
  end if;

  -- Required fields by mode (only when not draft)
  if v_lifecycle_state <> 'DRAFT' then
    if p_mode in ('SPOT','VOY','CVC','BB') then
      if p_cargo_type is null or length(trim(p_cargo_type)) = 0 then
        raise exception 'cargo_type is required for %', p_mode;
      end if;
      if p_quantity is null then
        raise exception 'quantity is required for %', p_mode;
      end if;
      if p_quantity_unit is null or length(trim(p_quantity_unit)) = 0 then
        raise exception 'quantity_unit is required for %', p_mode;
      end if;
      if p_lp is null or length(trim(p_lp)) = 0 then
        raise exception 'LP is required for %', p_mode;
      end if;
      if p_dp is null or length(trim(p_dp)) = 0 then
        raise exception 'DP is required for %', p_mode;
      end if;
      if p_laycan_from is null or p_laycan_to is null then
        raise exception 'laycan_from and laycan_to are required for %', p_mode;
      end if;
    end if;

    if p_mode = 'TC' then
      if p_vessel_type is null or length(trim(p_vessel_type)) = 0 then
        raise exception 'vessel_type is required for TC';
      end if;
      if p_lp is null or length(trim(p_lp)) = 0 then
        raise exception 'Delivery port is required for TC';
      end if;
      if p_dp is null or length(trim(p_dp)) = 0 then
        raise exception 'Redelivery port is required for TC';
      end if;
      if p_laycan_from is null or p_laycan_to is null then
        raise exception 'laycan_from and laycan_to are required for TC';
      end if;
    end if;

    if p_mode = 'SNP' then
      if p_vessel_name is null or length(trim(p_vessel_name)) = 0 then
        raise exception 'vessel_name is required for SNP';
      end if;
      if p_vessel_type is null or length(trim(p_vessel_type)) = 0 then
        raise exception 'vessel_type is required for SNP';
      end if;
      if p_lp is null or length(trim(p_lp)) = 0 then
        raise exception 'Port 1 is required for SNP';
      end if;
      if p_dp is null or length(trim(p_dp)) = 0 then
        raise exception 'Port 2 is required for SNP';
      end if;
      if p_laycan_from is null or p_laycan_to is null then
        raise exception 'laycan_from and laycan_to are required for SNP';
      end if;
    end if;
  end if;

  insert into public.enquiries (
    subject,
    notes,
    enquiry_mode,
    cargo_type,
    quantity,
    quantity_unit,
    vessel_type,
    vessel_name,
    loading_port,
    discharge_port,
    laycan_from,
    laycan_to,
    priority,
    other_requirements,
    lifecycle_state,
    status,
    is_draft,
    created_by,
    issued_at,
    created_at,
    updated_at
  ) values (
    p_subject,
    p_notes,
    p_mode,
    p_cargo_type,
    p_quantity,
    p_quantity_unit,
    p_vessel_type,
    p_vessel_name,
    p_lp,
    p_dp,
    p_laycan_from,
    p_laycan_to,
    p_priority,
    p_other_requirements,
    v_lifecycle_state,
    v_status,
    coalesce(p_is_draft,false),
    v_actor,
    v_issued_at,
    now(),
    now()
  )
  returning id into v_enquiry_id;

  insert into public.enquiry_feed (
    enquiry_id,
    enquiry_number,
    enquiry_mode,
    subject,
    status,
    priority,
    created_by,
    created_at,
    updated_at
  ) values (
    v_enquiry_id,
    (select enquiry_number from public.enquiries where id = v_enquiry_id),
    'CARGO_OPEN',
    p_subject,
    v_status,
    p_priority,
    v_actor,
    now(),
    now()
  );

  return v_enquiry_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_enquiry_feed_one(p_enquiry_id uuid)
 RETURNS TABLE(enquiry_id uuid, enquiry_number text, enquiry_mode text, subject text, status text, priority text, quantity numeric, quantity_unit text, loading_port text, discharge_port text, laycan_from date, laycan_to date, vessel_type text, contact_id uuid, company_id uuid, created_by uuid, created_by_name text, company_name text, contact_display_name text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
AS $function$
  select *
  from public.rpc_enquiry_feed_page(1, 0, 'ALL', null, null)
  where enquiry_id = p_enquiry_id;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_enquiry_feed_page(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_tab text DEFAULT 'ALL'::text, p_status text[] DEFAULT NULL::text[], p_mode text[] DEFAULT NULL::text[])
 RETURNS TABLE(enquiry_id uuid, enquiry_number text, enquiry_mode text, subject text, status text, priority text, quantity numeric, quantity_unit text, loading_port text, discharge_port text, laycan_from date, laycan_to date, vessel_type text, contact_id uuid, company_id uuid, created_by uuid, created_by_name text, company_name text, contact_display_name text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
AS $function$
  with base as (
    select
      ef.enquiry_id,
      ef.enquiry_number,
      ef.enquiry_mode,
      ef.subject,
      ef.status,
      ef.priority,
      ef.quantity,
      ef.quantity_unit,
      ef.loading_port,
      ef.discharge_port,
      ef.laycan_from,
      ef.laycan_to,
      ef.vessel_type,
      ef.contact_id,
      ef.company_id,
      ef.created_by,
      ef.created_by_name,
      ef.created_at,
      ef.updated_at
    from public.enquiry_feed_vw ef
    where 1=1
      and (p_tab <> 'MY_ENQS' or ef.created_by = public.current_crm_user_id())
      and (p_tab <> 'HOT' or (ef.priority = 'HIGH' and ef.status in ('NEW','WORKING')))
      and (p_status is null or ef.status = any(p_status))
      and (p_mode is null or ef.enquiry_mode = any(p_mode))
    order by ef.created_at desc
    limit p_limit offset p_offset
  )
  select
    b.enquiry_id,
    b.enquiry_number,
    b.enquiry_mode,
    b.subject,
    b.status,
    b.priority,
    b.quantity,
    b.quantity_unit,
    b.loading_port,
    b.discharge_port,
    b.laycan_from,
    b.laycan_to,
    b.vessel_type,
    b.contact_id,
    b.company_id,
    b.created_by,
    b.created_by_name,
    coalesce(c.company_name, 'Unknown Company') as company_name,
    ct.full_name as contact_display_name,
    b.created_at,
    b.updated_at
  from base b
  left join public.companies c
    on c.id = b.company_id
  left join public.contacts ct
    on ct.id = b.contact_id;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_followups_debug_overview()
 RETURNS TABLE(open_total bigint, open_min_due timestamp with time zone, open_max_due timestamp with time zone, open_next7 bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin_ceo() then
    raise exception 'Access restricted';
  end if;

  return query
  select
    count(*) filter (where status='OPEN')::bigint as open_total,
    min(due_at) filter (where status='OPEN') as open_min_due,
    max(due_at) filter (where status='OPEN') as open_max_due,
    count(*) filter (
      where status='OPEN'
        and due_at >= date_trunc('day', now()) + interval '1 day'
        and due_at <  date_trunc('day', now()) + interval '8 day'
    )::bigint as open_next7
  from public.contact_followups;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_followups_due_for_notification()
 RETURNS TABLE(followup_id uuid, due_at timestamp with time zone, notified_to uuid, notification_type text, contact_name text, company_name text, reason text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with bounds as (
  select
    (date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') as ist_day_start,
    ((date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '1 day') at time zone 'Asia/Kolkata') as ist_next_day_start
),
base as (
  select
    cf.id as followup_id,
    cf.due_at,
    ca.assigned_to as notified_to,
    c.full_name as contact_name,
    co.company_name as company_name,
    cf.followup_reason as reason
  from public.contact_followups cf
  join public.contact_assignments ca on ca.id = cf.assignment_id
  join public.contacts c on c.id = cf.contact_id
  left join public.companies co on co.id = c.company_id
  where cf.status = 'OPEN'
    and ca.status = 'ACTIVE'
    and ca.assigned_to is not null
),
bucketed as (
  select
    b.*,
    case
      when b.due_at < (select ist_day_start from bounds) then 'FOLLOWUP_OVERDUE'
      when b.due_at >= (select ist_day_start from bounds)
       and b.due_at <  (select ist_next_day_start from bounds) then 'FOLLOWUP_DUE_TODAY'
      else null
    end as notification_type
  from base b
)
select
  followup_id, due_at, notified_to, notification_type,
  contact_name, company_name, reason
from bucketed
where notification_type is not null
order by notified_to, due_at asc;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_followups_kpis()
 RETURNS TABLE(overdue bigint, due_today bigint, next_7_days bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin_ceo() then
    raise exception 'Access restricted';
  end if;

  return query
  select
    sum(case when cf.status='OPEN' and cf.due_at < now() then 1 else 0 end)::bigint as overdue,
    sum(case when cf.status='OPEN'
              and cf.due_at >= date_trunc('day', now())
              and cf.due_at <  date_trunc('day', now()) + interval '1 day' then 1 else 0 end)::bigint as due_today,
    sum(case when cf.status='OPEN'
              and cf.due_at >= date_trunc('day', now()) + interval '1 day'
              and cf.due_at <  date_trunc('day', now()) + interval '8 day' then 1 else 0 end)::bigint as next_7_days
  from public.contact_followups cf;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_followups_next_7_days()
 RETURNS TABLE(followup_id uuid, due_at timestamp with time zone, followup_type text, followup_reason text, notes text, contact_id uuid, contact_name text, company_name text, caller_id uuid, caller_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin_ceo() then
    raise exception 'Access restricted';
  end if;

  return query
  select
    cf.id as followup_id,
    cf.due_at,
    cf.followup_type,
    cf.followup_reason,
    cf.notes,
    c.id as contact_id,
    c.full_name as contact_name,
    co.company_name as company_name,   -- FIXED
    ca.assigned_to as caller_id,
    p.full_name as caller_name,
    cf.created_at
  from public.contact_followups cf
  join public.contact_assignments ca on ca.id = cf.assignment_id
  join public.contacts c on c.id = cf.contact_id
  left join public.companies co on co.id = c.company_id
  join public.profiles p on p.id = ca.assigned_to
  where cf.status = 'OPEN'
    and cf.due_at >= now()
    and cf.due_at < now() + interval '7 days'
  order by cf.due_at asc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_log_followup_notification(p_followup_id uuid, p_notified_to uuid, p_notification_type text, p_channel text, p_meta jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
begin
  insert into public.followup_notifications_log
    (followup_id, notified_to, notification_type, channel, meta)
  values
    (p_followup_id, p_notified_to, p_notification_type, p_channel, p_meta)
  on conflict do nothing
  returning id into v_id;

  return v_id; -- null means "already notified"
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_mark_notification_read(p_notification_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.app_notifications
  set is_read = true,
      read_at = now()
  where id = p_notification_id
    and user_id = auth.uid();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_contact_creator_fields()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.created_at is null then
    new.created_at := now();
  end if;

  if new.created_by_crm_user_id is null then
    -- Uses your existing helper; no auth refactor.
    new.created_by_crm_user_id := public.current_crm_user_id();
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_enquiry_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.enquiry_number is null or btrim(new.enquiry_number) = '' then
    new.enquiry_number := public.generate_enquiry_number();
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_fixture_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.fixture_number is null or btrim(new.fixture_number)='' then
    new.fixture_number := public.generate_fixture_number();
  end if;
  new.updated_at := now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.set_followup_recurring(p_followup_id uuid, p_frequency text, p_interval integer DEFAULT 1, p_end_date date DEFAULT NULL::date)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE contact_followups
  SET
    recurrence_enabled = true,
    recurrence_frequency = p_frequency,
    recurrence_interval = p_interval,
    recurrence_end_date = p_end_date,
    updated_at = now()
  WHERE id = p_followup_id
    AND (created_by = current_crm_user_id() OR is_admin());

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_quote_number_and_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_next_version int;
begin
  if new.quote_number is null or btrim(new.quote_number) = '' then
    new.quote_number := public.generate_quote_number();
  end if;

  select coalesce(max(version), 0) + 1
    into v_next_version
  from public.enquiry_quotes
  where enquiry_id = new.enquiry_id;

  if new.version is null or new.version < v_next_version then
    new.version := v_next_version;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_task_created_by()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.created_by_crm_user_id is null then
    new.created_by_crm_user_id := public.current_crm_user_id();
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_task_created_by_from_auth()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_crm_user_id uuid;
begin
  if new.created_by_crm_user_id is null then
    select cu.id into v_crm_user_id
    from public.crm_users cu
    where cu.auth_user_id = auth.uid();

    if v_crm_user_id is null then
      raise exception 'No crm_users row found for auth user %', auth.uid();
    end if;

    new.created_by_crm_user_id := v_crm_user_id;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.stop_recurring_followup(p_followup_id uuid, p_cancel_future boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Disable recurrence on this followup
  UPDATE contact_followups
  SET
    recurrence_enabled = false,
    updated_at = now()
  WHERE id = p_followup_id
    AND (created_by = current_crm_user_id() OR is_admin());

  -- Optionally cancel all future followups in the chain
  IF p_cancel_future THEN
    UPDATE contact_followups
    SET
      status = 'CANCELLED',
      updated_at = now()
    WHERE (parent_followup_id = p_followup_id OR id = p_followup_id)
      AND status = 'OPEN'
      AND due_at > now();
  END IF;

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_enquiry_feed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_mode text;
begin
  -- Normalize enquiry_mode into enquiry_feed allowed values:
  -- Allowed: CARGO_OPEN, VESSEL_OPEN, GENERAL
  v_mode := nullif(trim(coalesce(new.enquiry_mode, '')), '');

  v_mode := upper(replace(v_mode, ' ', '_'));

  v_mode :=
    case
      -- already valid
      when v_mode in ('CARGO_OPEN','VESSEL_OPEN','GENERAL') then v_mode

      -- common UI labels / variants
      when v_mode in ('CARGO_ENQUIRY','CARGO_ENQ','CARGO','CARGO_INQUIRY','CARGO_ENQUIRY_MODE','CARGOENQUIRY','CARGO_ENQUIRY_') then 'CARGO_OPEN'
      when v_mode in ('OPEN_VESSEL','VESSEL_ENQUIRY','VESSEL_ENQ','VESSEL','TONNAGE','OPEN','VESSEL_OPEN_ENQUIRY','OPENVESSEL') then 'VESSEL_OPEN'

      -- anything unknown or null -> GENERAL (safe default)
      else 'GENERAL'
    end;

  insert into public.enquiry_feed (
    enquiry_id, enquiry_number, enquiry_mode, subject, status, priority, created_by, created_at, updated_at
  )
  values (
    new.id,
    new.enquiry_number,
    v_mode,
    new.subject,
    new.status,
    new.priority,
    new.created_by,
    new.created_at,
    new.updated_at
  )
  on conflict (enquiry_id) do update set
    enquiry_number = excluded.enquiry_number,
    enquiry_mode   = excluded.enquiry_mode,
    subject        = excluded.subject,
    status         = excluded.status,
    priority       = excluded.priority,
    updated_at     = excluded.updated_at;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_contact_assignments_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Always set assigned_by_crm_user_id
  if new.assigned_by_crm_user_id is null then
    new.assigned_by_crm_user_id := public.current_crm_user_id();
  end if;

  if new.assigned_at is null then
    new.assigned_at := now();
  end if;

  -- Keep assigned_to and assigned_to_crm_user_id in sync
  if new.assigned_to_crm_user_id is null and new.assigned_to is not null then
    new.assigned_to_crm_user_id := new.assigned_to;
  end if;

  if new.assigned_to is null and new.assigned_to_crm_user_id is not null then
    new.assigned_to := new.assigned_to_crm_user_id;
  end if;

  -- Keep assigned_by and assigned_by_crm_user_id in sync
  if new.assigned_by_crm_user_id is null and new.assigned_by is not null then
    new.assigned_by_crm_user_id := new.assigned_by;
  end if;

  if new.assigned_by is null and new.assigned_by_crm_user_id is not null then
    new.assigned_by := new.assigned_by_crm_user_id;
  end if;

  -- Normalize role and default if missing
  if new.assignment_role is null then
    new.assignment_role := 'primary';
  else
    new.assignment_role := lower(new.assignment_role);
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_followup_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_user_id uuid;
  v_ass_contact uuid;
  v_ass_status text;
begin
  v_user_id := public.current_crm_user_id();

  if v_user_id is null then
    raise exception 'No crm_users row linked to auth user';
  end if;

  -- created_by: always set from logged-in user
  new.created_by := v_user_id;

  -- assignment must match contact + be ACTIVE
  select ca.contact_id, ca.status
    into v_ass_contact, v_ass_status
  from public.contact_assignments ca
  where ca.id = new.assignment_id;

  if v_ass_contact is null then
    raise exception 'Invalid assignment_id';
  end if;

  if v_ass_contact <> new.contact_id then
    raise exception 'assignment_id does not belong to contact_id';
  end if;

  if v_ass_status <> 'ACTIVE' then
    raise exception 'Follow-up must be linked to an ACTIVE assignment';
  end if;

  -- optional interaction_id must match same contact
  if new.interaction_id is not null then
    if not exists (
      select 1
      from public.contact_interactions ci
      where ci.id = new.interaction_id
        and ci.contact_id = new.contact_id
    ) then
      raise exception 'interaction_id does not belong to contact_id';
    end if;
  end if;

  -- status/completion consistency
  if new.status = 'COMPLETED' and new.completed_at is null then
    new.completed_at := now();
  end if;

  if new.status <> 'COMPLETED' and new.completed_at is not null then
    raise exception 'completed_at can only be set when status = COMPLETED';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_sanitize_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Only act if column exists in the table (works for both tables if they have email)
  if new.email is not null then
    new.email := public.clean_email(new.email);

    -- If still invalid, null it (never block import)
    if new.email is not null and not public.is_valid_email(new.email) then
      new.email := null;
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_interactions_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
declare
  v_crm_user_id uuid;
  v_assignment_id uuid;
begin
  -- created_by from logged-in auth user
  select id into v_crm_user_id
  from public.crm_users
  where auth_user_id = auth.uid()
  limit 1;

  if v_crm_user_id is null then
    raise exception 'No crm_users row found for auth user %', auth.uid();
  end if;

  new.created_by := v_crm_user_id;

  -- if UI does not pass assignment_id, link to current ACTIVE assignment for this user
  if new.assignment_id is null then
    select id into v_assignment_id
    from public.contact_assignments
    where contact_id = new.contact_id
      and status = 'ACTIVE'
      and assigned_to = auth.uid()
    order by assigned_at desc
    limit 1;

    new.assignment_id := v_assignment_id;
  end if;

  if new.interaction_at is null then
    new.interaction_at := now();
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_create_company_recurring_followup()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'COMPLETED' 
     AND OLD.status != 'COMPLETED' 
     AND NEW.recurrence_enabled = true THEN
    PERFORM create_next_company_recurring_followup(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_create_recurring_followup()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- When a followup is marked COMPLETED and it's recurring
  IF NEW.status = 'COMPLETED' 
     AND OLD.status != 'COMPLETED' 
     AND NEW.recurrence_enabled = true THEN
    
    -- Create next followup (async - don't block the completion)
    PERFORM create_next_recurring_followup(NEW.id);
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_contact_on_interaction()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update the contact's updated_at timestamp
  UPDATE contacts
  SET updated_at = NEW.interaction_at
  WHERE id = NEW.contact_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_contact_safe(p_contact_id uuid, p_full_name text DEFAULT NULL::text, p_company_name text DEFAULT NULL::text, p_designation text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_country_code text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_phone_type text DEFAULT NULL::text, p_ice_handle text DEFAULT NULL::text, p_preferred_channel text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_company_type public.companies.company_type%type;

  v_phone_clean text;
  v_phone_type_template public.contact_phones.phone_type%type;
  v_phone_type_final public.contact_phones.phone_type%type;
begin
  if p_contact_id is null then
    raise exception 'contact_id is required';
  end if;

  -- Resolve / upsert company if provided (otherwise keep existing)
  if nullif(btrim(coalesce(p_company_name,'')), '') is not null then
    select c.company_type
      into v_company_type
    from public.companies c
    where c.company_type is not null
    limit 1;

    if v_company_type is null then
      raise exception 'No companies.company_type template found';
    end if;

    insert into public.companies (company_name, company_type)
    values (btrim(p_company_name), v_company_type)
    on conflict (company_name) do update
      set company_name = excluded.company_name
    returning id into v_company_id;
  end if;

  -- Update contact (email will be sanitized by trigger if you have it on contacts)
  update public.contacts c
  set
    full_name = coalesce(nullif(btrim(p_full_name), ''), c.full_name),
    designation = coalesce(nullif(btrim(p_designation), ''), c.designation),
    email = case
      when p_email is null then c.email
      when btrim(p_email) = '' then null
      else btrim(p_email)
    end,
    company_id = coalesce(v_company_id, c.company_id),
    country_code = case
      when p_country_code is null then c.country_code
      when btrim(p_country_code) = '' then null
      else btrim(p_country_code)
    end,
    ice_handle = case
      when p_ice_handle is null then c.ice_handle
      when btrim(p_ice_handle) = '' then null
      else btrim(p_ice_handle)
    end,
    preferred_channel = case
      when p_preferred_channel is null then c.preferred_channel
      when btrim(p_preferred_channel) = '' then null
      else btrim(p_preferred_channel)
    end,
    notes = case
      when p_notes is null then c.notes
      when btrim(p_notes) = '' then null
      else btrim(p_notes)
    end,
    updated_at = now()
  where c.id = p_contact_id;

  if not found then
    raise exception 'contact not found';
  end if;

  -- Phone: optional update. If phone is NULL => leave as-is. If phone is empty string => clear primary phone.
  if p_phone is not null then
    v_phone_clean := nullif(regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g'), '');

    if v_phone_clean is null then
      -- clear primary phone
      update public.contact_phones
      set is_primary = false
      where contact_id = p_contact_id and is_primary = true;
    else
      -- template phone_type
      select cp.phone_type
        into v_phone_type_template
      from public.contact_phones cp
      where cp.phone_type is not null
      limit 1;

      -- accept user phone_type only if it matches allowed values already present
      if nullif(btrim(coalesce(p_phone_type,'')), '') is not null then
        select cp.phone_type
          into v_phone_type_final
        from public.contact_phones cp
        where lower(cp.phone_type::text) = lower(btrim(p_phone_type))
        limit 1;
      end if;

      v_phone_type_final := coalesce(v_phone_type_final, v_phone_type_template);

      -- Upsert primary phone (never fail if phone_type missing; just skip)
      if v_phone_type_final is not null then
        -- ensure only one primary
        update public.contact_phones
        set is_primary = false
        where contact_id = p_contact_id and is_primary = true;

        insert into public.contact_phones (contact_id, phone_number, phone_type, is_primary, notes)
        values (p_contact_id, v_phone_clean, v_phone_type_final, true, null)
        on conflict do nothing;
      end if;
    end if;
  end if;

  return p_contact_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_contact_stage(p_contact_id uuid, p_stage text, p_updated_by uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Validate stage
  IF p_stage NOT IN ('COLD_CALLING', 'ASPIRATION', 'ACHIEVEMENT', 'INACTIVE') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_STAGE',
      'message', 'Invalid stage value'
    );
  END IF;

  -- Update contact stage
  UPDATE contacts
  SET stage = p_stage,
      updated_at = NOW()
  WHERE id = p_contact_id;

  -- Update PRIMARY assignment stage
  UPDATE contact_assignments
  SET stage = p_stage,
      stage_changed_at = NOW(),
      stage_changed_by_crm_user_id = p_updated_by,
      updated_by_crm_user_id = p_updated_by
  WHERE contact_id = p_contact_id
    AND assignment_role = 'PRIMARY'
    AND status = 'ACTIVE';

  RETURN json_build_object(
    'success', true,
    'message', 'Stage updated successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_enquiry_status(p_enquiry_id uuid, p_new_status text, p_actual_value numeric DEFAULT NULL::numeric, p_lost_reason text DEFAULT NULL::text, p_lost_to_competitor text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.enquiries
  set
    status = p_new_status,
    actual_value = coalesce(p_actual_value, actual_value),
    lost_reason = coalesce(p_lost_reason, lost_reason),
    lost_to_competitor = coalesce(p_lost_to_competitor, lost_to_competitor),
    closed_at = case when p_new_status in ('WON','LOST','CANCELLED') then now() else closed_at end,
    updated_at = now()
  where id = p_enquiry_id
    and (assigned_to = public.current_crm_user_id() or public.is_admin());

  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_contact_safe(p_contact_id uuid DEFAULT NULL::uuid, p_full_name text DEFAULT NULL::text, p_company_name text DEFAULT NULL::text, p_designation text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_country_code text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_phone_type text DEFAULT NULL::text, p_ice_handle text DEFAULT NULL::text, p_preferred_channel text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_contact_id uuid;
  v_company_id uuid;
  v_company_type public.companies.company_type%type;

  v_phone_clean text;
  v_phone_type_template public.contact_phones.phone_type%type;
  v_phone_type_final public.contact_phones.phone_type%type;

  v_existing_company_id uuid;
begin
  -- For ADD: full_name is mandatory
  if p_contact_id is null then
    if p_full_name is null or btrim(p_full_name) = '' then
      raise exception 'full_name is required';
    end if;
  end if;

  -- If editing, ensure contact exists
  if p_contact_id is not null then
    select c.id, c.company_id
      into v_contact_id, v_existing_company_id
    from public.contacts c
    where c.id = p_contact_id;

    if v_contact_id is null then
      raise exception 'contact not found';
    end if;
  end if;

  -- Resolve company only if provided (else keep existing company on EDIT, fallback on ADD)
  if nullif(btrim(coalesce(p_company_name,'')), '') is not null then
    select c.company_type
      into v_company_type
    from public.companies c
    where c.company_type is not null
    limit 1;

    if v_company_type is null then
      raise exception 'No companies.company_type template found';
    end if;

    insert into public.companies (company_name, company_type)
    values (btrim(p_company_name), v_company_type)
    on conflict (company_name) do update
      set company_name = excluded.company_name
    returning id into v_company_id;

  else
    if p_contact_id is null then
      -- ADD without company_name: fallback to UNKNOWN / UNASSIGNED
      select c.company_type
        into v_company_type
      from public.companies c
      where c.company_type is not null
      limit 1;

      if v_company_type is null then
        raise exception 'No companies.company_type template found';
      end if;

      insert into public.companies (company_name, company_type)
      values ('UNKNOWN / UNASSIGNED', v_company_type)
      on conflict (company_name) do update
        set company_name = excluded.company_name
      returning id into v_company_id;
    else
      -- EDIT without company_name: keep existing
      v_company_id := v_existing_company_id;
    end if;
  end if;

  -- ADD path
  if p_contact_id is null then
    insert into public.contacts
      (full_name, designation, email, company_id, country_code, ice_handle, preferred_channel, notes, is_active)
    values
      (nullif(btrim(p_full_name), ''),
       nullif(btrim(p_designation), ''),
       case when p_email is null or btrim(p_email) = '' then null else btrim(p_email) end,
       v_company_id,
       case when p_country_code is null or btrim(p_country_code) = '' then null else btrim(p_country_code) end,
       case when p_ice_handle is null or btrim(p_ice_handle) = '' then null else btrim(p_ice_handle) end,
       case when p_preferred_channel is null or btrim(p_preferred_channel) = '' then null else btrim(p_preferred_channel) end,
       case when p_notes is null or btrim(p_notes) = '' then null else btrim(p_notes) end,
       true
      )
    returning id into v_contact_id;

  else
    -- EDIT path (only overwrite fields if param is not null)
    update public.contacts c
    set
      full_name = coalesce(nullif(btrim(p_full_name), ''), c.full_name),
      designation = case when p_designation is null then c.designation else nullif(btrim(p_designation), '') end,
      email = case
        when p_email is null then c.email
        when btrim(p_email) = '' then null
        else btrim(p_email)
      end,
      company_id = coalesce(v_company_id, c.company_id),
      country_code = case
        when p_country_code is null then c.country_code
        when btrim(p_country_code) = '' then null
        else btrim(p_country_code)
      end,
      ice_handle = case
        when p_ice_handle is null then c.ice_handle
        when btrim(p_ice_handle) = '' then null
        else btrim(p_ice_handle)
      end,
      preferred_channel = case
        when p_preferred_channel is null then c.preferred_channel
        when btrim(p_preferred_channel) = '' then null
        else btrim(p_preferred_channel)
      end,
      notes = case
        when p_notes is null then c.notes
        when btrim(p_notes) = '' then null
        else btrim(p_notes)
      end,
      updated_at = now()
    where c.id = p_contact_id;

    v_contact_id := p_contact_id;
  end if;

  -- PHONE rules:
  -- p_phone = NULL  -> do nothing (keep existing)
  -- p_phone = ""    -> clear primary phone
  -- p_phone = value -> upsert primary phone (non-blocking if phone_type invalid)
  if p_phone is not null then
    v_phone_clean := nullif(regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g'), '');

    if v_phone_clean is null then
      update public.contact_phones
      set is_primary = false
      where contact_id = v_contact_id and is_primary = true;

    else
      select cp.phone_type
        into v_phone_type_template
      from public.contact_phones cp
      where cp.phone_type is not null
      limit 1;

      if nullif(btrim(coalesce(p_phone_type,'')), '') is not null then
        select cp.phone_type
          into v_phone_type_final
        from public.contact_phones cp
        where lower(cp.phone_type::text) = lower(btrim(p_phone_type))
        limit 1;
      end if;

      v_phone_type_final := coalesce(v_phone_type_final, v_phone_type_template);

      if v_phone_type_final is not null then
        -- ensure single primary
        update public.contact_phones
        set is_primary = false
        where contact_id = v_contact_id and is_primary = true;

        insert into public.contact_phones (contact_id, phone_number, phone_type, is_primary, notes)
        values (v_contact_id, v_phone_clean, v_phone_type_final, true, null)
        on conflict do nothing;
      end if;
    end if;
  end if;

  return v_contact_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.user_can_access_contact(contact_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Admin always has access
  SELECT is_admin()
  OR EXISTS (
    -- User created this contact
    SELECT 1 FROM contacts 
    WHERE id = contact_id_param 
      AND created_by_crm_user_id = current_crm_user_id()
  )
  OR EXISTS (
    -- User is assigned to this contact
    SELECT 1 FROM contact_assignments
    WHERE contact_id = contact_id_param
      AND assigned_to_crm_user_id = current_crm_user_id()
      AND status = 'ACTIVE'
  );
$function$
;

create or replace view "public"."v_activity_feed" as  SELECT os.lead_id,
    os.id AS option_id,
    os.shown_at,
    os.option_type,
    nl.id AS negotiation_log_id,
    nl.logged_at,
    nl.by_side,
    nl.subject,
    nl.status,
    nl.message_summary,
    nl.term_snapshot
   FROM (public.options_shown os
     JOIN public.negotiation_log nl ON ((nl.option_id = os.id)));


create or replace view "public"."v_activity_queue" as  SELECT os.lead_id,
    os.id AS option_id,
    os.shown_at,
    os.option_type,
    last_nl.id AS last_negotiation_log_id,
    last_nl.logged_at AS last_update_at,
    last_nl.by_side AS last_by_side,
    last_nl.subject AS last_subject,
    last_nl.status AS current_status,
    last_nl.message_summary AS last_message_summary,
    last_nl.term_snapshot AS last_term_snapshot
   FROM (public.options_shown os
     JOIN LATERAL ( SELECT nl.id,
            nl.option_id,
            nl.logged_at,
            nl.by_side,
            nl.subject,
            nl.message_summary,
            nl.term_snapshot,
            nl.status
           FROM public.negotiation_log nl
          WHERE (nl.option_id = os.id)
          ORDER BY nl.logged_at DESC
         LIMIT 1) last_nl ON (true));


create or replace view "public"."v_activity_timeline" as  SELECT os.lead_id,
    os.id AS option_id,
    os.shown_at,
    os.option_type,
    nl.id AS negotiation_log_id,
    nl.logged_at,
    nl.by_side,
    nl.subject,
    nl.status,
    nl.message_summary,
    nl.term_snapshot
   FROM (public.options_shown os
     JOIN public.negotiation_log nl ON ((nl.option_id = os.id)));


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
    count(i.id) AS total_interactions,
    count(
        CASE
            WHEN (i.interaction_type = 'CALL'::text) THEN 1
            ELSE NULL::integer
        END) AS total_calls,
    count(
        CASE
            WHEN (i.interaction_type = 'EMAIL'::text) THEN 1
            ELSE NULL::integer
        END) AS total_emails,
    count(
        CASE
            WHEN (i.interaction_type = 'MEETING'::text) THEN 1
            ELSE NULL::integer
        END) AS total_meetings,
    max(i.interaction_at) AS last_interaction_at,
    max(i.interaction_type) FILTER (WHERE (i.interaction_at = ( SELECT max(i2.interaction_at) AS max
           FROM public.interactions__legacy i2
          WHERE (i2.contact_id = c.id)))) AS last_interaction_type,
    min(i.interaction_at) AS first_interaction_at,
    EXTRACT(day FROM (now() - max(i.interaction_at))) AS days_since_last_touch,
    count(
        CASE
            WHEN (i.outcome = ANY (ARRAY['POSITIVE'::text, 'INTERESTED'::text])) THEN 1
            ELSE NULL::integer
        END) AS positive_interactions,
    count(
        CASE
            WHEN (i.outcome = ANY (ARRAY['NEGATIVE'::text, 'NOT_INTERESTED'::text])) THEN 1
            ELSE NULL::integer
        END) AS negative_interactions,
    count(
        CASE
            WHEN (i.interaction_at > (now() - '30 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS interactions_last_30_days
   FROM ((public.contacts c
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
     LEFT JOIN public.interactions__legacy i ON ((i.contact_id = c.id)))
  GROUP BY c.id, c.full_name, c.email, c.phone, co.company_name;


create or replace view "public"."v_contact_interactions_timeline" as  SELECT i.id,
    i.contact_id,
    i.assignment_id,
    i.interaction_at,
    i.interaction_type,
    i.outcome,
    i.subject,
    i.notes,
    i.created_by AS created_by_crm_user_id,
    u.auth_user_id AS created_by_auth_user_id,
    u.full_name AS creator_full_name,
    u.email AS creator_email,
    u.role AS creator_role,
    i.created_at,
    ca.status AS assignment_status,
    ca.stage AS assignment_stage,
    ca.assigned_to AS assignment_assigned_to,
    ca.assigned_at AS assignment_assigned_at
   FROM ((public.interactions__legacy i
     JOIN public.crm_users u ON ((u.id = i.created_by)))
     LEFT JOIN public.contact_assignments ca ON ((ca.id = i.assignment_id)));


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
     LEFT JOIN LATERAL ( SELECT i.interaction_at,
            i.interaction_type,
            i.outcome
           FROM public.interactions__legacy i
          WHERE (i.contact_id = c.id)
          ORDER BY i.interaction_at DESC
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
    c.assigned_to,
    c.created_at,
    c.assigned_to_user_id,
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


create or replace view "public"."v_contacts_workbench_all" as  SELECT ca.assigned_to AS user_id,
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
           FROM public.follow_ups__legacy fu
          WHERE ((fu.contact_id = ca.contact_id) AND (fu.assigned_to = ca.assigned_to) AND (fu.status = 'OPEN'::text))) AS next_follow_up_at
   FROM ((public.contact_assignments ca
     JOIN public.contacts c ON ((c.id = ca.contact_id)))
     LEFT JOIN public.contact_interactions ci ON (((ci.contact_id = ca.contact_id) AND (ci.user_id = ca.assigned_to))))
  WHERE (ca.status = 'ACTIVE'::text)
  GROUP BY ca.assigned_to, ca.contact_id, ca.stage, ca.status, ca.assigned_at, ca.notes, c.full_name, c.designation, c.company_id, c.preferred_channel, c.ice_handle;


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


create or replace view "public"."v_directory_contacts_ro" as  SELECT contact_id,
    full_name,
    company_id,
    company_name,
    is_active,
    primary_owner_id,
    primary_stage,
    secondary_owner_id,
    is_unassigned
   FROM public.directory_contacts_ro() directory_contacts_ro(contact_id, full_name, company_id, company_name, is_active, primary_owner_id, primary_stage, secondary_owner_id, is_unassigned);


create or replace view "public"."v_directory_owner_snapshot" as  SELECT c.id AS contact_id,
    p.assigned_to_crm_user_id AS primary_owner_id,
    u1.full_name AS primary_owner_name,
    s.assigned_to_crm_user_id AS secondary_owner_id,
    u2.full_name AS secondary_owner_name
   FROM ((((public.contacts c
     LEFT JOIN LATERAL ( SELECT ca.id,
            ca.contact_id,
            ca.assigned_to,
            ca.assigned_by,
            ca.assigned_at,
            ca.status,
            ca.stage,
            ca.stage_changed_at,
            ca.stage_changed_by,
            ca.notes,
            ca.assigned_to_crm_user_id,
            ca.assigned_by_crm_user_id,
            ca.stage_changed_by_crm_user_id,
            ca.assignment_role,
            ca.updated_by_crm_user_id,
            ca.ended_by_crm_user_id,
            ca.ended_at,
            ca.created_by_crm_user_id
           FROM public.contact_assignments ca
          WHERE ((ca.contact_id = c.id) AND (lower(TRIM(BOTH FROM ca.assignment_role)) = 'primary'::text) AND (ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL))
          ORDER BY ca.assigned_at DESC
         LIMIT 1) p ON (true))
     LEFT JOIN public.crm_users u1 ON ((u1.id = p.assigned_to_crm_user_id)))
     LEFT JOIN LATERAL ( SELECT ca.id,
            ca.contact_id,
            ca.assigned_to,
            ca.assigned_by,
            ca.assigned_at,
            ca.status,
            ca.stage,
            ca.stage_changed_at,
            ca.stage_changed_by,
            ca.notes,
            ca.assigned_to_crm_user_id,
            ca.assigned_by_crm_user_id,
            ca.stage_changed_by_crm_user_id,
            ca.assignment_role,
            ca.updated_by_crm_user_id,
            ca.ended_by_crm_user_id,
            ca.ended_at,
            ca.created_by_crm_user_id
           FROM public.contact_assignments ca
          WHERE ((ca.contact_id = c.id) AND (lower(TRIM(BOTH FROM ca.assignment_role)) = 'secondary'::text) AND (ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL))
          ORDER BY ca.assigned_at DESC
         LIMIT 1) s ON (true))
     LEFT JOIN public.crm_users u2 ON ((u2.id = s.assigned_to_crm_user_id)));


create or replace view "public"."v_directory_stage_counts" as  SELECT upper(replace(TRIM(BOTH FROM COALESCE(primary_stage, 'INACTIVE'::text)), ' '::text, '_'::text)) AS stage,
    (count(*))::integer AS cnt
   FROM public.v_directory_contacts dc
  GROUP BY (upper(replace(TRIM(BOTH FROM COALESCE(primary_stage, 'INACTIVE'::text)), ' '::text, '_'::text)));


create or replace view "public"."v_enquiry_context" as  SELECT id AS enquiry_id,
    created_at,
    enq_type,
    lifecycle_state,
    closed_status,
    is_test,
    is_workable,
    workability_reason,
    valid_until
   FROM public.enquiries e;


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


create or replace view "public"."v_enquiry_response_weighted" as  SELECT er.enquiry_id,
    er.contact_id,
    e.enq_type,
    er.response_at,
    er.is_workable,
        CASE
            WHEN (er.response_at >= (now() - '30 days'::interval)) THEN 1.0
            WHEN (er.response_at >= (now() - '90 days'::interval)) THEN 0.6
            ELSE 0.3
        END AS recency_weight
   FROM (public.enquiry_responses er
     JOIN public.enquiries e ON ((e.id = er.enquiry_id)))
  WHERE (e.is_test = false);


create or replace view "public"."v_enquiry_summary_by_status" as  SELECT e.assigned_to AS user_id,
    cu.full_name AS user_name,
    count(*) FILTER (WHERE (e.status = 'NEW'::text)) AS new_count,
    count(*) FILTER (WHERE (e.status = 'REVIEWING'::text)) AS reviewing_count,
    count(*) FILTER (WHERE (e.status = 'QUOTE_SENT'::text)) AS quote_sent_count,
    count(*) FILTER (WHERE (e.status = 'NEGOTIATING'::text)) AS negotiating_count,
    count(*) FILTER (WHERE (e.status = 'WON'::text)) AS won_count,
    count(*) FILTER (WHERE (e.status = 'LOST'::text)) AS lost_count,
    sum(e.our_estimate) FILTER (WHERE (e.status = ANY (ARRAY['NEW'::text, 'REVIEWING'::text, 'QUOTE_SENT'::text, 'NEGOTIATING'::text]))) AS pipeline_value,
    sum(e.actual_value) FILTER (WHERE (e.status = 'WON'::text)) AS won_value,
    sum(e.our_estimate) FILTER (WHERE (e.status = 'LOST'::text)) AS lost_value,
    sum(((e.our_estimate * (COALESCE(e.win_probability, 50))::numeric) / 100.0)) FILTER (WHERE (e.status = ANY (ARRAY['NEW'::text, 'REVIEWING'::text, 'QUOTE_SENT'::text, 'NEGOTIATING'::text]))) AS weighted_pipeline,
    round(((100.0 * (count(*) FILTER (WHERE (e.status = 'WON'::text)))::numeric) / (NULLIF(count(*) FILTER (WHERE (e.status = ANY (ARRAY['WON'::text, 'LOST'::text]))), 0))::numeric), 1) AS win_rate_percent
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


create or replace view "public"."v_interaction_timeline__legacy" as  SELECT i.id,
    i.contact_id,
    i.interaction_type,
    i.subject,
    i.notes,
    i.outcome,
    i.duration_minutes,
    i.next_action,
    i.next_action_date,
    i.interaction_at,
    i.created_at,
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
            WHEN (i.interaction_at > (now() - '01:00:00'::interval)) THEN 'Just now'::text
            WHEN (i.interaction_at > (now() - '1 day'::interval)) THEN 'Today'::text
            WHEN (i.interaction_at > (now() - '2 days'::interval)) THEN 'Yesterday'::text
            WHEN (i.interaction_at > (now() - '7 days'::interval)) THEN 'This week'::text
            WHEN (i.interaction_at > (now() - '30 days'::interval)) THEN 'This month'::text
            ELSE to_char(i.interaction_at, 'Mon DD, YYYY'::text)
        END AS time_label,
        CASE
            WHEN (i.next_action IS NOT NULL) THEN (EXISTS ( SELECT 1
               FROM public.contact_followups cf
              WHERE ((cf.contact_id = i.contact_id) AND (cf.followup_reason = i.next_action) AND (cf.due_at >= i.interaction_at) AND (cf.status = 'COMPLETED'::text))))
            ELSE NULL::boolean
        END AS followup_completed
   FROM ((((public.interactions__legacy i
     JOIN public.crm_users cu ON ((cu.id = i.created_by)))
     JOIN public.contacts c ON ((c.id = i.contact_id)))
     LEFT JOIN public.companies co ON ((co.id = c.company_id)))
     LEFT JOIN public.contact_assignments ca ON ((ca.id = i.assignment_id)))
  ORDER BY i.interaction_at DESC;


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


create or replace view "public"."v_recovery_feed" as  SELECT i.fixture_id,
    i.id AS invoice_id,
    i.invoice_type,
    i.amount AS invoice_amount,
    i.currency,
    i.payment_status,
    rl.id AS recovery_log_id,
    rl.logged_at,
    rl.by_side,
    rl.action,
    rl.status,
    rl.notes,
    rl.meta
   FROM (public.invoices i
     JOIN public.recovery_log rl ON ((rl.invoice_id = i.id)));


create or replace view "public"."v_recovery_queue" as  SELECT i.fixture_id,
    i.id AS invoice_id,
    i.invoice_type,
    i.amount,
    i.currency,
    i.payment_status,
    last_rl.logged_at AS last_update_at,
    last_rl.by_side AS last_by_side,
    last_rl.action AS last_action,
    last_rl.status AS current_status,
    last_rl.notes AS last_notes
   FROM (public.invoices i
     LEFT JOIN LATERAL ( SELECT rl.id,
            rl.invoice_id,
            rl.logged_at,
            rl.by_side,
            rl.action,
            rl.status,
            rl.notes,
            rl.meta
           FROM public.recovery_log rl
          WHERE (rl.invoice_id = i.id)
          ORDER BY rl.logged_at DESC
         LIMIT 1) last_rl ON (true));


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


create or replace view "public"."v_similar_enquiries" as  SELECT e1.enquiry_id AS base_enquiry_id,
    e2.id AS similar_enquiry_id,
    e2.created_at AS similar_created_at,
    e2.enq_type,
    e2.closed_status,
    e2.is_workable
   FROM (public.v_enquiry_context e1
     JOIN public.enquiries e2 ON (((e2.enq_type = e1.enq_type) AND (e2.id <> e1.enquiry_id))))
  WHERE ((e1.is_test = false) AND (e2.is_test = false));


create or replace view "public"."v_team_activity_snapshot" as  SELECT u.id AS crm_user_id,
    u.full_name AS team_member,
    count(DISTINCT ca.contact_id) FILTER (WHERE (ca.status = 'ACTIVE'::text)) AS active_contacts,
    count(i.id) FILTER (WHERE (i.interaction_at >= date_trunc('day'::text, now()))) AS interactions_today,
    count(DISTINCT ca.contact_id) FILTER (WHERE ((li.last_interaction_at < (now() - '14 days'::interval)) OR (li.last_interaction_at IS NULL))) AS stale_contacts
   FROM (((public.crm_users u
     LEFT JOIN public.contact_assignments ca ON (((ca.assigned_to = u.auth_user_id) AND (ca.status = 'ACTIVE'::text))))
     LEFT JOIN public.v_contacts_last_interaction li ON ((li.contact_id = ca.contact_id)))
     LEFT JOIN public.interactions__legacy i ON (((i.contact_id = ca.contact_id) AND (i.created_by = u.id))))
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
    count(DISTINCT
        CASE
            WHEN (i.interaction_at >= CURRENT_DATE) THEN i.id
            ELSE NULL::uuid
        END) AS interactions_today,
    count(DISTINCT
        CASE
            WHEN ((i.interaction_at >= CURRENT_DATE) AND (i.interaction_type = 'CALL'::text)) THEN i.id
            ELSE NULL::uuid
        END) AS calls_today,
    count(DISTINCT
        CASE
            WHEN ((i.interaction_at >= CURRENT_DATE) AND (i.interaction_type = 'EMAIL'::text)) THEN i.id
            ELSE NULL::uuid
        END) AS emails_today,
    count(DISTINCT
        CASE
            WHEN (i.interaction_at >= date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone)) THEN i.id
            ELSE NULL::uuid
        END) AS interactions_this_week,
    count(DISTINCT
        CASE
            WHEN (i.interaction_at >= date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) THEN i.id
            ELSE NULL::uuid
        END) AS interactions_this_month,
    count(DISTINCT i.id) AS interactions_total,
    count(DISTINCT
        CASE
            WHEN (i.interaction_at >= CURRENT_DATE) THEN i.contact_id
            ELSE NULL::uuid
        END) AS contacts_touched_today,
    count(DISTINCT i.contact_id) AS contacts_touched_total,
    count(DISTINCT
        CASE
            WHEN (i.outcome = ANY (ARRAY['POSITIVE'::text, 'INTERESTED'::text, 'MEETING_SCHEDULED'::text])) THEN i.id
            ELSE NULL::uuid
        END) AS positive_interactions,
    count(DISTINCT
        CASE
            WHEN (i.outcome = ANY (ARRAY['NEGATIVE'::text, 'NOT_INTERESTED'::text])) THEN i.id
            ELSE NULL::uuid
        END) AS negative_interactions,
    count(DISTINCT
        CASE
            WHEN (i.outcome = ANY (ARRAY['NO_RESPONSE'::text, 'NO_ANSWER'::text])) THEN i.id
            ELSE NULL::uuid
        END) AS no_response_interactions,
    round(avg(i.duration_minutes) FILTER (WHERE ((i.interaction_type = 'CALL'::text) AND (i.duration_minutes IS NOT NULL))), 1) AS avg_call_duration_minutes,
    max(i.interaction_at) AS last_interaction_at
   FROM (public.crm_users cu
     LEFT JOIN public.interactions__legacy i ON ((i.created_by = cu.id)))
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


CREATE OR REPLACE FUNCTION public.validate_emails(emails_csv text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_emails TEXT[];
  v_email TEXT;
  v_valid_emails JSONB := '[]'::jsonb;
  v_invalid_emails JSONB := '[]'::jsonb;
BEGIN
  -- Split comma-separated emails
  v_emails := string_to_array(emails_csv, ',');
  
  FOREACH v_email IN ARRAY v_emails LOOP
    v_email := trim(v_email);
    
    -- Basic email validation (contains @ and .)
    IF v_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      v_valid_emails := v_valid_emails || to_jsonb(v_email);
    ELSE
      v_invalid_emails := v_invalid_emails || to_jsonb(v_email);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'valid', v_valid_emails,
    'invalid', v_invalid_emails
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_import_batch(p_batch_id uuid)
 RETURNS TABLE(total_rows bigint, valid_rows bigint, failed_rows bigint, duplicate_rows bigint)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  staging_row record;
begin
  -- Validate rows that are not already finalized
  for staging_row in
    select id
    from public.contact_import_staging
    where batch_id = p_batch_id
      and coalesce(status, '') not in ('VALIDATED','FAILED','DUPLICATE')
  loop
    perform public.validate_import_row(staging_row.id);
  end loop;

  return query
  select
    count(*)::bigint,
    count(*) filter (where status = 'VALIDATED')::bigint,
    count(*) filter (where status = 'FAILED')::bigint,
    count(*) filter (where status = 'DUPLICATE')::bigint
  from public.contact_import_staging
  where batch_id = p_batch_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_import_row(staging_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  row_data record;
  errors jsonb := '[]'::jsonb;

  v_clean_email text;

  dup_contact_id uuid := null;
  dup_match_type text := null;
  dup_match_score numeric := null;
  dup_contact_info jsonb := null;
begin
  select * into row_data
  from public.contact_import_staging
  where id = staging_id;

  if not found then
    return jsonb_build_object('error', 'Row not found');
  end if;

  -- ✅ sanitize company_name (removes BOM/NBSP/hidden whitespace) and write back
  update public.contact_import_staging
  set company_name = nullif(
    btrim(
      regexp_replace(
        replace(replace(replace(coalesce(company_name,''), chr(65279), ''), chr(160), ' '), chr(8239), ' '),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  )
  where id = staging_id;

  -- reload row after sanitize
  select * into row_data
  from public.contact_import_staging
  where id = staging_id;

  -- 🔒 Require CRM user
  if row_data.imported_by_crm_user_id is null then
    errors := errors || jsonb_build_array(
      jsonb_build_object('field','imported_by_crm_user_id','message','CRM user is required for import')
    );
  end if;

  -- Full name required
  if row_data.full_name is null or btrim(row_data.full_name) = '' then
    errors := errors || jsonb_build_array(
      jsonb_build_object('field','full_name','message','Full name is required')
    );
  end if;

  -- ✅ Email clean + validate + write back (prevents hidden char failures)
  v_clean_email :=
    nullif(
      btrim(
        regexp_replace(
          replace(replace(replace(lower(coalesce(row_data.email,'')), chr(65279), ''), chr(160), ''), chr(8239), ''),
          '[^a-z0-9@._%+\-]+',
          '',
          'g'
        )
      ),
      ''
    );

  if v_clean_email is not null then
    if v_clean_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' then
      errors := errors || jsonb_build_array(
        jsonb_build_object('field','email','message','Invalid email format')
      );
    end if;
  end if;

  -- write cleaned email back (optional but recommended)
  if coalesce(row_data.email,'') <> coalesce(v_clean_email,'') then
    update public.contact_import_staging
    set email = v_clean_email
    where id = staging_id;
  end if;

  -- ✅ remove strict phone rule (no 8-digit hard stop). Keep only light sanitation if you want.
  -- (You asked: remove constraint "phone must have at least 8 digits")

  -- Duplicate check (use cleaned email)
  select d.contact_id, d.match_type, d.match_score, d.contact_info
    into dup_contact_id, dup_match_type, dup_match_score, dup_contact_info
  from public.check_contact_duplicate(row_data.full_name, row_data.phone, v_clean_email) d
  limit 1;

  if dup_contact_id is not null then
    update public.contact_import_staging
    set status = 'DUPLICATE',
        duplicate_contact_id = dup_contact_id,
        validation_errors = errors
    where id = staging_id;
  else
    update public.contact_import_staging
    set status = case when jsonb_array_length(errors) = 0 then 'VALIDATED' else 'FAILED' end,
        validation_errors = errors
    where id = staging_id;
  end if;

  return jsonb_build_object(
    'valid', (jsonb_array_length(errors) = 0 and dup_contact_id is null),
    'errors', errors,
    'duplicate', (dup_contact_id is not null)
  );
end;
$function$
;

create or replace view "public"."vessel_compliance_summary" as  WITH per_vessel AS (
         SELECT v.id AS vessel_id,
            v.vessel_name,
            v.imo,
            max(
                CASE
                    WHEN (ss.code = 'UN'::text) THEN (vs.status)::text
                    ELSE NULL::text
                END) AS un_status,
            max(
                CASE
                    WHEN (ss.code = 'OFAC'::text) THEN (vs.status)::text
                    ELSE NULL::text
                END) AS ofac_status,
            max(
                CASE
                    WHEN (ss.code = 'EU'::text) THEN (vs.status)::text
                    ELSE NULL::text
                END) AS eu_status,
            max(
                CASE
                    WHEN (ss.code = 'UK'::text) THEN (vs.status)::text
                    ELSE NULL::text
                END) AS uk_status
           FROM ((public.vessels v
             LEFT JOIN public.vessel_sanctions vs ON ((vs.vessel_id = v.id)))
             LEFT JOIN public.sanctions_sources ss ON ((ss.id = vs.source_id)))
          GROUP BY v.id, v.vessel_name, v.imo
        )
 SELECT vessel_id,
    vessel_name,
    imo,
    un_status,
    ofac_status,
    eu_status,
    uk_status,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM public.vessel_sanctions x
              WHERE ((x.vessel_id = p.vessel_id) AND (x.status = 'Sanctioned'::public.sanction_status_enum)))) THEN 'Sanctioned'::text
            WHEN (EXISTS ( SELECT 1
               FROM public.vessel_sanctions x
              WHERE ((x.vessel_id = p.vessel_id) AND (x.status = 'PotentialMatch'::public.sanction_status_enum)))) THEN 'PotentialMatch'::text
            WHEN ((EXISTS ( SELECT 1
               FROM public.vessel_sanctions x
              WHERE ((x.vessel_id = p.vessel_id) AND (x.status = 'Clear'::public.sanction_status_enum)))) AND (NOT (EXISTS ( SELECT 1
               FROM public.vessel_sanctions x
              WHERE ((x.vessel_id = p.vessel_id) AND (x.status = 'Unknown'::public.sanction_status_enum)))))) THEN 'Clear'::text
            ELSE 'Unknown'::text
        END AS overall_status
   FROM per_vessel p;


create or replace view "public"."v_contact_penalties" as  SELECT contact_id,
    enq_type,
    (count(*) FILTER (WHERE ((is_workable = false) AND (response_at >= (now() - '90 days'::interval)))) * 15) AS penalty_points
   FROM public.v_enquiry_response_weighted
  GROUP BY contact_id, enq_type;


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
  WHERE ((ca.assigned_to = auth.uid()) AND (ca.status = 'ACTIVE'::text));


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


grant delete on table "public"."activities" to "anon";

grant insert on table "public"."activities" to "anon";

grant references on table "public"."activities" to "anon";

grant select on table "public"."activities" to "anon";

grant trigger on table "public"."activities" to "anon";

grant truncate on table "public"."activities" to "anon";

grant update on table "public"."activities" to "anon";

grant delete on table "public"."activities" to "authenticated";

grant insert on table "public"."activities" to "authenticated";

grant references on table "public"."activities" to "authenticated";

grant select on table "public"."activities" to "authenticated";

grant trigger on table "public"."activities" to "authenticated";

grant truncate on table "public"."activities" to "authenticated";

grant update on table "public"."activities" to "authenticated";

grant delete on table "public"."activities" to "service_role";

grant insert on table "public"."activities" to "service_role";

grant references on table "public"."activities" to "service_role";

grant select on table "public"."activities" to "service_role";

grant trigger on table "public"."activities" to "service_role";

grant truncate on table "public"."activities" to "service_role";

grant update on table "public"."activities" to "service_role";

grant delete on table "public"."activity_log" to "anon";

grant insert on table "public"."activity_log" to "anon";

grant references on table "public"."activity_log" to "anon";

grant select on table "public"."activity_log" to "anon";

grant trigger on table "public"."activity_log" to "anon";

grant truncate on table "public"."activity_log" to "anon";

grant update on table "public"."activity_log" to "anon";

grant delete on table "public"."activity_log" to "authenticated";

grant insert on table "public"."activity_log" to "authenticated";

grant references on table "public"."activity_log" to "authenticated";

grant select on table "public"."activity_log" to "authenticated";

grant trigger on table "public"."activity_log" to "authenticated";

grant truncate on table "public"."activity_log" to "authenticated";

grant update on table "public"."activity_log" to "authenticated";

grant delete on table "public"."activity_log" to "service_role";

grant insert on table "public"."activity_log" to "service_role";

grant references on table "public"."activity_log" to "service_role";

grant select on table "public"."activity_log" to "service_role";

grant trigger on table "public"."activity_log" to "service_role";

grant truncate on table "public"."activity_log" to "service_role";

grant update on table "public"."activity_log" to "service_role";

grant delete on table "public"."app_notifications" to "anon";

grant insert on table "public"."app_notifications" to "anon";

grant references on table "public"."app_notifications" to "anon";

grant select on table "public"."app_notifications" to "anon";

grant trigger on table "public"."app_notifications" to "anon";

grant truncate on table "public"."app_notifications" to "anon";

grant update on table "public"."app_notifications" to "anon";

grant delete on table "public"."app_notifications" to "authenticated";

grant insert on table "public"."app_notifications" to "authenticated";

grant references on table "public"."app_notifications" to "authenticated";

grant select on table "public"."app_notifications" to "authenticated";

grant trigger on table "public"."app_notifications" to "authenticated";

grant truncate on table "public"."app_notifications" to "authenticated";

grant update on table "public"."app_notifications" to "authenticated";

grant delete on table "public"."app_notifications" to "service_role";

grant insert on table "public"."app_notifications" to "service_role";

grant references on table "public"."app_notifications" to "service_role";

grant select on table "public"."app_notifications" to "service_role";

grant trigger on table "public"."app_notifications" to "service_role";

grant truncate on table "public"."app_notifications" to "service_role";

grant update on table "public"."app_notifications" to "service_role";

grant delete on table "public"."companies" to "anon";

grant insert on table "public"."companies" to "anon";

grant references on table "public"."companies" to "anon";

grant select on table "public"."companies" to "anon";

grant trigger on table "public"."companies" to "anon";

grant truncate on table "public"."companies" to "anon";

grant update on table "public"."companies" to "anon";

grant delete on table "public"."companies" to "authenticated";

grant insert on table "public"."companies" to "authenticated";

grant references on table "public"."companies" to "authenticated";

grant select on table "public"."companies" to "authenticated";

grant trigger on table "public"."companies" to "authenticated";

grant truncate on table "public"."companies" to "authenticated";

grant update on table "public"."companies" to "authenticated";

grant delete on table "public"."companies" to "service_role";

grant insert on table "public"."companies" to "service_role";

grant references on table "public"."companies" to "service_role";

grant select on table "public"."companies" to "service_role";

grant trigger on table "public"."companies" to "service_role";

grant truncate on table "public"."companies" to "service_role";

grant update on table "public"."companies" to "service_role";

grant delete on table "public"."companies_stage" to "anon";

grant insert on table "public"."companies_stage" to "anon";

grant references on table "public"."companies_stage" to "anon";

grant select on table "public"."companies_stage" to "anon";

grant trigger on table "public"."companies_stage" to "anon";

grant truncate on table "public"."companies_stage" to "anon";

grant update on table "public"."companies_stage" to "anon";

grant delete on table "public"."companies_stage" to "authenticated";

grant insert on table "public"."companies_stage" to "authenticated";

grant references on table "public"."companies_stage" to "authenticated";

grant select on table "public"."companies_stage" to "authenticated";

grant trigger on table "public"."companies_stage" to "authenticated";

grant truncate on table "public"."companies_stage" to "authenticated";

grant update on table "public"."companies_stage" to "authenticated";

grant delete on table "public"."companies_stage" to "service_role";

grant insert on table "public"."companies_stage" to "service_role";

grant references on table "public"."companies_stage" to "service_role";

grant select on table "public"."companies_stage" to "service_role";

grant trigger on table "public"."companies_stage" to "service_role";

grant truncate on table "public"."companies_stage" to "service_role";

grant update on table "public"."companies_stage" to "service_role";

grant delete on table "public"."company_assignments" to "anon";

grant insert on table "public"."company_assignments" to "anon";

grant references on table "public"."company_assignments" to "anon";

grant select on table "public"."company_assignments" to "anon";

grant trigger on table "public"."company_assignments" to "anon";

grant truncate on table "public"."company_assignments" to "anon";

grant update on table "public"."company_assignments" to "anon";

grant delete on table "public"."company_assignments" to "authenticated";

grant insert on table "public"."company_assignments" to "authenticated";

grant references on table "public"."company_assignments" to "authenticated";

grant select on table "public"."company_assignments" to "authenticated";

grant trigger on table "public"."company_assignments" to "authenticated";

grant truncate on table "public"."company_assignments" to "authenticated";

grant update on table "public"."company_assignments" to "authenticated";

grant delete on table "public"."company_assignments" to "service_role";

grant insert on table "public"."company_assignments" to "service_role";

grant references on table "public"."company_assignments" to "service_role";

grant select on table "public"."company_assignments" to "service_role";

grant trigger on table "public"."company_assignments" to "service_role";

grant truncate on table "public"."company_assignments" to "service_role";

grant update on table "public"."company_assignments" to "service_role";

grant delete on table "public"."company_followups" to "anon";

grant insert on table "public"."company_followups" to "anon";

grant references on table "public"."company_followups" to "anon";

grant select on table "public"."company_followups" to "anon";

grant trigger on table "public"."company_followups" to "anon";

grant truncate on table "public"."company_followups" to "anon";

grant update on table "public"."company_followups" to "anon";

grant delete on table "public"."company_followups" to "authenticated";

grant insert on table "public"."company_followups" to "authenticated";

grant references on table "public"."company_followups" to "authenticated";

grant select on table "public"."company_followups" to "authenticated";

grant trigger on table "public"."company_followups" to "authenticated";

grant truncate on table "public"."company_followups" to "authenticated";

grant update on table "public"."company_followups" to "authenticated";

grant delete on table "public"."company_followups" to "service_role";

grant insert on table "public"."company_followups" to "service_role";

grant references on table "public"."company_followups" to "service_role";

grant select on table "public"."company_followups" to "service_role";

grant trigger on table "public"."company_followups" to "service_role";

grant truncate on table "public"."company_followups" to "service_role";

grant update on table "public"."company_followups" to "service_role";

grant delete on table "public"."contact_assignment_audit" to "anon";

grant insert on table "public"."contact_assignment_audit" to "anon";

grant references on table "public"."contact_assignment_audit" to "anon";

grant select on table "public"."contact_assignment_audit" to "anon";

grant trigger on table "public"."contact_assignment_audit" to "anon";

grant truncate on table "public"."contact_assignment_audit" to "anon";

grant update on table "public"."contact_assignment_audit" to "anon";

grant delete on table "public"."contact_assignment_audit" to "authenticated";

grant insert on table "public"."contact_assignment_audit" to "authenticated";

grant references on table "public"."contact_assignment_audit" to "authenticated";

grant select on table "public"."contact_assignment_audit" to "authenticated";

grant trigger on table "public"."contact_assignment_audit" to "authenticated";

grant truncate on table "public"."contact_assignment_audit" to "authenticated";

grant update on table "public"."contact_assignment_audit" to "authenticated";

grant delete on table "public"."contact_assignment_audit" to "service_role";

grant insert on table "public"."contact_assignment_audit" to "service_role";

grant references on table "public"."contact_assignment_audit" to "service_role";

grant select on table "public"."contact_assignment_audit" to "service_role";

grant trigger on table "public"."contact_assignment_audit" to "service_role";

grant truncate on table "public"."contact_assignment_audit" to "service_role";

grant update on table "public"."contact_assignment_audit" to "service_role";

grant delete on table "public"."contact_assignments" to "anon";

grant insert on table "public"."contact_assignments" to "anon";

grant references on table "public"."contact_assignments" to "anon";

grant select on table "public"."contact_assignments" to "anon";

grant trigger on table "public"."contact_assignments" to "anon";

grant truncate on table "public"."contact_assignments" to "anon";

grant update on table "public"."contact_assignments" to "anon";

grant delete on table "public"."contact_assignments" to "authenticated";

grant insert on table "public"."contact_assignments" to "authenticated";

grant references on table "public"."contact_assignments" to "authenticated";

grant select on table "public"."contact_assignments" to "authenticated";

grant trigger on table "public"."contact_assignments" to "authenticated";

grant truncate on table "public"."contact_assignments" to "authenticated";

grant update on table "public"."contact_assignments" to "authenticated";

grant delete on table "public"."contact_assignments" to "service_role";

grant insert on table "public"."contact_assignments" to "service_role";

grant references on table "public"."contact_assignments" to "service_role";

grant select on table "public"."contact_assignments" to "service_role";

grant trigger on table "public"."contact_assignments" to "service_role";

grant truncate on table "public"."contact_assignments" to "service_role";

grant update on table "public"."contact_assignments" to "service_role";

grant delete on table "public"."contact_company_map_stage" to "anon";

grant insert on table "public"."contact_company_map_stage" to "anon";

grant references on table "public"."contact_company_map_stage" to "anon";

grant select on table "public"."contact_company_map_stage" to "anon";

grant trigger on table "public"."contact_company_map_stage" to "anon";

grant truncate on table "public"."contact_company_map_stage" to "anon";

grant update on table "public"."contact_company_map_stage" to "anon";

grant delete on table "public"."contact_company_map_stage" to "authenticated";

grant insert on table "public"."contact_company_map_stage" to "authenticated";

grant references on table "public"."contact_company_map_stage" to "authenticated";

grant select on table "public"."contact_company_map_stage" to "authenticated";

grant trigger on table "public"."contact_company_map_stage" to "authenticated";

grant truncate on table "public"."contact_company_map_stage" to "authenticated";

grant update on table "public"."contact_company_map_stage" to "authenticated";

grant delete on table "public"."contact_company_map_stage" to "service_role";

grant insert on table "public"."contact_company_map_stage" to "service_role";

grant references on table "public"."contact_company_map_stage" to "service_role";

grant select on table "public"."contact_company_map_stage" to "service_role";

grant trigger on table "public"."contact_company_map_stage" to "service_role";

grant truncate on table "public"."contact_company_map_stage" to "service_role";

grant update on table "public"."contact_company_map_stage" to "service_role";

grant delete on table "public"."contact_followups" to "anon";

grant insert on table "public"."contact_followups" to "anon";

grant references on table "public"."contact_followups" to "anon";

grant select on table "public"."contact_followups" to "anon";

grant trigger on table "public"."contact_followups" to "anon";

grant truncate on table "public"."contact_followups" to "anon";

grant update on table "public"."contact_followups" to "anon";

grant delete on table "public"."contact_followups" to "authenticated";

grant insert on table "public"."contact_followups" to "authenticated";

grant references on table "public"."contact_followups" to "authenticated";

grant select on table "public"."contact_followups" to "authenticated";

grant trigger on table "public"."contact_followups" to "authenticated";

grant truncate on table "public"."contact_followups" to "authenticated";

grant update on table "public"."contact_followups" to "authenticated";

grant delete on table "public"."contact_followups" to "service_role";

grant insert on table "public"."contact_followups" to "service_role";

grant references on table "public"."contact_followups" to "service_role";

grant select on table "public"."contact_followups" to "service_role";

grant trigger on table "public"."contact_followups" to "service_role";

grant truncate on table "public"."contact_followups" to "service_role";

grant update on table "public"."contact_followups" to "service_role";

grant delete on table "public"."contact_import_staging" to "anon";

grant insert on table "public"."contact_import_staging" to "anon";

grant references on table "public"."contact_import_staging" to "anon";

grant select on table "public"."contact_import_staging" to "anon";

grant trigger on table "public"."contact_import_staging" to "anon";

grant truncate on table "public"."contact_import_staging" to "anon";

grant update on table "public"."contact_import_staging" to "anon";

grant delete on table "public"."contact_import_staging" to "authenticated";

grant insert on table "public"."contact_import_staging" to "authenticated";

grant references on table "public"."contact_import_staging" to "authenticated";

grant select on table "public"."contact_import_staging" to "authenticated";

grant trigger on table "public"."contact_import_staging" to "authenticated";

grant truncate on table "public"."contact_import_staging" to "authenticated";

grant update on table "public"."contact_import_staging" to "authenticated";

grant delete on table "public"."contact_import_staging" to "service_role";

grant insert on table "public"."contact_import_staging" to "service_role";

grant references on table "public"."contact_import_staging" to "service_role";

grant select on table "public"."contact_import_staging" to "service_role";

grant trigger on table "public"."contact_import_staging" to "service_role";

grant truncate on table "public"."contact_import_staging" to "service_role";

grant update on table "public"."contact_import_staging" to "service_role";

grant delete on table "public"."contact_interactions" to "anon";

grant insert on table "public"."contact_interactions" to "anon";

grant references on table "public"."contact_interactions" to "anon";

grant select on table "public"."contact_interactions" to "anon";

grant trigger on table "public"."contact_interactions" to "anon";

grant truncate on table "public"."contact_interactions" to "anon";

grant update on table "public"."contact_interactions" to "anon";

grant delete on table "public"."contact_interactions" to "authenticated";

grant insert on table "public"."contact_interactions" to "authenticated";

grant references on table "public"."contact_interactions" to "authenticated";

grant select on table "public"."contact_interactions" to "authenticated";

grant trigger on table "public"."contact_interactions" to "authenticated";

grant truncate on table "public"."contact_interactions" to "authenticated";

grant update on table "public"."contact_interactions" to "authenticated";

grant delete on table "public"."contact_interactions" to "service_role";

grant insert on table "public"."contact_interactions" to "service_role";

grant references on table "public"."contact_interactions" to "service_role";

grant select on table "public"."contact_interactions" to "service_role";

grant trigger on table "public"."contact_interactions" to "service_role";

grant truncate on table "public"."contact_interactions" to "service_role";

grant update on table "public"."contact_interactions" to "service_role";

grant delete on table "public"."contact_phones" to "anon";

grant insert on table "public"."contact_phones" to "anon";

grant references on table "public"."contact_phones" to "anon";

grant select on table "public"."contact_phones" to "anon";

grant trigger on table "public"."contact_phones" to "anon";

grant truncate on table "public"."contact_phones" to "anon";

grant update on table "public"."contact_phones" to "anon";

grant delete on table "public"."contact_phones" to "authenticated";

grant insert on table "public"."contact_phones" to "authenticated";

grant references on table "public"."contact_phones" to "authenticated";

grant select on table "public"."contact_phones" to "authenticated";

grant trigger on table "public"."contact_phones" to "authenticated";

grant truncate on table "public"."contact_phones" to "authenticated";

grant update on table "public"."contact_phones" to "authenticated";

grant delete on table "public"."contact_phones" to "service_role";

grant insert on table "public"."contact_phones" to "service_role";

grant references on table "public"."contact_phones" to "service_role";

grant select on table "public"."contact_phones" to "service_role";

grant trigger on table "public"."contact_phones" to "service_role";

grant truncate on table "public"."contact_phones" to "service_role";

grant update on table "public"."contact_phones" to "service_role";

grant delete on table "public"."contact_private_details" to "anon";

grant insert on table "public"."contact_private_details" to "anon";

grant references on table "public"."contact_private_details" to "anon";

grant select on table "public"."contact_private_details" to "anon";

grant trigger on table "public"."contact_private_details" to "anon";

grant truncate on table "public"."contact_private_details" to "anon";

grant update on table "public"."contact_private_details" to "anon";

grant delete on table "public"."contact_private_details" to "authenticated";

grant insert on table "public"."contact_private_details" to "authenticated";

grant references on table "public"."contact_private_details" to "authenticated";

grant select on table "public"."contact_private_details" to "authenticated";

grant trigger on table "public"."contact_private_details" to "authenticated";

grant truncate on table "public"."contact_private_details" to "authenticated";

grant update on table "public"."contact_private_details" to "authenticated";

grant delete on table "public"."contact_private_details" to "service_role";

grant insert on table "public"."contact_private_details" to "service_role";

grant references on table "public"."contact_private_details" to "service_role";

grant select on table "public"."contact_private_details" to "service_role";

grant trigger on table "public"."contact_private_details" to "service_role";

grant truncate on table "public"."contact_private_details" to "service_role";

grant update on table "public"."contact_private_details" to "service_role";

grant delete on table "public"."contact_stage_events" to "anon";

grant insert on table "public"."contact_stage_events" to "anon";

grant references on table "public"."contact_stage_events" to "anon";

grant select on table "public"."contact_stage_events" to "anon";

grant trigger on table "public"."contact_stage_events" to "anon";

grant truncate on table "public"."contact_stage_events" to "anon";

grant update on table "public"."contact_stage_events" to "anon";

grant delete on table "public"."contact_stage_events" to "authenticated";

grant insert on table "public"."contact_stage_events" to "authenticated";

grant references on table "public"."contact_stage_events" to "authenticated";

grant select on table "public"."contact_stage_events" to "authenticated";

grant trigger on table "public"."contact_stage_events" to "authenticated";

grant truncate on table "public"."contact_stage_events" to "authenticated";

grant update on table "public"."contact_stage_events" to "authenticated";

grant delete on table "public"."contact_stage_events" to "service_role";

grant insert on table "public"."contact_stage_events" to "service_role";

grant references on table "public"."contact_stage_events" to "service_role";

grant select on table "public"."contact_stage_events" to "service_role";

grant trigger on table "public"."contact_stage_events" to "service_role";

grant truncate on table "public"."contact_stage_events" to "service_role";

grant update on table "public"."contact_stage_events" to "service_role";

grant delete on table "public"."contact_stage_requests" to "anon";

grant insert on table "public"."contact_stage_requests" to "anon";

grant references on table "public"."contact_stage_requests" to "anon";

grant select on table "public"."contact_stage_requests" to "anon";

grant trigger on table "public"."contact_stage_requests" to "anon";

grant truncate on table "public"."contact_stage_requests" to "anon";

grant update on table "public"."contact_stage_requests" to "anon";

grant delete on table "public"."contact_stage_requests" to "authenticated";

grant insert on table "public"."contact_stage_requests" to "authenticated";

grant references on table "public"."contact_stage_requests" to "authenticated";

grant select on table "public"."contact_stage_requests" to "authenticated";

grant trigger on table "public"."contact_stage_requests" to "authenticated";

grant truncate on table "public"."contact_stage_requests" to "authenticated";

grant update on table "public"."contact_stage_requests" to "authenticated";

grant delete on table "public"."contact_stage_requests" to "service_role";

grant insert on table "public"."contact_stage_requests" to "service_role";

grant references on table "public"."contact_stage_requests" to "service_role";

grant select on table "public"."contact_stage_requests" to "service_role";

grant trigger on table "public"."contact_stage_requests" to "service_role";

grant truncate on table "public"."contact_stage_requests" to "service_role";

grant update on table "public"."contact_stage_requests" to "service_role";

grant delete on table "public"."contacts" to "anon";

grant insert on table "public"."contacts" to "anon";

grant references on table "public"."contacts" to "anon";

grant select on table "public"."contacts" to "anon";

grant trigger on table "public"."contacts" to "anon";

grant truncate on table "public"."contacts" to "anon";

grant update on table "public"."contacts" to "anon";

grant delete on table "public"."contacts" to "authenticated";

grant insert on table "public"."contacts" to "authenticated";

grant references on table "public"."contacts" to "authenticated";

grant select on table "public"."contacts" to "authenticated";

grant trigger on table "public"."contacts" to "authenticated";

grant truncate on table "public"."contacts" to "authenticated";

grant update on table "public"."contacts" to "authenticated";

grant delete on table "public"."contacts" to "service_role";

grant insert on table "public"."contacts" to "service_role";

grant references on table "public"."contacts" to "service_role";

grant select on table "public"."contacts" to "service_role";

grant trigger on table "public"."contacts" to "service_role";

grant truncate on table "public"."contacts" to "service_role";

grant update on table "public"."contacts" to "service_role";

grant delete on table "public"."contacts_stage" to "anon";

grant insert on table "public"."contacts_stage" to "anon";

grant references on table "public"."contacts_stage" to "anon";

grant select on table "public"."contacts_stage" to "anon";

grant trigger on table "public"."contacts_stage" to "anon";

grant truncate on table "public"."contacts_stage" to "anon";

grant update on table "public"."contacts_stage" to "anon";

grant delete on table "public"."contacts_stage" to "authenticated";

grant insert on table "public"."contacts_stage" to "authenticated";

grant references on table "public"."contacts_stage" to "authenticated";

grant select on table "public"."contacts_stage" to "authenticated";

grant trigger on table "public"."contacts_stage" to "authenticated";

grant truncate on table "public"."contacts_stage" to "authenticated";

grant update on table "public"."contacts_stage" to "authenticated";

grant delete on table "public"."contacts_stage" to "service_role";

grant insert on table "public"."contacts_stage" to "service_role";

grant references on table "public"."contacts_stage" to "service_role";

grant select on table "public"."contacts_stage" to "service_role";

grant trigger on table "public"."contacts_stage" to "service_role";

grant truncate on table "public"."contacts_stage" to "service_role";

grant update on table "public"."contacts_stage" to "service_role";

grant delete on table "public"."crm_users" to "anon";

grant insert on table "public"."crm_users" to "anon";

grant references on table "public"."crm_users" to "anon";

grant select on table "public"."crm_users" to "anon";

grant trigger on table "public"."crm_users" to "anon";

grant truncate on table "public"."crm_users" to "anon";

grant update on table "public"."crm_users" to "anon";

grant delete on table "public"."crm_users" to "authenticated";

grant insert on table "public"."crm_users" to "authenticated";

grant references on table "public"."crm_users" to "authenticated";

grant select on table "public"."crm_users" to "authenticated";

grant trigger on table "public"."crm_users" to "authenticated";

grant truncate on table "public"."crm_users" to "authenticated";

grant update on table "public"."crm_users" to "authenticated";

grant delete on table "public"."crm_users" to "service_role";

grant insert on table "public"."crm_users" to "service_role";

grant references on table "public"."crm_users" to "service_role";

grant select on table "public"."crm_users" to "service_role";

grant trigger on table "public"."crm_users" to "service_role";

grant truncate on table "public"."crm_users" to "service_role";

grant update on table "public"."crm_users" to "service_role";

grant delete on table "public"."enquiries" to "anon";

grant insert on table "public"."enquiries" to "anon";

grant references on table "public"."enquiries" to "anon";

grant select on table "public"."enquiries" to "anon";

grant trigger on table "public"."enquiries" to "anon";

grant truncate on table "public"."enquiries" to "anon";

grant update on table "public"."enquiries" to "anon";

grant delete on table "public"."enquiries" to "authenticated";

grant insert on table "public"."enquiries" to "authenticated";

grant references on table "public"."enquiries" to "authenticated";

grant select on table "public"."enquiries" to "authenticated";

grant trigger on table "public"."enquiries" to "authenticated";

grant truncate on table "public"."enquiries" to "authenticated";

grant update on table "public"."enquiries" to "authenticated";

grant delete on table "public"."enquiries" to "service_role";

grant insert on table "public"."enquiries" to "service_role";

grant references on table "public"."enquiries" to "service_role";

grant select on table "public"."enquiries" to "service_role";

grant trigger on table "public"."enquiries" to "service_role";

grant truncate on table "public"."enquiries" to "service_role";

grant update on table "public"."enquiries" to "service_role";

grant delete on table "public"."enquiry_activities" to "anon";

grant insert on table "public"."enquiry_activities" to "anon";

grant references on table "public"."enquiry_activities" to "anon";

grant select on table "public"."enquiry_activities" to "anon";

grant trigger on table "public"."enquiry_activities" to "anon";

grant truncate on table "public"."enquiry_activities" to "anon";

grant update on table "public"."enquiry_activities" to "anon";

grant delete on table "public"."enquiry_activities" to "authenticated";

grant insert on table "public"."enquiry_activities" to "authenticated";

grant references on table "public"."enquiry_activities" to "authenticated";

grant select on table "public"."enquiry_activities" to "authenticated";

grant trigger on table "public"."enquiry_activities" to "authenticated";

grant truncate on table "public"."enquiry_activities" to "authenticated";

grant update on table "public"."enquiry_activities" to "authenticated";

grant delete on table "public"."enquiry_activities" to "service_role";

grant insert on table "public"."enquiry_activities" to "service_role";

grant references on table "public"."enquiry_activities" to "service_role";

grant select on table "public"."enquiry_activities" to "service_role";

grant trigger on table "public"."enquiry_activities" to "service_role";

grant truncate on table "public"."enquiry_activities" to "service_role";

grant update on table "public"."enquiry_activities" to "service_role";

grant delete on table "public"."enquiry_feed" to "anon";

grant insert on table "public"."enquiry_feed" to "anon";

grant references on table "public"."enquiry_feed" to "anon";

grant select on table "public"."enquiry_feed" to "anon";

grant trigger on table "public"."enquiry_feed" to "anon";

grant truncate on table "public"."enquiry_feed" to "anon";

grant update on table "public"."enquiry_feed" to "anon";

grant delete on table "public"."enquiry_feed" to "authenticated";

grant insert on table "public"."enquiry_feed" to "authenticated";

grant references on table "public"."enquiry_feed" to "authenticated";

grant select on table "public"."enquiry_feed" to "authenticated";

grant trigger on table "public"."enquiry_feed" to "authenticated";

grant truncate on table "public"."enquiry_feed" to "authenticated";

grant update on table "public"."enquiry_feed" to "authenticated";

grant delete on table "public"."enquiry_feed" to "service_role";

grant insert on table "public"."enquiry_feed" to "service_role";

grant references on table "public"."enquiry_feed" to "service_role";

grant select on table "public"."enquiry_feed" to "service_role";

grant trigger on table "public"."enquiry_feed" to "service_role";

grant truncate on table "public"."enquiry_feed" to "service_role";

grant update on table "public"."enquiry_feed" to "service_role";

grant delete on table "public"."enquiry_participants" to "anon";

grant insert on table "public"."enquiry_participants" to "anon";

grant references on table "public"."enquiry_participants" to "anon";

grant select on table "public"."enquiry_participants" to "anon";

grant trigger on table "public"."enquiry_participants" to "anon";

grant truncate on table "public"."enquiry_participants" to "anon";

grant update on table "public"."enquiry_participants" to "anon";

grant delete on table "public"."enquiry_participants" to "authenticated";

grant insert on table "public"."enquiry_participants" to "authenticated";

grant references on table "public"."enquiry_participants" to "authenticated";

grant select on table "public"."enquiry_participants" to "authenticated";

grant trigger on table "public"."enquiry_participants" to "authenticated";

grant truncate on table "public"."enquiry_participants" to "authenticated";

grant update on table "public"."enquiry_participants" to "authenticated";

grant delete on table "public"."enquiry_participants" to "service_role";

grant insert on table "public"."enquiry_participants" to "service_role";

grant references on table "public"."enquiry_participants" to "service_role";

grant select on table "public"."enquiry_participants" to "service_role";

grant trigger on table "public"."enquiry_participants" to "service_role";

grant truncate on table "public"."enquiry_participants" to "service_role";

grant update on table "public"."enquiry_participants" to "service_role";

grant delete on table "public"."enquiry_quotes" to "anon";

grant insert on table "public"."enquiry_quotes" to "anon";

grant references on table "public"."enquiry_quotes" to "anon";

grant select on table "public"."enquiry_quotes" to "anon";

grant trigger on table "public"."enquiry_quotes" to "anon";

grant truncate on table "public"."enquiry_quotes" to "anon";

grant update on table "public"."enquiry_quotes" to "anon";

grant delete on table "public"."enquiry_quotes" to "authenticated";

grant insert on table "public"."enquiry_quotes" to "authenticated";

grant references on table "public"."enquiry_quotes" to "authenticated";

grant select on table "public"."enquiry_quotes" to "authenticated";

grant trigger on table "public"."enquiry_quotes" to "authenticated";

grant truncate on table "public"."enquiry_quotes" to "authenticated";

grant update on table "public"."enquiry_quotes" to "authenticated";

grant delete on table "public"."enquiry_quotes" to "service_role";

grant insert on table "public"."enquiry_quotes" to "service_role";

grant references on table "public"."enquiry_quotes" to "service_role";

grant select on table "public"."enquiry_quotes" to "service_role";

grant trigger on table "public"."enquiry_quotes" to "service_role";

grant truncate on table "public"."enquiry_quotes" to "service_role";

grant update on table "public"."enquiry_quotes" to "service_role";

grant delete on table "public"."enquiry_recipients" to "anon";

grant insert on table "public"."enquiry_recipients" to "anon";

grant references on table "public"."enquiry_recipients" to "anon";

grant select on table "public"."enquiry_recipients" to "anon";

grant trigger on table "public"."enquiry_recipients" to "anon";

grant truncate on table "public"."enquiry_recipients" to "anon";

grant update on table "public"."enquiry_recipients" to "anon";

grant delete on table "public"."enquiry_recipients" to "authenticated";

grant insert on table "public"."enquiry_recipients" to "authenticated";

grant references on table "public"."enquiry_recipients" to "authenticated";

grant select on table "public"."enquiry_recipients" to "authenticated";

grant trigger on table "public"."enquiry_recipients" to "authenticated";

grant truncate on table "public"."enquiry_recipients" to "authenticated";

grant update on table "public"."enquiry_recipients" to "authenticated";

grant delete on table "public"."enquiry_recipients" to "service_role";

grant insert on table "public"."enquiry_recipients" to "service_role";

grant references on table "public"."enquiry_recipients" to "service_role";

grant select on table "public"."enquiry_recipients" to "service_role";

grant trigger on table "public"."enquiry_recipients" to "service_role";

grant truncate on table "public"."enquiry_recipients" to "service_role";

grant update on table "public"."enquiry_recipients" to "service_role";

grant delete on table "public"."enquiry_responses" to "anon";

grant insert on table "public"."enquiry_responses" to "anon";

grant references on table "public"."enquiry_responses" to "anon";

grant select on table "public"."enquiry_responses" to "anon";

grant trigger on table "public"."enquiry_responses" to "anon";

grant truncate on table "public"."enquiry_responses" to "anon";

grant update on table "public"."enquiry_responses" to "anon";

grant delete on table "public"."enquiry_responses" to "authenticated";

grant insert on table "public"."enquiry_responses" to "authenticated";

grant references on table "public"."enquiry_responses" to "authenticated";

grant select on table "public"."enquiry_responses" to "authenticated";

grant trigger on table "public"."enquiry_responses" to "authenticated";

grant truncate on table "public"."enquiry_responses" to "authenticated";

grant update on table "public"."enquiry_responses" to "authenticated";

grant delete on table "public"."enquiry_responses" to "service_role";

grant insert on table "public"."enquiry_responses" to "service_role";

grant references on table "public"."enquiry_responses" to "service_role";

grant select on table "public"."enquiry_responses" to "service_role";

grant trigger on table "public"."enquiry_responses" to "service_role";

grant truncate on table "public"."enquiry_responses" to "service_role";

grant update on table "public"."enquiry_responses" to "service_role";

grant delete on table "public"."enquiry_shortlist" to "anon";

grant insert on table "public"."enquiry_shortlist" to "anon";

grant references on table "public"."enquiry_shortlist" to "anon";

grant select on table "public"."enquiry_shortlist" to "anon";

grant trigger on table "public"."enquiry_shortlist" to "anon";

grant truncate on table "public"."enquiry_shortlist" to "anon";

grant update on table "public"."enquiry_shortlist" to "anon";

grant delete on table "public"."enquiry_shortlist" to "authenticated";

grant insert on table "public"."enquiry_shortlist" to "authenticated";

grant references on table "public"."enquiry_shortlist" to "authenticated";

grant select on table "public"."enquiry_shortlist" to "authenticated";

grant trigger on table "public"."enquiry_shortlist" to "authenticated";

grant truncate on table "public"."enquiry_shortlist" to "authenticated";

grant update on table "public"."enquiry_shortlist" to "authenticated";

grant delete on table "public"."enquiry_shortlist" to "service_role";

grant insert on table "public"."enquiry_shortlist" to "service_role";

grant references on table "public"."enquiry_shortlist" to "service_role";

grant select on table "public"."enquiry_shortlist" to "service_role";

grant trigger on table "public"."enquiry_shortlist" to "service_role";

grant truncate on table "public"."enquiry_shortlist" to "service_role";

grant update on table "public"."enquiry_shortlist" to "service_role";

grant delete on table "public"."fixture_parties" to "anon";

grant insert on table "public"."fixture_parties" to "anon";

grant references on table "public"."fixture_parties" to "anon";

grant select on table "public"."fixture_parties" to "anon";

grant trigger on table "public"."fixture_parties" to "anon";

grant truncate on table "public"."fixture_parties" to "anon";

grant update on table "public"."fixture_parties" to "anon";

grant delete on table "public"."fixture_parties" to "authenticated";

grant insert on table "public"."fixture_parties" to "authenticated";

grant references on table "public"."fixture_parties" to "authenticated";

grant select on table "public"."fixture_parties" to "authenticated";

grant trigger on table "public"."fixture_parties" to "authenticated";

grant truncate on table "public"."fixture_parties" to "authenticated";

grant update on table "public"."fixture_parties" to "authenticated";

grant delete on table "public"."fixture_parties" to "service_role";

grant insert on table "public"."fixture_parties" to "service_role";

grant references on table "public"."fixture_parties" to "service_role";

grant select on table "public"."fixture_parties" to "service_role";

grant trigger on table "public"."fixture_parties" to "service_role";

grant truncate on table "public"."fixture_parties" to "service_role";

grant update on table "public"."fixture_parties" to "service_role";

grant delete on table "public"."fixtures" to "anon";

grant insert on table "public"."fixtures" to "anon";

grant references on table "public"."fixtures" to "anon";

grant select on table "public"."fixtures" to "anon";

grant trigger on table "public"."fixtures" to "anon";

grant truncate on table "public"."fixtures" to "anon";

grant update on table "public"."fixtures" to "anon";

grant delete on table "public"."fixtures" to "authenticated";

grant insert on table "public"."fixtures" to "authenticated";

grant references on table "public"."fixtures" to "authenticated";

grant select on table "public"."fixtures" to "authenticated";

grant trigger on table "public"."fixtures" to "authenticated";

grant truncate on table "public"."fixtures" to "authenticated";

grant update on table "public"."fixtures" to "authenticated";

grant delete on table "public"."fixtures" to "service_role";

grant insert on table "public"."fixtures" to "service_role";

grant references on table "public"."fixtures" to "service_role";

grant select on table "public"."fixtures" to "service_role";

grant trigger on table "public"."fixtures" to "service_role";

grant truncate on table "public"."fixtures" to "service_role";

grant update on table "public"."fixtures" to "service_role";

grant references on table "public"."follow_ups__legacy" to "anon";

grant select on table "public"."follow_ups__legacy" to "anon";

grant trigger on table "public"."follow_ups__legacy" to "anon";

grant truncate on table "public"."follow_ups__legacy" to "anon";

grant references on table "public"."follow_ups__legacy" to "authenticated";

grant select on table "public"."follow_ups__legacy" to "authenticated";

grant trigger on table "public"."follow_ups__legacy" to "authenticated";

grant truncate on table "public"."follow_ups__legacy" to "authenticated";

grant delete on table "public"."follow_ups__legacy" to "service_role";

grant insert on table "public"."follow_ups__legacy" to "service_role";

grant references on table "public"."follow_ups__legacy" to "service_role";

grant select on table "public"."follow_ups__legacy" to "service_role";

grant trigger on table "public"."follow_ups__legacy" to "service_role";

grant truncate on table "public"."follow_ups__legacy" to "service_role";

grant update on table "public"."follow_ups__legacy" to "service_role";

grant delete on table "public"."followup_notifications_log" to "anon";

grant insert on table "public"."followup_notifications_log" to "anon";

grant references on table "public"."followup_notifications_log" to "anon";

grant select on table "public"."followup_notifications_log" to "anon";

grant trigger on table "public"."followup_notifications_log" to "anon";

grant truncate on table "public"."followup_notifications_log" to "anon";

grant update on table "public"."followup_notifications_log" to "anon";

grant delete on table "public"."followup_notifications_log" to "authenticated";

grant insert on table "public"."followup_notifications_log" to "authenticated";

grant references on table "public"."followup_notifications_log" to "authenticated";

grant select on table "public"."followup_notifications_log" to "authenticated";

grant trigger on table "public"."followup_notifications_log" to "authenticated";

grant truncate on table "public"."followup_notifications_log" to "authenticated";

grant update on table "public"."followup_notifications_log" to "authenticated";

grant delete on table "public"."followup_notifications_log" to "service_role";

grant insert on table "public"."followup_notifications_log" to "service_role";

grant references on table "public"."followup_notifications_log" to "service_role";

grant select on table "public"."followup_notifications_log" to "service_role";

grant trigger on table "public"."followup_notifications_log" to "service_role";

grant truncate on table "public"."followup_notifications_log" to "service_role";

grant update on table "public"."followup_notifications_log" to "service_role";

grant delete on table "public"."import_batches" to "anon";

grant insert on table "public"."import_batches" to "anon";

grant references on table "public"."import_batches" to "anon";

grant select on table "public"."import_batches" to "anon";

grant trigger on table "public"."import_batches" to "anon";

grant truncate on table "public"."import_batches" to "anon";

grant update on table "public"."import_batches" to "anon";

grant delete on table "public"."import_batches" to "authenticated";

grant insert on table "public"."import_batches" to "authenticated";

grant references on table "public"."import_batches" to "authenticated";

grant select on table "public"."import_batches" to "authenticated";

grant trigger on table "public"."import_batches" to "authenticated";

grant truncate on table "public"."import_batches" to "authenticated";

grant update on table "public"."import_batches" to "authenticated";

grant delete on table "public"."import_batches" to "service_role";

grant insert on table "public"."import_batches" to "service_role";

grant references on table "public"."import_batches" to "service_role";

grant select on table "public"."import_batches" to "service_role";

grant trigger on table "public"."import_batches" to "service_role";

grant truncate on table "public"."import_batches" to "service_role";

grant update on table "public"."import_batches" to "service_role";

grant references on table "public"."interactions__legacy" to "anon";

grant select on table "public"."interactions__legacy" to "anon";

grant trigger on table "public"."interactions__legacy" to "anon";

grant truncate on table "public"."interactions__legacy" to "anon";

grant references on table "public"."interactions__legacy" to "authenticated";

grant select on table "public"."interactions__legacy" to "authenticated";

grant trigger on table "public"."interactions__legacy" to "authenticated";

grant truncate on table "public"."interactions__legacy" to "authenticated";

grant delete on table "public"."interactions__legacy" to "service_role";

grant insert on table "public"."interactions__legacy" to "service_role";

grant references on table "public"."interactions__legacy" to "service_role";

grant select on table "public"."interactions__legacy" to "service_role";

grant trigger on table "public"."interactions__legacy" to "service_role";

grant truncate on table "public"."interactions__legacy" to "service_role";

grant update on table "public"."interactions__legacy" to "service_role";

grant delete on table "public"."interactions_log" to "anon";

grant insert on table "public"."interactions_log" to "anon";

grant references on table "public"."interactions_log" to "anon";

grant select on table "public"."interactions_log" to "anon";

grant trigger on table "public"."interactions_log" to "anon";

grant truncate on table "public"."interactions_log" to "anon";

grant update on table "public"."interactions_log" to "anon";

grant delete on table "public"."interactions_log" to "authenticated";

grant insert on table "public"."interactions_log" to "authenticated";

grant references on table "public"."interactions_log" to "authenticated";

grant select on table "public"."interactions_log" to "authenticated";

grant trigger on table "public"."interactions_log" to "authenticated";

grant truncate on table "public"."interactions_log" to "authenticated";

grant update on table "public"."interactions_log" to "authenticated";

grant delete on table "public"."interactions_log" to "service_role";

grant insert on table "public"."interactions_log" to "service_role";

grant references on table "public"."interactions_log" to "service_role";

grant select on table "public"."interactions_log" to "service_role";

grant trigger on table "public"."interactions_log" to "service_role";

grant truncate on table "public"."interactions_log" to "service_role";

grant update on table "public"."interactions_log" to "service_role";

grant delete on table "public"."invoice_payments" to "anon";

grant insert on table "public"."invoice_payments" to "anon";

grant references on table "public"."invoice_payments" to "anon";

grant select on table "public"."invoice_payments" to "anon";

grant trigger on table "public"."invoice_payments" to "anon";

grant truncate on table "public"."invoice_payments" to "anon";

grant update on table "public"."invoice_payments" to "anon";

grant delete on table "public"."invoice_payments" to "authenticated";

grant insert on table "public"."invoice_payments" to "authenticated";

grant references on table "public"."invoice_payments" to "authenticated";

grant select on table "public"."invoice_payments" to "authenticated";

grant trigger on table "public"."invoice_payments" to "authenticated";

grant truncate on table "public"."invoice_payments" to "authenticated";

grant update on table "public"."invoice_payments" to "authenticated";

grant delete on table "public"."invoice_payments" to "service_role";

grant insert on table "public"."invoice_payments" to "service_role";

grant references on table "public"."invoice_payments" to "service_role";

grant select on table "public"."invoice_payments" to "service_role";

grant trigger on table "public"."invoice_payments" to "service_role";

grant truncate on table "public"."invoice_payments" to "service_role";

grant update on table "public"."invoice_payments" to "service_role";

grant delete on table "public"."invoices" to "anon";

grant insert on table "public"."invoices" to "anon";

grant references on table "public"."invoices" to "anon";

grant select on table "public"."invoices" to "anon";

grant trigger on table "public"."invoices" to "anon";

grant truncate on table "public"."invoices" to "anon";

grant update on table "public"."invoices" to "anon";

grant delete on table "public"."invoices" to "authenticated";

grant insert on table "public"."invoices" to "authenticated";

grant references on table "public"."invoices" to "authenticated";

grant select on table "public"."invoices" to "authenticated";

grant trigger on table "public"."invoices" to "authenticated";

grant truncate on table "public"."invoices" to "authenticated";

grant update on table "public"."invoices" to "authenticated";

grant delete on table "public"."invoices" to "service_role";

grant insert on table "public"."invoices" to "service_role";

grant references on table "public"."invoices" to "service_role";

grant select on table "public"."invoices" to "service_role";

grant trigger on table "public"."invoices" to "service_role";

grant truncate on table "public"."invoices" to "service_role";

grant update on table "public"."invoices" to "service_role";

grant delete on table "public"."leads" to "anon";

grant insert on table "public"."leads" to "anon";

grant references on table "public"."leads" to "anon";

grant select on table "public"."leads" to "anon";

grant trigger on table "public"."leads" to "anon";

grant truncate on table "public"."leads" to "anon";

grant update on table "public"."leads" to "anon";

grant delete on table "public"."leads" to "authenticated";

grant insert on table "public"."leads" to "authenticated";

grant references on table "public"."leads" to "authenticated";

grant select on table "public"."leads" to "authenticated";

grant trigger on table "public"."leads" to "authenticated";

grant truncate on table "public"."leads" to "authenticated";

grant update on table "public"."leads" to "authenticated";

grant delete on table "public"."leads" to "service_role";

grant insert on table "public"."leads" to "service_role";

grant references on table "public"."leads" to "service_role";

grant select on table "public"."leads" to "service_role";

grant trigger on table "public"."leads" to "service_role";

grant truncate on table "public"."leads" to "service_role";

grant update on table "public"."leads" to "service_role";

grant delete on table "public"."negotiation_log" to "anon";

grant insert on table "public"."negotiation_log" to "anon";

grant references on table "public"."negotiation_log" to "anon";

grant select on table "public"."negotiation_log" to "anon";

grant trigger on table "public"."negotiation_log" to "anon";

grant truncate on table "public"."negotiation_log" to "anon";

grant update on table "public"."negotiation_log" to "anon";

grant delete on table "public"."negotiation_log" to "authenticated";

grant insert on table "public"."negotiation_log" to "authenticated";

grant references on table "public"."negotiation_log" to "authenticated";

grant select on table "public"."negotiation_log" to "authenticated";

grant trigger on table "public"."negotiation_log" to "authenticated";

grant truncate on table "public"."negotiation_log" to "authenticated";

grant update on table "public"."negotiation_log" to "authenticated";

grant delete on table "public"."negotiation_log" to "service_role";

grant insert on table "public"."negotiation_log" to "service_role";

grant references on table "public"."negotiation_log" to "service_role";

grant select on table "public"."negotiation_log" to "service_role";

grant trigger on table "public"."negotiation_log" to "service_role";

grant truncate on table "public"."negotiation_log" to "service_role";

grant update on table "public"."negotiation_log" to "service_role";

grant delete on table "public"."notification_delivery_log" to "anon";

grant insert on table "public"."notification_delivery_log" to "anon";

grant references on table "public"."notification_delivery_log" to "anon";

grant select on table "public"."notification_delivery_log" to "anon";

grant trigger on table "public"."notification_delivery_log" to "anon";

grant truncate on table "public"."notification_delivery_log" to "anon";

grant update on table "public"."notification_delivery_log" to "anon";

grant delete on table "public"."notification_delivery_log" to "authenticated";

grant insert on table "public"."notification_delivery_log" to "authenticated";

grant references on table "public"."notification_delivery_log" to "authenticated";

grant select on table "public"."notification_delivery_log" to "authenticated";

grant trigger on table "public"."notification_delivery_log" to "authenticated";

grant truncate on table "public"."notification_delivery_log" to "authenticated";

grant update on table "public"."notification_delivery_log" to "authenticated";

grant delete on table "public"."notification_delivery_log" to "service_role";

grant insert on table "public"."notification_delivery_log" to "service_role";

grant references on table "public"."notification_delivery_log" to "service_role";

grant select on table "public"."notification_delivery_log" to "service_role";

grant trigger on table "public"."notification_delivery_log" to "service_role";

grant truncate on table "public"."notification_delivery_log" to "service_role";

grant update on table "public"."notification_delivery_log" to "service_role";

grant delete on table "public"."notification_delivery_queue" to "anon";

grant insert on table "public"."notification_delivery_queue" to "anon";

grant references on table "public"."notification_delivery_queue" to "anon";

grant select on table "public"."notification_delivery_queue" to "anon";

grant trigger on table "public"."notification_delivery_queue" to "anon";

grant truncate on table "public"."notification_delivery_queue" to "anon";

grant update on table "public"."notification_delivery_queue" to "anon";

grant delete on table "public"."notification_delivery_queue" to "authenticated";

grant insert on table "public"."notification_delivery_queue" to "authenticated";

grant references on table "public"."notification_delivery_queue" to "authenticated";

grant select on table "public"."notification_delivery_queue" to "authenticated";

grant trigger on table "public"."notification_delivery_queue" to "authenticated";

grant truncate on table "public"."notification_delivery_queue" to "authenticated";

grant update on table "public"."notification_delivery_queue" to "authenticated";

grant delete on table "public"."notification_delivery_queue" to "service_role";

grant insert on table "public"."notification_delivery_queue" to "service_role";

grant references on table "public"."notification_delivery_queue" to "service_role";

grant select on table "public"."notification_delivery_queue" to "service_role";

grant trigger on table "public"."notification_delivery_queue" to "service_role";

grant truncate on table "public"."notification_delivery_queue" to "service_role";

grant update on table "public"."notification_delivery_queue" to "service_role";

grant delete on table "public"."ops" to "anon";

grant insert on table "public"."ops" to "anon";

grant references on table "public"."ops" to "anon";

grant select on table "public"."ops" to "anon";

grant trigger on table "public"."ops" to "anon";

grant truncate on table "public"."ops" to "anon";

grant update on table "public"."ops" to "anon";

grant delete on table "public"."ops" to "authenticated";

grant insert on table "public"."ops" to "authenticated";

grant references on table "public"."ops" to "authenticated";

grant select on table "public"."ops" to "authenticated";

grant trigger on table "public"."ops" to "authenticated";

grant truncate on table "public"."ops" to "authenticated";

grant update on table "public"."ops" to "authenticated";

grant delete on table "public"."ops" to "service_role";

grant insert on table "public"."ops" to "service_role";

grant references on table "public"."ops" to "service_role";

grant select on table "public"."ops" to "service_role";

grant trigger on table "public"."ops" to "service_role";

grant truncate on table "public"."ops" to "service_role";

grant update on table "public"."ops" to "service_role";

grant delete on table "public"."options_shown" to "anon";

grant insert on table "public"."options_shown" to "anon";

grant references on table "public"."options_shown" to "anon";

grant select on table "public"."options_shown" to "anon";

grant trigger on table "public"."options_shown" to "anon";

grant truncate on table "public"."options_shown" to "anon";

grant update on table "public"."options_shown" to "anon";

grant delete on table "public"."options_shown" to "authenticated";

grant insert on table "public"."options_shown" to "authenticated";

grant references on table "public"."options_shown" to "authenticated";

grant select on table "public"."options_shown" to "authenticated";

grant trigger on table "public"."options_shown" to "authenticated";

grant truncate on table "public"."options_shown" to "authenticated";

grant update on table "public"."options_shown" to "authenticated";

grant delete on table "public"."options_shown" to "service_role";

grant insert on table "public"."options_shown" to "service_role";

grant references on table "public"."options_shown" to "service_role";

grant select on table "public"."options_shown" to "service_role";

grant trigger on table "public"."options_shown" to "service_role";

grant truncate on table "public"."options_shown" to "service_role";

grant update on table "public"."options_shown" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."recovery_log" to "anon";

grant insert on table "public"."recovery_log" to "anon";

grant references on table "public"."recovery_log" to "anon";

grant select on table "public"."recovery_log" to "anon";

grant trigger on table "public"."recovery_log" to "anon";

grant truncate on table "public"."recovery_log" to "anon";

grant update on table "public"."recovery_log" to "anon";

grant delete on table "public"."recovery_log" to "authenticated";

grant insert on table "public"."recovery_log" to "authenticated";

grant references on table "public"."recovery_log" to "authenticated";

grant select on table "public"."recovery_log" to "authenticated";

grant trigger on table "public"."recovery_log" to "authenticated";

grant truncate on table "public"."recovery_log" to "authenticated";

grant update on table "public"."recovery_log" to "authenticated";

grant delete on table "public"."recovery_log" to "service_role";

grant insert on table "public"."recovery_log" to "service_role";

grant references on table "public"."recovery_log" to "service_role";

grant select on table "public"."recovery_log" to "service_role";

grant trigger on table "public"."recovery_log" to "service_role";

grant truncate on table "public"."recovery_log" to "service_role";

grant update on table "public"."recovery_log" to "service_role";

grant delete on table "public"."sanctions_sources" to "anon";

grant insert on table "public"."sanctions_sources" to "anon";

grant references on table "public"."sanctions_sources" to "anon";

grant select on table "public"."sanctions_sources" to "anon";

grant trigger on table "public"."sanctions_sources" to "anon";

grant truncate on table "public"."sanctions_sources" to "anon";

grant update on table "public"."sanctions_sources" to "anon";

grant delete on table "public"."sanctions_sources" to "authenticated";

grant insert on table "public"."sanctions_sources" to "authenticated";

grant references on table "public"."sanctions_sources" to "authenticated";

grant select on table "public"."sanctions_sources" to "authenticated";

grant trigger on table "public"."sanctions_sources" to "authenticated";

grant truncate on table "public"."sanctions_sources" to "authenticated";

grant update on table "public"."sanctions_sources" to "authenticated";

grant delete on table "public"."sanctions_sources" to "service_role";

grant insert on table "public"."sanctions_sources" to "service_role";

grant references on table "public"."sanctions_sources" to "service_role";

grant select on table "public"."sanctions_sources" to "service_role";

grant trigger on table "public"."sanctions_sources" to "service_role";

grant truncate on table "public"."sanctions_sources" to "service_role";

grant update on table "public"."sanctions_sources" to "service_role";

grant delete on table "public"."task_comments" to "anon";

grant insert on table "public"."task_comments" to "anon";

grant references on table "public"."task_comments" to "anon";

grant select on table "public"."task_comments" to "anon";

grant trigger on table "public"."task_comments" to "anon";

grant truncate on table "public"."task_comments" to "anon";

grant update on table "public"."task_comments" to "anon";

grant delete on table "public"."task_comments" to "authenticated";

grant insert on table "public"."task_comments" to "authenticated";

grant references on table "public"."task_comments" to "authenticated";

grant select on table "public"."task_comments" to "authenticated";

grant trigger on table "public"."task_comments" to "authenticated";

grant truncate on table "public"."task_comments" to "authenticated";

grant update on table "public"."task_comments" to "authenticated";

grant delete on table "public"."task_comments" to "service_role";

grant insert on table "public"."task_comments" to "service_role";

grant references on table "public"."task_comments" to "service_role";

grant select on table "public"."task_comments" to "service_role";

grant trigger on table "public"."task_comments" to "service_role";

grant truncate on table "public"."task_comments" to "service_role";

grant update on table "public"."task_comments" to "service_role";

grant delete on table "public"."task_recipients" to "anon";

grant insert on table "public"."task_recipients" to "anon";

grant references on table "public"."task_recipients" to "anon";

grant select on table "public"."task_recipients" to "anon";

grant trigger on table "public"."task_recipients" to "anon";

grant truncate on table "public"."task_recipients" to "anon";

grant update on table "public"."task_recipients" to "anon";

grant delete on table "public"."task_recipients" to "authenticated";

grant insert on table "public"."task_recipients" to "authenticated";

grant references on table "public"."task_recipients" to "authenticated";

grant select on table "public"."task_recipients" to "authenticated";

grant trigger on table "public"."task_recipients" to "authenticated";

grant truncate on table "public"."task_recipients" to "authenticated";

grant update on table "public"."task_recipients" to "authenticated";

grant delete on table "public"."task_recipients" to "service_role";

grant insert on table "public"."task_recipients" to "service_role";

grant references on table "public"."task_recipients" to "service_role";

grant select on table "public"."task_recipients" to "service_role";

grant trigger on table "public"."task_recipients" to "service_role";

grant truncate on table "public"."task_recipients" to "service_role";

grant update on table "public"."task_recipients" to "service_role";

grant delete on table "public"."task_user_state" to "anon";

grant insert on table "public"."task_user_state" to "anon";

grant references on table "public"."task_user_state" to "anon";

grant select on table "public"."task_user_state" to "anon";

grant trigger on table "public"."task_user_state" to "anon";

grant truncate on table "public"."task_user_state" to "anon";

grant update on table "public"."task_user_state" to "anon";

grant delete on table "public"."task_user_state" to "authenticated";

grant insert on table "public"."task_user_state" to "authenticated";

grant references on table "public"."task_user_state" to "authenticated";

grant select on table "public"."task_user_state" to "authenticated";

grant trigger on table "public"."task_user_state" to "authenticated";

grant truncate on table "public"."task_user_state" to "authenticated";

grant update on table "public"."task_user_state" to "authenticated";

grant delete on table "public"."task_user_state" to "service_role";

grant insert on table "public"."task_user_state" to "service_role";

grant references on table "public"."task_user_state" to "service_role";

grant select on table "public"."task_user_state" to "service_role";

grant trigger on table "public"."task_user_state" to "service_role";

grant truncate on table "public"."task_user_state" to "service_role";

grant update on table "public"."task_user_state" to "service_role";

grant delete on table "public"."tasks" to "anon";

grant insert on table "public"."tasks" to "anon";

grant references on table "public"."tasks" to "anon";

grant select on table "public"."tasks" to "anon";

grant trigger on table "public"."tasks" to "anon";

grant truncate on table "public"."tasks" to "anon";

grant update on table "public"."tasks" to "anon";

grant delete on table "public"."tasks" to "authenticated";

grant insert on table "public"."tasks" to "authenticated";

grant references on table "public"."tasks" to "authenticated";

grant select on table "public"."tasks" to "authenticated";

grant trigger on table "public"."tasks" to "authenticated";

grant truncate on table "public"."tasks" to "authenticated";

grant update on table "public"."tasks" to "authenticated";

grant delete on table "public"."tasks" to "service_role";

grant insert on table "public"."tasks" to "service_role";

grant references on table "public"."tasks" to "service_role";

grant select on table "public"."tasks" to "service_role";

grant trigger on table "public"."tasks" to "service_role";

grant truncate on table "public"."tasks" to "service_role";

grant update on table "public"."tasks" to "service_role";

grant delete on table "public"."user_notepad" to "anon";

grant insert on table "public"."user_notepad" to "anon";

grant references on table "public"."user_notepad" to "anon";

grant select on table "public"."user_notepad" to "anon";

grant trigger on table "public"."user_notepad" to "anon";

grant truncate on table "public"."user_notepad" to "anon";

grant update on table "public"."user_notepad" to "anon";

grant delete on table "public"."user_notepad" to "authenticated";

grant insert on table "public"."user_notepad" to "authenticated";

grant references on table "public"."user_notepad" to "authenticated";

grant select on table "public"."user_notepad" to "authenticated";

grant trigger on table "public"."user_notepad" to "authenticated";

grant truncate on table "public"."user_notepad" to "authenticated";

grant update on table "public"."user_notepad" to "authenticated";

grant delete on table "public"."user_notepad" to "service_role";

grant insert on table "public"."user_notepad" to "service_role";

grant references on table "public"."user_notepad" to "service_role";

grant select on table "public"."user_notepad" to "service_role";

grant trigger on table "public"."user_notepad" to "service_role";

grant truncate on table "public"."user_notepad" to "service_role";

grant update on table "public"."user_notepad" to "service_role";

grant delete on table "public"."vessel_sanctions" to "anon";

grant insert on table "public"."vessel_sanctions" to "anon";

grant references on table "public"."vessel_sanctions" to "anon";

grant select on table "public"."vessel_sanctions" to "anon";

grant trigger on table "public"."vessel_sanctions" to "anon";

grant truncate on table "public"."vessel_sanctions" to "anon";

grant update on table "public"."vessel_sanctions" to "anon";

grant delete on table "public"."vessel_sanctions" to "authenticated";

grant insert on table "public"."vessel_sanctions" to "authenticated";

grant references on table "public"."vessel_sanctions" to "authenticated";

grant select on table "public"."vessel_sanctions" to "authenticated";

grant trigger on table "public"."vessel_sanctions" to "authenticated";

grant truncate on table "public"."vessel_sanctions" to "authenticated";

grant update on table "public"."vessel_sanctions" to "authenticated";

grant delete on table "public"."vessel_sanctions" to "service_role";

grant insert on table "public"."vessel_sanctions" to "service_role";

grant references on table "public"."vessel_sanctions" to "service_role";

grant select on table "public"."vessel_sanctions" to "service_role";

grant trigger on table "public"."vessel_sanctions" to "service_role";

grant truncate on table "public"."vessel_sanctions" to "service_role";

grant update on table "public"."vessel_sanctions" to "service_role";

grant delete on table "public"."vessel_sanctions_history" to "anon";

grant insert on table "public"."vessel_sanctions_history" to "anon";

grant references on table "public"."vessel_sanctions_history" to "anon";

grant select on table "public"."vessel_sanctions_history" to "anon";

grant trigger on table "public"."vessel_sanctions_history" to "anon";

grant truncate on table "public"."vessel_sanctions_history" to "anon";

grant update on table "public"."vessel_sanctions_history" to "anon";

grant delete on table "public"."vessel_sanctions_history" to "authenticated";

grant insert on table "public"."vessel_sanctions_history" to "authenticated";

grant references on table "public"."vessel_sanctions_history" to "authenticated";

grant select on table "public"."vessel_sanctions_history" to "authenticated";

grant trigger on table "public"."vessel_sanctions_history" to "authenticated";

grant truncate on table "public"."vessel_sanctions_history" to "authenticated";

grant update on table "public"."vessel_sanctions_history" to "authenticated";

grant delete on table "public"."vessel_sanctions_history" to "service_role";

grant insert on table "public"."vessel_sanctions_history" to "service_role";

grant references on table "public"."vessel_sanctions_history" to "service_role";

grant select on table "public"."vessel_sanctions_history" to "service_role";

grant trigger on table "public"."vessel_sanctions_history" to "service_role";

grant truncate on table "public"."vessel_sanctions_history" to "service_role";

grant update on table "public"."vessel_sanctions_history" to "service_role";

grant delete on table "public"."vessels" to "anon";

grant insert on table "public"."vessels" to "anon";

grant references on table "public"."vessels" to "anon";

grant select on table "public"."vessels" to "anon";

grant trigger on table "public"."vessels" to "anon";

grant truncate on table "public"."vessels" to "anon";

grant update on table "public"."vessels" to "anon";

grant delete on table "public"."vessels" to "authenticated";

grant insert on table "public"."vessels" to "authenticated";

grant references on table "public"."vessels" to "authenticated";

grant select on table "public"."vessels" to "authenticated";

grant trigger on table "public"."vessels" to "authenticated";

grant truncate on table "public"."vessels" to "authenticated";

grant update on table "public"."vessels" to "authenticated";

grant delete on table "public"."vessels" to "service_role";

grant insert on table "public"."vessels" to "service_role";

grant references on table "public"."vessels" to "service_role";

grant select on table "public"."vessels" to "service_role";

grant trigger on table "public"."vessels" to "service_role";

grant truncate on table "public"."vessels" to "service_role";

grant update on table "public"."vessels" to "service_role";

grant delete on table "public"."workability_reasons" to "anon";

grant insert on table "public"."workability_reasons" to "anon";

grant references on table "public"."workability_reasons" to "anon";

grant select on table "public"."workability_reasons" to "anon";

grant trigger on table "public"."workability_reasons" to "anon";

grant truncate on table "public"."workability_reasons" to "anon";

grant update on table "public"."workability_reasons" to "anon";

grant delete on table "public"."workability_reasons" to "authenticated";

grant insert on table "public"."workability_reasons" to "authenticated";

grant references on table "public"."workability_reasons" to "authenticated";

grant select on table "public"."workability_reasons" to "authenticated";

grant trigger on table "public"."workability_reasons" to "authenticated";

grant truncate on table "public"."workability_reasons" to "authenticated";

grant update on table "public"."workability_reasons" to "authenticated";

grant delete on table "public"."workability_reasons" to "service_role";

grant insert on table "public"."workability_reasons" to "service_role";

grant references on table "public"."workability_reasons" to "service_role";

grant select on table "public"."workability_reasons" to "service_role";

grant trigger on table "public"."workability_reasons" to "service_role";

grant truncate on table "public"."workability_reasons" to "service_role";

grant update on table "public"."workability_reasons" to "service_role";

grant delete on table "public"."workspace_messages" to "anon";

grant insert on table "public"."workspace_messages" to "anon";

grant references on table "public"."workspace_messages" to "anon";

grant select on table "public"."workspace_messages" to "anon";

grant trigger on table "public"."workspace_messages" to "anon";

grant truncate on table "public"."workspace_messages" to "anon";

grant update on table "public"."workspace_messages" to "anon";

grant delete on table "public"."workspace_messages" to "authenticated";

grant insert on table "public"."workspace_messages" to "authenticated";

grant references on table "public"."workspace_messages" to "authenticated";

grant select on table "public"."workspace_messages" to "authenticated";

grant trigger on table "public"."workspace_messages" to "authenticated";

grant truncate on table "public"."workspace_messages" to "authenticated";

grant update on table "public"."workspace_messages" to "authenticated";

grant delete on table "public"."workspace_messages" to "service_role";

grant insert on table "public"."workspace_messages" to "service_role";

grant references on table "public"."workspace_messages" to "service_role";

grant select on table "public"."workspace_messages" to "service_role";

grant trigger on table "public"."workspace_messages" to "service_role";

grant truncate on table "public"."workspace_messages" to "service_role";

grant update on table "public"."workspace_messages" to "service_role";


  create policy "p_activity_write"
  on "public"."activity_log"
  as permissive
  for all
  to authenticated
using (public.has_role(ARRAY['Broker'::text, 'Admin'::text, 'Compliance'::text]))
with check (public.has_role(ARRAY['Broker'::text, 'Admin'::text, 'Compliance'::text]));



  create policy "p_read_activity"
  on "public"."activity_log"
  as permissive
  for select
  to authenticated
using (true);



  create policy "an_delete_none"
  on "public"."app_notifications"
  as permissive
  for delete
  to authenticated
using (false);



  create policy "an_insert_none"
  on "public"."app_notifications"
  as permissive
  for insert
  to authenticated
with check (false);



  create policy "an_select_self"
  on "public"."app_notifications"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "an_update_self"
  on "public"."app_notifications"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "Allow authenticated read companies"
  on "public"."companies"
  as permissive
  for select
  to authenticated
using (true);



  create policy "companies_insert_authenticated"
  on "public"."companies"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "companies_linked_delete"
  on "public"."companies"
  as permissive
  for delete
  to authenticated
using (public.is_linked_active_user());



  create policy "companies_linked_update"
  on "public"."companies"
  as permissive
  for update
  to authenticated
using (public.is_linked_active_user())
with check (public.is_linked_active_user());



  create policy "companies_select_all_authenticated"
  on "public"."companies"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "company_assignments_insert"
  on "public"."company_assignments"
  as permissive
  for insert
  to public
with check ((public.is_admin() OR (assigned_by = public.current_crm_user_id())));



  create policy "company_assignments_select"
  on "public"."company_assignments"
  as permissive
  for select
  to public
using ((public.is_admin() OR (assigned_to_crm_user_id = public.current_crm_user_id()) OR (assigned_by = public.current_crm_user_id())));



  create policy "company_assignments_update"
  on "public"."company_assignments"
  as permissive
  for update
  to public
using ((public.is_admin() OR (assigned_by = public.current_crm_user_id())));



  create policy "company_followups_insert"
  on "public"."company_followups"
  as permissive
  for insert
  to public
with check ((created_by = public.current_crm_user_id()));



  create policy "company_followups_select"
  on "public"."company_followups"
  as permissive
  for select
  to public
using ((public.is_admin() OR (created_by = public.current_crm_user_id()) OR (EXISTS ( SELECT 1
   FROM public.company_assignments ca
  WHERE ((ca.company_id = company_followups.company_id) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()) AND (ca.status = 'ACTIVE'::text))))));



  create policy "company_followups_update"
  on "public"."company_followups"
  as permissive
  for update
  to public
using (((created_by = public.current_crm_user_id()) OR public.is_admin()));



  create policy "Allow authenticated read assignments"
  on "public"."contact_assignments"
  as permissive
  for select
  to authenticated
using (true);



  create policy "admin_ceo_can_insert_assignments"
  on "public"."contact_assignments"
  as permissive
  for insert
  to public
with check (public.is_admin());



  create policy "admin_ceo_can_update_assignments"
  on "public"."contact_assignments"
  as permissive
  for update
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "ca_delete_admin_only"
  on "public"."contact_assignments"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "ca_insert_admin_only"
  on "public"."contact_assignments"
  as permissive
  for insert
  to authenticated
with check (public.is_admin());



  create policy "ca_update_admin_only"
  on "public"."contact_assignments"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "contact_assignments_delete_admin_only"
  on "public"."contact_assignments"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "contact_assignments_select_all_authenticated"
  on "public"."contact_assignments"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "contact_assignments_select_scoped"
  on "public"."contact_assignments"
  as permissive
  for select
  to authenticated
using ((public.is_admin() OR (assigned_to_crm_user_id = public.current_crm_user_id()) OR (assigned_by_crm_user_id = public.current_crm_user_id()) OR (created_by_crm_user_id = public.current_crm_user_id())));



  create policy "contact_assignments_select_unified"
  on "public"."contact_assignments"
  as permissive
  for select
  to public
using ((public.is_admin() OR (assigned_to_crm_user_id = public.current_crm_user_id())));



  create policy "contact_assignments_update_admin_only"
  on "public"."contact_assignments"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "contact_assignments_update_stage"
  on "public"."contact_assignments"
  as permissive
  for update
  to public
using ((public.is_admin() OR ((assigned_to_crm_user_id = public.current_crm_user_id()) AND (status = 'ACTIVE'::text) AND (assignment_role = 'PRIMARY'::text))))
with check ((public.is_admin() OR ((assigned_to_crm_user_id = public.current_crm_user_id()) AND (status = 'ACTIVE'::text) AND (assignment_role = 'PRIMARY'::text))));



  create policy "contact_assignments_update_stage_safe"
  on "public"."contact_assignments"
  as permissive
  for update
  to public
using ((public.is_admin() OR ((assigned_to_crm_user_id = public.current_crm_user_id()) AND (lower(assignment_role) = 'primary'::text) AND (status = 'ACTIVE'::text))))
with check ((public.is_admin() OR ((assigned_to_crm_user_id = public.current_crm_user_id()) AND (lower(assignment_role) = 'primary'::text) AND (status = 'ACTIVE'::text) AND (stage = ANY (ARRAY['COLD_CALLING'::text, 'ASPIRATION'::text, 'ACHIEVEMENT'::text])))));



  create policy "contact_assignments_write_admin_only"
  on "public"."contact_assignments"
  as permissive
  for insert
  to authenticated
with check (public.is_admin());



  create policy "followups_delete"
  on "public"."contact_followups"
  as permissive
  for delete
  to authenticated
using (false);



  create policy "followups_insert_with_nudges"
  on "public"."contact_followups"
  as permissive
  for insert
  to public
with check ((public.is_admin() OR public.user_can_access_contact(contact_id)));



  create policy "followups_select_with_nudges"
  on "public"."contact_followups"
  as permissive
  for select
  to public
using ((public.is_admin() OR (created_by = public.current_crm_user_id()) OR (assigned_to_crm_user_id = public.current_crm_user_id()) OR public.user_can_access_contact(contact_id)));



  create policy "followups_update_with_nudges"
  on "public"."contact_followups"
  as permissive
  for update
  to public
using ((public.is_admin() OR (created_by = public.current_crm_user_id()) OR (assigned_to_crm_user_id = public.current_crm_user_id())))
with check ((public.is_admin() OR (created_by = public.current_crm_user_id()) OR (assigned_to_crm_user_id = public.current_crm_user_id())));



  create policy "cis_delete_admin_only"
  on "public"."contact_import_staging"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "cis_insert_own"
  on "public"."contact_import_staging"
  as permissive
  for insert
  to authenticated
with check ((public.is_admin() OR (imported_by_crm_user_id = public.current_crm_user_id())));



  create policy "cis_select_own_or_admin"
  on "public"."contact_import_staging"
  as permissive
  for select
  to authenticated
using ((public.is_admin() OR (imported_by_crm_user_id = public.current_crm_user_id())));



  create policy "cis_update_own_or_admin"
  on "public"."contact_import_staging"
  as permissive
  for update
  to authenticated
using ((public.is_admin() OR (imported_by_crm_user_id = public.current_crm_user_id())))
with check ((public.is_admin() OR (imported_by_crm_user_id = public.current_crm_user_id())));



  create policy "contact_phones_delete_admin_only"
  on "public"."contact_phones"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "contact_phones_select_restricted"
  on "public"."contact_phones"
  as permissive
  for select
  to public
using (public.can_access_contact_pii(contact_id));



  create policy "contact_phones_update_assigned_or_admin"
  on "public"."contact_phones"
  as permissive
  for update
  to authenticated
using ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.contact_assignments ca
  WHERE ((ca.contact_id = contact_phones.contact_id) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()) AND (ca.status = 'ACTIVE'::text))))))
with check ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.contact_assignments ca
  WHERE ((ca.contact_id = contact_phones.contact_id) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()) AND (ca.status = 'ACTIVE'::text))))));



  create policy "contact_phones_write_admin"
  on "public"."contact_phones"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "contact_phones_write_safe"
  on "public"."contact_phones"
  as permissive
  for all
  to public
using (public.user_can_access_contact(contact_id))
with check (public.user_can_access_contact(contact_id));



  create policy "stage_events_admin_select"
  on "public"."contact_stage_events"
  as permissive
  for select
  to public
using (public.is_admin());



  create policy "csr_insert"
  on "public"."contact_stage_requests"
  as permissive
  for insert
  to authenticated
with check (((public.current_crm_user_id() IS NOT NULL) AND (requested_by_crm_user_id = public.current_crm_user_id()) AND (EXISTS ( SELECT 1
   FROM public.contact_assignments ca
  WHERE ((ca.contact_id = contact_stage_requests.contact_id) AND (ca.status = 'ACTIVE'::text) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()))))));



  create policy "csr_select"
  on "public"."contact_stage_requests"
  as permissive
  for select
  to authenticated
using ((public.is_admin() OR (requested_by_crm_user_id = public.current_crm_user_id()) OR (EXISTS ( SELECT 1
   FROM public.contact_assignments ca
  WHERE ((ca.contact_id = contact_stage_requests.contact_id) AND (ca.status = 'ACTIVE'::text) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()))))));



  create policy "csr_update_admin"
  on "public"."contact_stage_requests"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "contacts_delete_admin_only"
  on "public"."contacts"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "contacts_insert"
  on "public"."contacts"
  as permissive
  for insert
  to public
with check (((public.current_crm_user_id() IS NOT NULL) AND (created_by_crm_user_id = public.current_crm_user_id())));



  create policy "contacts_insert_authenticated"
  on "public"."contacts"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "contacts_select_admin_or_assignee_restrictive"
  on "public"."contacts"
  as restrictive
  for select
  to public
using ((public.is_admin() OR (created_by_crm_user_id = public.current_crm_user_id()) OR (EXISTS ( SELECT 1
   FROM public.contact_assignments ca
  WHERE ((ca.contact_id = contacts.id) AND (ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()))))));



  create policy "contacts_select_restrict_to_admin_or_assignee"
  on "public"."contacts"
  as restrictive
  for select
  to public
using ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.contact_assignments ca
  WHERE ((ca.contact_id = contacts.id) AND (ca.status = 'ACTIVE'::text) AND (ca.ended_at IS NULL) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()))))));



  create policy "contacts_select_unified"
  on "public"."contacts"
  as permissive
  for select
  to public
using ((public.is_admin() OR public.can_access_contact(id)));



  create policy "contacts_update"
  on "public"."contacts"
  as permissive
  for update
  to public
using ((public.is_admin() OR (created_by_crm_user_id = public.current_crm_user_id())))
with check ((public.is_admin() OR (created_by_crm_user_id = public.current_crm_user_id())));



  create policy "contacts_update_assigned_or_admin"
  on "public"."contacts"
  as permissive
  for update
  to authenticated
using ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.contact_assignments ca
  WHERE ((ca.contact_id = contacts.id) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()) AND (ca.status = 'ACTIVE'::text))))))
with check ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.contact_assignments ca
  WHERE ((ca.contact_id = contacts.id) AND (ca.assigned_to_crm_user_id = public.current_crm_user_id()) AND (ca.status = 'ACTIVE'::text))))));



  create policy "contacts_update_creator_or_admin"
  on "public"."contacts"
  as permissive
  for update
  to authenticated
using ((public.is_admin() OR (created_by_crm_user_id = public.current_crm_user_id())))
with check ((public.is_admin() OR (created_by_crm_user_id = public.current_crm_user_id())));



  create policy "contacts_update_safe"
  on "public"."contacts"
  as permissive
  for update
  to public
using ((public.is_admin() OR (created_by_crm_user_id = public.current_crm_user_id())))
with check ((public.is_admin() OR (created_by_crm_user_id = public.current_crm_user_id())));



  create policy "contacts_update_stage_creator_or_assignee"
  on "public"."contacts"
  as permissive
  for update
  to public
using (((public.current_crm_user_id() IS NOT NULL) AND ((created_by_crm_user_id = public.current_crm_user_id()) OR (assigned_to_user_id = public.current_crm_user_id()) OR (assigned_to = public.current_crm_user_id()) OR public.is_admin())))
with check (((public.current_crm_user_id() IS NOT NULL) AND ((created_by_crm_user_id = public.current_crm_user_id()) OR (assigned_to_user_id = public.current_crm_user_id()) OR (assigned_to = public.current_crm_user_id()) OR public.is_admin())));



  create policy "Allow authenticated read users"
  on "public"."crm_users"
  as permissive
  for select
  to authenticated
using (true);



  create policy "crm_users_insert_admin"
  on "public"."crm_users"
  as permissive
  for insert
  to authenticated
with check ((public.is_admin() AND (auth_user_id IS NULL)));



  create policy "crm_users_select_admin"
  on "public"."crm_users"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "crm_users_select_self"
  on "public"."crm_users"
  as permissive
  for select
  to authenticated
using ((auth_user_id = auth.uid()));



  create policy "crm_users_update_admin"
  on "public"."crm_users"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check ((auth_user_id = ( SELECT cu.auth_user_id
   FROM public.crm_users cu
  WHERE (cu.id = crm_users.id))));



  create policy "enquiries_insert_authenticated_failsafe"
  on "public"."enquiries"
  as permissive
  for insert
  to authenticated
with check (((created_by = public.current_crm_user_id()) OR (created_by IS NULL)));



  create policy "enquiries_insert_creator"
  on "public"."enquiries"
  as permissive
  for insert
  to authenticated
with check ((created_by = public.current_crm_user_id()));



  create policy "enquiries_insert_failsafe_authenticated"
  on "public"."enquiries"
  as permissive
  for insert
  to authenticated
with check (((created_by = public.current_crm_user_id()) OR (created_by IS NULL)));



  create policy "enquiries_select_all"
  on "public"."enquiries"
  as permissive
  for select
  to authenticated
using (true);



  create policy "enquiries_update_creator_only"
  on "public"."enquiries"
  as permissive
  for update
  to authenticated
using ((created_by = public.current_crm_user_id()))
with check ((created_by = public.current_crm_user_id()));



  create policy "activities_delete"
  on "public"."enquiry_activities"
  as permissive
  for delete
  to public
using (public.is_admin());



  create policy "activities_insert"
  on "public"."enquiry_activities"
  as permissive
  for insert
  to public
with check ((created_by = public.current_crm_user_id()));



  create policy "activities_no_update"
  on "public"."enquiry_activities"
  as permissive
  for update
  to public
using (false);



  create policy "activities_select"
  on "public"."enquiry_activities"
  as permissive
  for select
  to public
using (true);



  create policy "enquiry_feed_block_write"
  on "public"."enquiry_feed"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "enquiry_feed_insert"
  on "public"."enquiry_feed"
  as permissive
  for insert
  to public
with check (public.is_admin());



  create policy "enquiry_feed_select"
  on "public"."enquiry_feed"
  as permissive
  for select
  to public
using (true);



  create policy "enquiry_feed_update"
  on "public"."enquiry_feed"
  as permissive
  for update
  to public
using (public.is_admin());



  create policy "enq_participants_delete"
  on "public"."enquiry_participants"
  as permissive
  for delete
  to public
using (public.is_admin());



  create policy "enq_participants_delete_admin"
  on "public"."enquiry_participants"
  as permissive
  for delete
  to public
using (public.is_admin());



  create policy "enq_participants_insert"
  on "public"."enquiry_participants"
  as permissive
  for insert
  to public
with check ((public.is_admin() OR (added_by_crm_user_id = public.current_crm_user_id())));



  create policy "enq_participants_insert_self"
  on "public"."enquiry_participants"
  as permissive
  for insert
  to public
with check (((crm_user_id = public.current_crm_user_id()) AND (added_by_crm_user_id = public.current_crm_user_id())));



  create policy "enq_participants_select"
  on "public"."enquiry_participants"
  as permissive
  for select
  to public
using (true);



  create policy "quotes_delete"
  on "public"."enquiry_quotes"
  as permissive
  for delete
  to public
using (public.is_admin());



  create policy "quotes_insert"
  on "public"."enquiry_quotes"
  as permissive
  for insert
  to public
with check ((created_by = public.current_crm_user_id()));



  create policy "quotes_select"
  on "public"."enquiry_quotes"
  as permissive
  for select
  to public
using (true);



  create policy "quotes_update"
  on "public"."enquiry_quotes"
  as permissive
  for update
  to public
using (true);



  create policy "fixtures_linked_delete"
  on "public"."fixtures"
  as permissive
  for delete
  to authenticated
using (public.is_linked_active_user());



  create policy "fixtures_linked_insert"
  on "public"."fixtures"
  as permissive
  for insert
  to authenticated
with check (public.is_linked_active_user());



  create policy "fixtures_linked_select"
  on "public"."fixtures"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "fixtures_linked_update"
  on "public"."fixtures"
  as permissive
  for update
  to authenticated
using (public.is_linked_active_user())
with check (public.is_linked_active_user());



  create policy "fnl_delete_none"
  on "public"."followup_notifications_log"
  as permissive
  for delete
  to authenticated
using (false);



  create policy "fnl_insert_none"
  on "public"."followup_notifications_log"
  as permissive
  for insert
  to authenticated
with check (false);



  create policy "fnl_select_self"
  on "public"."followup_notifications_log"
  as permissive
  for select
  to authenticated
using ((notified_to = auth.uid()));



  create policy "fnl_update_none"
  on "public"."followup_notifications_log"
  as permissive
  for update
  to authenticated
using (false);



  create policy "import_batches_insert"
  on "public"."import_batches"
  as permissive
  for insert
  to public
with check ((created_by = public.current_crm_user_id()));



  create policy "import_batches_select"
  on "public"."import_batches"
  as permissive
  for select
  to public
using ((public.is_admin() OR (created_by = public.current_crm_user_id())));



  create policy "No deletes on interactions"
  on "public"."interactions__legacy"
  as permissive
  for delete
  to public
using (false);



  create policy "No updates on interactions"
  on "public"."interactions__legacy"
  as permissive
  for update
  to public
using (false);



  create policy "Users can view interactions of assigned contacts"
  on "public"."interactions__legacy"
  as permissive
  for select
  to public
using (public.can_view_contact_interactions(contact_id));



  create policy "interactions_insert_safe"
  on "public"."interactions__legacy"
  as permissive
  for insert
  to public
with check (public.user_can_access_contact(contact_id));



  create policy "interactions_insert_unified"
  on "public"."interactions__legacy"
  as permissive
  for insert
  to public
with check (((public.current_crm_user_id() IS NOT NULL) AND (created_by = public.current_crm_user_id()) AND public.can_access_contact(contact_id)));



  create policy "interactions_linked_delete"
  on "public"."interactions__legacy"
  as permissive
  for delete
  to authenticated
using (public.is_linked_active_user());



  create policy "interactions_linked_insert"
  on "public"."interactions__legacy"
  as permissive
  for insert
  to authenticated
with check (public.is_linked_active_user());



  create policy "interactions_linked_select"
  on "public"."interactions__legacy"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "interactions_linked_update"
  on "public"."interactions__legacy"
  as permissive
  for update
  to authenticated
using (public.is_linked_active_user())
with check (public.is_linked_active_user());



  create policy "interactions_no_delete"
  on "public"."interactions__legacy"
  as permissive
  for delete
  to public
using (false);



  create policy "interactions_no_update"
  on "public"."interactions__legacy"
  as permissive
  for update
  to public
using (false);



  create policy "interactions_select_safe"
  on "public"."interactions__legacy"
  as permissive
  for select
  to public
using (public.user_can_access_contact(contact_id));



  create policy "interactions_select_unified"
  on "public"."interactions__legacy"
  as permissive
  for select
  to public
using ((public.is_admin() OR public.can_access_contact(contact_id)));



  create policy "interactions_log_insert_own"
  on "public"."interactions_log"
  as permissive
  for insert
  to authenticated
with check ((created_by_crm_user_id = public.current_crm_user_id()));



  create policy "interactions_log_select_admin"
  on "public"."interactions_log"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "interactions_log_select_own"
  on "public"."interactions_log"
  as permissive
  for select
  to authenticated
using ((created_by_crm_user_id = public.current_crm_user_id()));



  create policy "interactions_log_update_own"
  on "public"."interactions_log"
  as permissive
  for update
  to authenticated
using ((created_by_crm_user_id = public.current_crm_user_id()))
with check ((created_by_crm_user_id = public.current_crm_user_id()));



  create policy "invoices_linked_delete"
  on "public"."invoices"
  as permissive
  for delete
  to authenticated
using (public.is_linked_active_user());



  create policy "invoices_linked_insert"
  on "public"."invoices"
  as permissive
  for insert
  to authenticated
with check (public.is_linked_active_user());



  create policy "invoices_linked_select"
  on "public"."invoices"
  as permissive
  for select
  to authenticated
using (public.is_linked_active_user());



  create policy "invoices_linked_update"
  on "public"."invoices"
  as permissive
  for update
  to authenticated
using (public.is_linked_active_user())
with check (public.is_linked_active_user());



  create policy "p_invoices_write"
  on "public"."invoices"
  as permissive
  for all
  to authenticated
using (public.has_role(ARRAY['Accounts'::text, 'Admin'::text]))
with check (public.has_role(ARRAY['Accounts'::text, 'Admin'::text]));



  create policy "p_read_invoices"
  on "public"."invoices"
  as permissive
  for select
  to authenticated
using (true);



  create policy "p_leads_write"
  on "public"."leads"
  as permissive
  for all
  to authenticated
using (public.has_role(ARRAY['Broker'::text, 'Admin'::text, 'Compliance'::text]))
with check (public.has_role(ARRAY['Broker'::text, 'Admin'::text, 'Compliance'::text]));



  create policy "p_read_leads"
  on "public"."leads"
  as permissive
  for select
  to authenticated
using (true);



  create policy "ndl_no_access"
  on "public"."notification_delivery_log"
  as permissive
  for all
  to authenticated
using (false)
with check (false);



  create policy "ndq_no_access"
  on "public"."notification_delivery_queue"
  as permissive
  for all
  to authenticated
using (false)
with check (false);



  create policy "p_options_write"
  on "public"."options_shown"
  as permissive
  for all
  to authenticated
using (public.has_role(ARRAY['Broker'::text, 'Admin'::text, 'Compliance'::text]))
with check (public.has_role(ARRAY['Broker'::text, 'Admin'::text, 'Compliance'::text]));



  create policy "p_read_options"
  on "public"."options_shown"
  as permissive
  for select
  to authenticated
using (true);



  create policy "p_read_profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "p_read_sanctions_sources"
  on "public"."sanctions_sources"
  as permissive
  for select
  to authenticated
using (true);



  create policy "task_comments_insert"
  on "public"."task_comments"
  as permissive
  for insert
  to public
with check (((crm_user_id = public.current_crm_user_id()) AND (EXISTS ( SELECT 1
   FROM public.tasks t
  WHERE ((t.id = task_comments.task_id) AND (public.is_admin() OR (t.is_broadcast = true) OR (t.created_by_crm_user_id = public.current_crm_user_id()) OR (EXISTS ( SELECT 1
           FROM public.task_recipients r
          WHERE ((r.task_id = t.id) AND (r.crm_user_id = public.current_crm_user_id()))))))))));



  create policy "task_comments_read"
  on "public"."task_comments"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.tasks t
  WHERE ((t.id = task_comments.task_id) AND (public.is_admin() OR (t.is_broadcast = true) OR (t.created_by_crm_user_id = public.current_crm_user_id()) OR (EXISTS ( SELECT 1
           FROM public.task_recipients r
          WHERE ((r.task_id = t.id) AND (r.crm_user_id = public.current_crm_user_id())))))))));



  create policy "task_recipients_admin_write"
  on "public"."task_recipients"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "task_recipients_insert_creator"
  on "public"."task_recipients"
  as permissive
  for insert
  to public
with check ((public.is_admin() OR ((assigned_by_crm_user_id = public.current_crm_user_id()) AND (EXISTS ( SELECT 1
   FROM public.tasks t
  WHERE ((t.id = task_recipients.task_id) AND (t.created_by_crm_user_id = public.current_crm_user_id())))))));



  create policy "task_recipients_read_self_or_admin"
  on "public"."task_recipients"
  as permissive
  for select
  to public
using ((public.is_admin() OR (crm_user_id = public.current_crm_user_id())));



  create policy "task_user_state_insert_own"
  on "public"."task_user_state"
  as permissive
  for insert
  to public
with check (((crm_user_id = public.current_crm_user_id()) AND (EXISTS ( SELECT 1
   FROM public.tasks t
  WHERE ((t.id = task_user_state.task_id) AND (public.is_admin() OR (t.is_broadcast = true) OR (t.created_by_crm_user_id = public.current_crm_user_id()) OR (EXISTS ( SELECT 1
           FROM public.task_recipients r
          WHERE ((r.task_id = t.id) AND (r.crm_user_id = public.current_crm_user_id()))))))))));



  create policy "task_user_state_read"
  on "public"."task_user_state"
  as permissive
  for select
  to public
using ((public.is_admin() OR (crm_user_id = public.current_crm_user_id())));



  create policy "task_user_state_update_own"
  on "public"."task_user_state"
  as permissive
  for update
  to public
using ((crm_user_id = public.current_crm_user_id()))
with check ((crm_user_id = public.current_crm_user_id()));



  create policy "tasks_delete_creator_or_admin"
  on "public"."tasks"
  as permissive
  for delete
  to public
using ((public.is_admin() OR (created_by_crm_user_id = public.current_crm_user_id())));



  create policy "tasks_insert_creator_or_admin"
  on "public"."tasks"
  as permissive
  for insert
  to public
with check ((public.is_admin() OR (created_by_crm_user_id IS NULL) OR (created_by_crm_user_id = ( SELECT cu.id
   FROM public.crm_users cu
  WHERE (cu.auth_user_id = auth.uid())))));



  create policy "tasks_read_visibility"
  on "public"."tasks"
  as permissive
  for select
  to public
using ((public.is_admin() OR (is_broadcast = true) OR (created_by_crm_user_id = public.current_crm_user_id()) OR (EXISTS ( SELECT 1
   FROM public.task_recipients r
  WHERE ((r.task_id = tasks.id) AND (r.crm_user_id = public.current_crm_user_id()))))));



  create policy "tasks_update_creator_or_admin"
  on "public"."tasks"
  as permissive
  for update
  to public
using ((public.is_admin() OR (created_by_crm_user_id = public.current_crm_user_id())))
with check ((public.is_admin() OR (created_by_crm_user_id = public.current_crm_user_id())));



  create policy "notepad_insert_own"
  on "public"."user_notepad"
  as permissive
  for insert
  to public
with check ((crm_user_id = public.current_crm_user_id()));



  create policy "notepad_read_own"
  on "public"."user_notepad"
  as permissive
  for select
  to public
using ((crm_user_id = public.current_crm_user_id()));



  create policy "notepad_update_own"
  on "public"."user_notepad"
  as permissive
  for update
  to public
using ((crm_user_id = public.current_crm_user_id()))
with check ((crm_user_id = public.current_crm_user_id()));



  create policy "p_read_vessel_sanctions"
  on "public"."vessel_sanctions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "p_vs_write"
  on "public"."vessel_sanctions"
  as permissive
  for all
  to authenticated
using (public.has_role(ARRAY['Broker'::text, 'Admin'::text, 'Compliance'::text]))
with check (public.has_role(ARRAY['Broker'::text, 'Admin'::text, 'Compliance'::text]));



  create policy "p_read_vessel_sanctions_history"
  on "public"."vessel_sanctions_history"
  as permissive
  for select
  to authenticated
using (true);



  create policy "p_read_vessels"
  on "public"."vessels"
  as permissive
  for select
  to authenticated
using (true);



  create policy "workspace_messages_delete_admin"
  on "public"."workspace_messages"
  as permissive
  for delete
  to public
using (public.is_admin());



  create policy "workspace_messages_insert"
  on "public"."workspace_messages"
  as permissive
  for insert
  to public
with check ((created_by_crm_user_id = public.current_crm_user_id()));



  create policy "workspace_messages_read"
  on "public"."workspace_messages"
  as permissive
  for select
  to public
using (true);



  create policy "workspace_messages_update_own"
  on "public"."workspace_messages"
  as permissive
  for update
  to public
using ((created_by_crm_user_id = public.current_crm_user_id()))
with check ((created_by_crm_user_id = public.current_crm_user_id()));


CREATE TRIGGER trg_activity_updated_at BEFORE UPDATE ON public.activity_log FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_create_company_recurring_followup AFTER UPDATE ON public.company_followups FOR EACH ROW EXECUTE FUNCTION public.trigger_create_company_recurring_followup();

CREATE TRIGGER trg_contact_assignments_defaults BEFORE INSERT ON public.contact_assignments FOR EACH ROW EXECUTE FUNCTION public.tg_contact_assignments_defaults();

CREATE TRIGGER trg_log_contact_stage_change AFTER UPDATE OF stage ON public.contact_assignments FOR EACH ROW EXECUTE FUNCTION public.log_contact_stage_change();

CREATE TRIGGER trg_normalize_assignment_role BEFORE INSERT OR UPDATE OF assignment_role ON public.contact_assignments FOR EACH ROW EXECUTE FUNCTION public.normalize_assignment_role();

CREATE TRIGGER trg_create_recurring_followup AFTER UPDATE ON public.contact_followups FOR EACH ROW EXECUTE FUNCTION public.trigger_create_recurring_followup();

CREATE TRIGGER trg_followups_guard_ins BEFORE INSERT ON public.contact_followups FOR EACH ROW EXECUTE FUNCTION public.tg_followup_guard();

CREATE TRIGGER trg_followups_guard_upd BEFORE UPDATE ON public.contact_followups FOR EACH ROW EXECUTE FUNCTION public.tg_followup_guard();

CREATE TRIGGER trg_followups_updated_at BEFORE UPDATE ON public.contact_followups FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER trg_sanitize_email_on_staging BEFORE INSERT OR UPDATE OF email ON public.contact_import_staging FOR EACH ROW EXECUTE FUNCTION public.tg_sanitize_email();

CREATE TRIGGER trg_close_assignments_on_contact_inactive AFTER UPDATE OF is_active ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.close_assignments_when_contact_inactive();

CREATE TRIGGER trg_contacts_set_created_by BEFORE INSERT ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.contacts_set_created_by();

CREATE TRIGGER trg_contacts_set_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sanitize_email_on_contacts BEFORE INSERT OR UPDATE OF email ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.tg_sanitize_email();

CREATE TRIGGER trg_set_contact_creator_fields BEFORE INSERT ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_contact_creator_fields();

CREATE TRIGGER trg_crm_users_normalize_email BEFORE INSERT OR UPDATE OF email ON public.crm_users FOR EACH ROW EXECUTE FUNCTION public.crm_users_normalize_email();

CREATE TRIGGER trg_crm_users_updated_at BEFORE UPDATE ON public.crm_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_user_deactivation AFTER UPDATE OF active ON public.crm_users FOR EACH ROW EXECUTE FUNCTION public.handle_user_deactivation();

CREATE TRIGGER trg_enquiries_guard_created_by BEFORE INSERT ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.enquiries_guard_created_by();

CREATE TRIGGER trg_enquiry_created_add_participant AFTER INSERT ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.on_enquiry_created_add_participant();

CREATE TRIGGER trg_enquiry_participation AFTER INSERT ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.on_enquiry_participation();

CREATE TRIGGER trg_log_enquiry_activity AFTER INSERT OR UPDATE ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.log_enquiry_activity();

CREATE TRIGGER trg_set_enquiry_number BEFORE INSERT ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.set_enquiry_number();

CREATE TRIGGER trg_sync_enquiry_feed AFTER INSERT OR UPDATE ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.sync_enquiry_feed();

CREATE TRIGGER trg_touch_enquiries_updated_at BEFORE UPDATE ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_quote_created_add_participant AFTER INSERT ON public.enquiry_quotes FOR EACH ROW EXECUTE FUNCTION public.on_quote_created_add_participant();

CREATE TRIGGER trg_quote_participation AFTER INSERT ON public.enquiry_quotes FOR EACH ROW EXECUTE FUNCTION public.on_quote_participation();

CREATE TRIGGER trg_set_quote_number BEFORE INSERT ON public.enquiry_quotes FOR EACH ROW EXECUTE FUNCTION public.set_quote_number_and_version();

CREATE TRIGGER trg_touch_quotes_updated_at BEFORE UPDATE ON public.enquiry_quotes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_fixture_parties_promote AFTER INSERT ON public.fixture_parties FOR EACH ROW EXECUTE FUNCTION public.fn_promote_contact_to_achievement();

CREATE TRIGGER trg_fixtures_updated_at BEFORE UPDATE ON public.fixtures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_fixture_number BEFORE INSERT OR UPDATE ON public.fixtures FOR EACH ROW EXECUTE FUNCTION public.set_fixture_number();

CREATE TRIGGER trg_block_legacy_followups_write BEFORE INSERT OR DELETE OR UPDATE ON public.follow_ups__legacy FOR EACH ROW EXECUTE FUNCTION public.block_legacy_followups_write();

CREATE TRIGGER interactions_defaults BEFORE INSERT ON public.interactions__legacy FOR EACH ROW EXECUTE FUNCTION public.trg_interactions_defaults();

CREATE TRIGGER trg_block_legacy_interactions_write BEFORE INSERT OR DELETE OR UPDATE ON public.interactions__legacy FOR EACH ROW EXECUTE FUNCTION public.block_legacy_interactions_write();

CREATE TRIGGER trg_interactions_set_created_by BEFORE INSERT ON public.interactions__legacy FOR EACH ROW EXECUTE FUNCTION public.interactions_set_created_by();

CREATE TRIGGER trg_update_contact_on_interaction AFTER INSERT ON public.interactions__legacy FOR EACH ROW EXECUTE FUNCTION public.update_contact_on_interaction();

CREATE TRIGGER trg_interactions_log_updated_at BEFORE UPDATE ON public.interactions_log FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_notification_delivery_queue BEFORE UPDATE ON public.notification_delivery_queue FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER trg_ops_updated_at BEFORE UPDATE ON public.ops FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_options_updated_at BEFORE UPDATE ON public.options_shown FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tasks_set_created_by BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.enforce_task_created_by_from_auth();

CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_user_notepad_updated_at BEFORE UPDATE ON public.user_notepad FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_log_vessel_sanctions_change AFTER UPDATE ON public.vessel_sanctions FOR EACH ROW EXECUTE FUNCTION public.log_vessel_sanctions_change();

CREATE TRIGGER trg_vessel_sanctions_updated_at BEFORE UPDATE ON public.vessel_sanctions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_vessels_updated_at BEFORE UPDATE ON public.vessels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_auth_user_created_create_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_create_profile();


