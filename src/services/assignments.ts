import { supabase } from "@/lib/supabaseClient";
import { getCurrentCrmUserId } from "./profiles";

export type AssignmentStage = "COLD_CALLING" | "ASPIRATION" | "ACHIEVEMENT" | "INACTIVE";
export type AssignmentRole = "PRIMARY" | "SECONDARY";

export interface ContactAssignment {
  id: string;
  contact_id: string;
  stage: AssignmentStage;
  status: string;
  assignment_role: AssignmentRole | null;

  assigned_to_crm_user_id: string | null;
  assigned_by_crm_user_id: string | null;
  stage_changed_by_crm_user_id: string | null;

  assigned_at: string | null;
  stage_changed_at: string | null;

  ended_at?: string | null;
  notes: string | null;
}

export interface ContactOwners {
  primary: ContactAssignment | null;
  secondary: ContactAssignment | null;
}

function normalizeRole(role: unknown): AssignmentRole | null {
  if (!role) return null;
  const r = String(role).trim().toUpperCase();
  if (r === "PRIMARY") return "PRIMARY";
  if (r === "SECONDARY") return "SECONDARY";
  return null;
}

/**
 * For list pages that only need "the active assignment per contact" (PRIMARY preferred).
 */
export async function getAssignmentsForContacts(contactIds: string[]): Promise<{
  data: Record<string, ContactAssignment> | null;
  error: string | null;
}> {
  try {
    if (contactIds.length === 0) return { data: {}, error: null };

    const { data, error } = await supabase
      .from("contact_assignments")
      .select("*")
      .in("contact_id", contactIds)
      .eq("status", "ACTIVE");

    if (error) return { data: null, error: error.message };

    const assignmentMap: Record<string, ContactAssignment> = {};
    (data || []).forEach((row: any) => {
      const contactId = row.contact_id as string;
      const role = normalizeRole(row.assignment_role);

      const existing = assignmentMap[contactId];
      if (!existing) {
        assignmentMap[contactId] = row as ContactAssignment;
        return;
      }

      // Prefer PRIMARY over SECONDARY
      const existingRole = normalizeRole(existing.assignment_role);
      if (existingRole !== "PRIMARY" && role === "PRIMARY") {
        assignmentMap[contactId] = row as ContactAssignment;
      }
    });

    return { data: assignmentMap, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error occurred" };
  }
}

/**
 * Get Primary and Secondary owners for a single contact (ACTIVE + latest by assigned_at).
 */
export async function getContactOwners(contactId: string): Promise<{
  data: ContactOwners | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("contact_assignments")
      .select("*")
      .eq("contact_id", contactId)
      .eq("status", "ACTIVE")
      .is("ended_at", null)
      .order("assigned_at", { ascending: false });

    if (error) return { data: null, error: error.message };

    const owners: ContactOwners = { primary: null, secondary: null };

    (data || []).forEach((row: any) => {
      const role = normalizeRole(row.assignment_role);
      if (role === "PRIMARY" && !owners.primary) owners.primary = row as ContactAssignment;
      if (role === "SECONDARY" && !owners.secondary) owners.secondary = row as ContactAssignment;
    });

    return { data: owners, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error occurred" };
  }
}

/**
 * Get owners for multiple contacts (Directory list view).
 */
export async function getOwnersForContacts(contactIds: string[]): Promise<{
  data: Record<string, ContactOwners> | null;
  error: string | null;
}> {
  try {
    if (contactIds.length === 0) return { data: {}, error: null };

    const { data, error } = await supabase
      .from("contact_assignments")
      .select("*")
      .in("contact_id", contactIds)
      .eq("status", "ACTIVE")
      .is("ended_at", null)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("[getOwnersForContacts] Query error:", error);
      return { data: null, error: error.message };
    }

    const ownersMap: Record<string, ContactOwners> = {};
    contactIds.forEach((id) => (ownersMap[id] = { primary: null, secondary: null }));

    (data || []).forEach((row: any) => {
      const contactId = row.contact_id as string;
      if (!ownersMap[contactId]) ownersMap[contactId] = { primary: null, secondary: null };

      const role = normalizeRole(row.assignment_role);

      // first row per role wins (ordered by assigned_at desc)
      if (role === "PRIMARY" && !ownersMap[contactId].primary) ownersMap[contactId].primary = row as ContactAssignment;
      if (role === "SECONDARY" && !ownersMap[contactId].secondary)
        ownersMap[contactId].secondary = row as ContactAssignment;
    });

    return { data: ownersMap, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error occurred" };
  }
}

/**
 * Upsert owners (Primary and optional Secondary).
 * Rule: close old ACTIVE PRIMARY, then insert new ACTIVE PRIMARY.
 * Secondary: close old ACTIVE SECONDARY, then insert new one if provided.
 */
export async function upsertOwners(params: {
  contact_id: string;
  primary_owner_id: string;
  secondary_owner_id: string | null;
  stage?: AssignmentStage;
}): Promise<{
  data: { primary: ContactAssignment; secondary: ContactAssignment | null } | null;
  error: string | null;
}> {
  try {
    const { contact_id, primary_owner_id, secondary_owner_id, stage } = params;

    if (secondary_owner_id && primary_owner_id === secondary_owner_id) {
      return { data: null, error: "Primary and Secondary owner cannot be the same user." };
    }

    const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
    if (crmError || !currentCrmUserId) {
      return { data: null, error: crmError || "Could not resolve current CRM user" };
    }

    // Preserve stage if not provided (read from current ACTIVE PRIMARY)
    const { data: existingPrimary } = await supabase
      .from("contact_assignments")
      .select("stage")
      .eq("contact_id", contact_id)
      .eq("status", "ACTIVE")
      .eq("assignment_role", "PRIMARY")
      .maybeSingle();

    const finalStage: AssignmentStage = stage || (existingPrimary?.stage as AssignmentStage) || "ASPIRATION";
    const now = new Date().toISOString();

    // 1) Close existing ACTIVE PRIMARY
    const { error: closePrimaryError } = await supabase
      .from("contact_assignments")
      .update({ status: "CLOSED", ended_at: now })
      .eq("contact_id", contact_id)
      .eq("status", "ACTIVE")
      .eq("assignment_role", "PRIMARY");

    if (closePrimaryError) {
      if (closePrimaryError.message.includes("row-level security")) {
        return { data: null, error: "Permission blocked by RLS policy on contact_assignments." };
      }
      return { data: null, error: closePrimaryError.message };
    }

    // 2) Close existing ACTIVE SECONDARY
    const { error: closeSecondaryError } = await supabase
      .from("contact_assignments")
      .update({ status: "CLOSED", ended_at: now })
      .eq("contact_id", contact_id)
      .eq("status", "ACTIVE")
      .eq("assignment_role", "SECONDARY");

    if (closeSecondaryError) {
      if (closeSecondaryError.message.includes("row-level security")) {
        return { data: null, error: "Permission blocked by RLS policy on contact_assignments." };
      }
      return { data: null, error: closeSecondaryError.message };
    }

    // 3) Insert new owners
    const insertPayloads: Array<{
      contact_id: string;
      assigned_to_crm_user_id: string;
      assigned_by_crm_user_id: string;
      assignment_role: AssignmentRole;
      stage: AssignmentStage;
      status: "ACTIVE";
      assigned_at: string;
      stage_changed_at: string;
      stage_changed_by_crm_user_id: string;
    }> = [
      {
        contact_id,
        assigned_to_crm_user_id: primary_owner_id,
        assigned_by_crm_user_id: currentCrmUserId,
        assignment_role: "PRIMARY",
        stage: finalStage,
        status: "ACTIVE",
        assigned_at: now,
        stage_changed_at: now,
        stage_changed_by_crm_user_id: currentCrmUserId,
      },
    ];

    if (secondary_owner_id) {
      insertPayloads.push({
        contact_id,
        assigned_to_crm_user_id: secondary_owner_id,
        assigned_by_crm_user_id: currentCrmUserId,
        assignment_role: "SECONDARY",
        stage: finalStage,
        status: "ACTIVE",
        assigned_at: now,
        stage_changed_at: now,
        stage_changed_by_crm_user_id: currentCrmUserId,
      });
    }

    const { data: insertedData, error: insertError } = await supabase
      .from("contact_assignments")
      .insert(insertPayloads)
      .select();

    if (insertError) {
      if (insertError.message.includes("row-level security")) {
        return { data: null, error: "Permission blocked by RLS policy on contact_assignments." };
      }
      if (
        insertError.message.includes("duplicate key") ||
        insertError.message.includes("one_active_primary_per_contact")
      ) {
        return { data: null, error: `Constraint error: ${insertError.message}. Refresh and try again.` };
      }
      return { data: null, error: insertError.message };
    }

    const primaryData = (insertedData || []).find((a: any) => normalizeRole(a.assignment_role) === "PRIMARY") || null;
    const secondaryData =
      (insertedData || []).find((a: any) => normalizeRole(a.assignment_role) === "SECONDARY") || null;

    if (!primaryData) return { data: null, error: "Primary owner insert failed unexpectedly." };

    return {
      data: { primary: primaryData as ContactAssignment, secondary: (secondaryData as ContactAssignment) || null },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error occurred" };
  }
}

/**
 * Change stage (updates ALL ACTIVE assignments so the UI is consistent).
 */
export async function changeContactStage(params: {
  contact_id: string;
  to_stage: AssignmentStage;
  note?: string | null;
}): Promise<{
  data: { action: "UPDATED" | "REQUESTED" } | null;
  error: string | null;
}> {
  try {
    const { contact_id, to_stage, note } = params;

    const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
    if (crmError || !currentCrmUserId) {
      return { data: null, error: crmError || "Could not resolve current CRM user" };
    }

    // Keep your existing workflow behavior for INACTIVE if you use stage requests
    if (to_stage === "INACTIVE") {
      const { error: requestError } = await supabase.from("contact_stage_requests").insert({
        contact_id,
        requested_stage: to_stage,
        requested_by_crm_user_id: currentCrmUserId,
        note: note || null,
        status: "PENDING",
      } as any);

      if (requestError) return { data: null, error: requestError.message };
      return { data: { action: "REQUESTED" }, error: null };
    }

    const now = new Date().toISOString();

    const { error: caUpdateError } = await supabase
      .from("contact_assignments")
      .update({
        stage: to_stage,
        stage_changed_at: now,
        stage_changed_by_crm_user_id: currentCrmUserId,
      })
      .eq("contact_id", contact_id)
      .eq("status", "ACTIVE");

    if (caUpdateError) return { data: null, error: caUpdateError.message };

    return { data: { action: "UPDATED" }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error occurred" };
  }
}
