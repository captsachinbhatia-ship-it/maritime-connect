import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ────────────────────────────────────────────────────────
export interface ContactV2Row {
  id: string;
  full_name: string;
  company_name: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  primary_owner: string | null;
  primary_owner_id: string | null;
  secondary_owner: string | null;
  secondary_owner_id: string | null;
  stage: StageFilter | null;
  is_active: boolean | null;
  updated_at: string | null;
  last_interaction_at: string | null;
  created_by_crm_user_id: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export type TabKey = "directory" | "my-primary" | "my-secondary" | "my-added" | "inactive" | "deleted";

export type StageFilter = "ALL" | "COLD_CALLING" | "ASPIRATION" | "ACHIEVEMENT";

const STAGES: StageFilter[] = ["COLD_CALLING", "ASPIRATION", "ACHIEVEMENT"];

export const STAGE_CHIPS: { value: StageFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "COLD_CALLING", label: "Cold Calling" },
  { value: "ASPIRATION", label: "Aspiration" },
  { value: "ACHIEVEMENT", label: "Achievement" },
];

// ── View maps ────────────────────────────────────────────────────
const VIEW_MAP: Record<TabKey, string> = {
  directory: "v_directory_contacts_ro",
  "my-primary": "v_my_primary_contacts",
  "my-secondary": "v_my_secondary_contacts",
  "my-added": "v_my_added_unassigned",
  inactive: "contacts",
  deleted: "contacts",
};

const STAGE_COUNT_VIEW_MAP: Record<TabKey, string> = {
  directory: "v_directory_stage_counts",
  "my-primary": "v_my_primary_stage_counts",
  "my-secondary": "v_my_secondary_stage_counts",
  "my-added": "v_my_added_stage_counts",
  inactive: "",
  deleted: "",
};

// ── Helpers ──────────────────────────────────────────────────────
function normalizeStage(raw: any): StageFilter | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, "_");
  return STAGES.includes(s as StageFilter) ? (s as StageFilter) : null;
}

function normalize(row: any): ContactV2Row {
  if (!row.id && !row.contact_id) throw new Error("Missing id");
  if (!row.full_name) throw new Error("Missing full_name for row " + (row.id ?? row.contact_id));

  return {
    id: row.id ?? row.contact_id,
    full_name: row.full_name,
    company_name: row.company_name ?? null,
    designation: row.designation ?? null,
    email: row.email ?? null,
    phone: row.primary_phone ?? row.phone ?? null,
    country_code: row.country_code ?? null,
    primary_owner: row.primary_owner_name ?? row.assigned_to_name ?? null,
    primary_owner_id: row.primary_owner_id ?? row.assigned_to_crm_user_id ?? null,
    secondary_owner: row.secondary_owner_name ?? null,
    secondary_owner_id: row.secondary_owner_id ?? null,
    stage: normalizeStage(row.stage ?? row.primary_stage),
    is_active: typeof row.is_active === "boolean" ? row.is_active : null,
    updated_at: row.updated_at ?? null,
    last_interaction_at: row.last_interaction_at ?? null,
    created_by_crm_user_id: row.created_by_crm_user_id ?? null,
    is_deleted: row.is_deleted ?? false,
    deleted_at: row.deleted_at ?? null,
  };
}

export interface OwnerFilterState {
  userId: string | null; // filter by specific owner
  role: "PRIMARY" | "SECONDARY" | "ANY" | null; // which role to match
  unassigned: boolean; // show only unassigned (no active PRIMARY)
}

const EMPTY_OWNER_FILTER: OwnerFilterState = { userId: null, role: null, unassigned: false };

const PAGE_SIZE = 50;

// ── Hook ─────────────────────────────────────────────────────────
export function useContactsV2Data() {
  const { session, loading: authLoading, crmUser } = useAuth();
  const crmUserId = crmUser?.id ?? null;

  const [rows, setRows] = useState<ContactV2Row[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("directory");
  const [stageFilter, setStageFilterState] = useState<StageFilter>("ALL");
  const [search, setSearchState] = useState("");
  const [page, setPage] = useState(0);
  const [alphaFilter, setAlphaFilterState] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilterState] = useState<OwnerFilterState>(EMPTY_OWNER_FILTER);

  const [stageCounts, setStageCounts] = useState<Record<StageFilter, number>>({
    ALL: 0,
    COLD_CALLING: 0,
    ASPIRATION: 0,
    ACHIEVEMENT: 0,
  });

  const [myPrimaryStageCounts, setMyPrimaryStageCounts] = useState<Record<StageFilter, number>>({
    ALL: 0,
    COLD_CALLING: 0,
    ASPIRATION: 0,
    ACHIEVEMENT: 0,
  });

  const [mySecondaryStageCounts, setMySecondaryStageCounts] = useState<Record<StageFilter, number>>({
    ALL: 0,
    COLD_CALLING: 0,
    ASPIRATION: 0,
    ACHIEVEMENT: 0,
  });

  // ── Fetch stage counts ─────────────────────────────────────────
  const fetchStageCounts = useCallback(
    async (tab: TabKey) => {
      // No stage counts for deleted or inactive tabs
      if (tab === "deleted" || tab === "inactive") {
        setStageCounts({ ALL: 0, COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0 });
        return;
      }
      try {
        // For my-primary: 2-step fetch from contact_assignments to avoid view inner-join drops
        if (tab === "my-primary") {
          if (!crmUserId) {
            setStageCounts({ ALL: 0, COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0 });
            return;
          }
          // ✅ My Primary: count stages from CONTACTS (source of truth) and exclude deleted contacts
          if (tab === "my-primary") {
            if (!crmUserId) {
              setStageCounts({ ALL: 0, COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0 });
              return;
            }

            const { data: assignments, error: aErr } = await supabase
              .from("contact_assignments")
              .select("contact_id")
              .eq("assigned_to_crm_user_id", crmUserId)
              .eq("assignment_role", "PRIMARY")
              .eq("status", "ACTIVE")
              .is("ended_at", null);

            if (aErr) {
              console.error("My Primary assignment fetch failed:", aErr.message);
              return;
            }

            const contactIds = (assignments ?? []).map((a: any) => a.contact_id).filter(Boolean);

            if (contactIds.length === 0) {
              setStageCounts({ ALL: 0, COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0 });
              return;
            }

            const { data: contacts, error: cErr } = await supabase
              .from("contacts")
              .select("id, stage, deleted_at")
              .in("id", contactIds)
              .is("deleted_at", null);

            if (cErr) {
              console.error("My Primary contacts stage fetch failed:", cErr.message);
              return;
            }

            const counts: Record<StageFilter, number> = { ALL: 0, COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0 };

            (contacts ?? []).forEach((c: any) => {
              const stage = normalizeStage(c.stage);
              if (stage && stage in counts) counts[stage]++;
              counts.ALL++;
            });

            setMyPrimaryStageCounts(counts);
            return;
          }
        }

        // For my-secondary: 2-step fetch from contact_assignments
        if (tab === "my-secondary") {
          if (!crmUserId) {
            setStageCounts({ ALL: 0, COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0 });
            return;
          }
          // Get secondary assignments for this user
          const { data: secAsg, error: sErr } = await supabase
            .from("contact_assignments")
            .select("contact_id")
            .eq("assigned_to_crm_user_id", crmUserId)
            .eq("assignment_role", "SECONDARY")
            .eq("status", "ACTIVE")
            .is("ended_at", null);
          if (sErr) {
            console.error("Stage count fetch failed:", sErr.message);
            return;
          }
          if (!secAsg || secAsg.length === 0) {
            setStageCounts({ ALL: 0, COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0 });
            return;
          }

          // Get primary assignments for those contacts (stage lives on primary assignment)
          const secContactIds = secAsg.map((a: any) => a.contact_id);
          const { data: priAsg } = await supabase
            .from("contact_assignments")
            .select("contact_id, stage")
            .in("contact_id", secContactIds)
            .eq("assignment_role", "PRIMARY")
            .eq("status", "ACTIVE")
            .is("ended_at", null);

          const counts: Record<StageFilter, number> = { ALL: 0, COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0 };
          const stageByContact = new Map<string, string | null>();
          (priAsg || []).forEach((r: any) => stageByContact.set(r.contact_id, r.stage));
          secContactIds.forEach((cid: string) => {
            const stage = normalizeStage(stageByContact.get(cid));
            if (stage && stage in counts) counts[stage]++;
            counts.ALL++;
          });
          setMySecondaryStageCounts(counts);
          return;
        }

        // For directory and other tabs, use the dedicated stage count views
        const view = STAGE_COUNT_VIEW_MAP[tab];
        const { data, error: err } = await supabase.from(view).select("*");
        if (err) {
          console.error("Stage count fetch failed:", err.message);
          return;
        }
        const counts: Record<StageFilter, number> = {
          ALL: 0,
          COLD_CALLING: 0,
          ASPIRATION: 0,
          ACHIEVEMENT: 0,
        };
        (data || []).forEach((r: any) => {
          const stage = normalizeStage(r.stage ?? r.primary_stage);
          const cnt = Number(r.cnt ?? r.count ?? 0);
          if (stage && stage in counts) counts[stage] += cnt;
          counts.ALL += cnt;
        });
        setStageCounts(counts);
      } catch {
        console.error("Stage count fetch exception");
      }
    },
    [crmUserId],
  );

  // ── Fetch paginated contacts ───────────────────────────────────
  const fetchContacts = useCallback(
    async (
      tab: TabKey,
      sf: StageFilter,
      q: string,
      p: number,
      alpha: string | null = null,
      of: OwnerFilterState = EMPTY_OWNER_FILTER,
    ) => {
      if (!session) return;
      setIsLoading(true);
      setError(null);

      const from = p * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Handle Deleted tab separately (query contacts table directly)
      if (tab === "deleted") {
        try {
          let dQuery = supabase
            .from("contacts")
            .select("*, companies(company_name)", { count: "exact" })
            .eq("is_deleted", true)
            .order("full_name", { ascending: true })
            .range(from, to);

          if (q.trim()) {
            dQuery = dQuery.ilike("full_name", `%${q.trim()}%`);
          }
          if (alpha && alpha !== "#") {
            dQuery = dQuery.ilike("full_name", `${alpha}%`);
          }

          const { data, count, error: fetchErr } = await dQuery;
          if (fetchErr) {
            setError(fetchErr.message);
            setRows([]);
            setTotalRows(0);
            return;
          }

          const normalized: ContactV2Row[] = (data || []).map((row: any) =>
            normalize({
              ...row,
              company_name: row.companies?.company_name ?? row.company_name ?? null,
            }),
          );
          setRows(normalized);
          setTotalRows(count ?? normalized.length);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Fetch failed");
          setRows([]);
          setTotalRows(0);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Handle Inactive tab (is_active=false, not deleted)
      if (tab === "inactive") {
        try {
          let iQuery = supabase
            .from("contacts")
            .select("*, companies(company_name)", { count: "exact" })
            .eq("is_active", false)
            .or("is_deleted.is.null,is_deleted.eq.false")
            .order("full_name", { ascending: true })
            .range(from, to);

          if (q.trim()) {
            iQuery = iQuery.ilike("full_name", `%${q.trim()}%`);
          }
          if (alpha && alpha !== "#") {
            iQuery = iQuery.ilike("full_name", `${alpha}%`);
          }

          const { data, count, error: fetchErr } = await iQuery;
          if (fetchErr) {
            setError(fetchErr.message);
            setRows([]);
            setTotalRows(0);
            return;
          }

          const normalized: ContactV2Row[] = (data || []).map((row: any) =>
            normalize({
              ...row,
              company_name: row.companies?.company_name ?? row.company_name ?? null,
            }),
          );
          setRows(normalized);
          setTotalRows(count ?? normalized.length);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Fetch failed");
          setRows([]);
          setTotalRows(0);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // ── My Primary: 2-step assignment-first fetch (no inner joins) ──
      if (tab === "my-primary") {
        try {
          if (!crmUserId) {
            setRows([]);
            setTotalRows(0);
            setStageCounts({ ALL: 0, COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0 });
            setIsLoading(false);
            return;
          }

          // STEP 1: fetch all assignment contact_ids + stage
          const { data: assignments, error: aErr } = await supabase
            .from("contact_assignments")
            .select("contact_id, stage")
            .eq("assigned_to_crm_user_id", crmUserId)
            .eq("assignment_role", "PRIMARY")
            .eq("status", "ACTIVE")
            .is("ended_at", null);
          if (aErr) {
            setError(aErr.message);
            setRows([]);
            setTotalRows(0);
            setIsLoading(false);
            return;
          }
          if (!assignments || assignments.length === 0) {
            setRows([]);
            setTotalRows(0);
            setStageCounts({ ALL: 0, COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0 });
            setIsLoading(false);
            return;
          }

          // Build stage map from assignments
          const stageMap = new Map<string, string | null>();
          assignments.forEach((a: any) => stageMap.set(a.contact_id, a.stage));
          const allAssignmentIds = Array.from(stageMap.keys());

          // STEP 1b: Fetch ALL contact IDs that actually exist (not deleted) to compute accurate stage counts
          const { data: validContacts, error: vcErr } = await supabase
            .from("contacts")
            .select("id")
            .in("id", allAssignmentIds)
            .is("deleted_at", null);
          if (vcErr) {
            setError(vcErr.message);
            setRows([]);
            setTotalRows(0);
            setIsLoading(false);
            return;
          }

          // Compute stage counts from the intersection of assignments + valid contacts
          const validIdSet = new Set((validContacts || []).map((c: any) => c.id));
          const computedCounts: Record<StageFilter, number> = {
            ALL: 0,
            COLD_CALLING: 0,
            ASPIRATION: 0,
            ACHIEVEMENT: 0,
          };
          stageMap.forEach((stage, contactId) => {
            if (!validIdSet.has(contactId)) return;
            const normalized = normalizeStage(stage);
            if (normalized && normalized in computedCounts) computedCounts[normalized]++;
            computedCounts.ALL++;
          });
          // Do NOT override stage counts for my-primary / my-secondary. // Those are computed separately to guarantee they match DB truth. if (tab !== 'my-primary' && tab !== 'my-secondary') {   setStageCounts(computedCounts); }

          // Apply stage filter to narrow contact IDs for the table
          let filteredIds = Array.from(validIdSet);
          if (sf !== "ALL") {
            filteredIds = filteredIds.filter((id) => normalizeStage(stageMap.get(id)) === sf);
          }
          if (filteredIds.length === 0) {
            setRows([]);
            setTotalRows(0);
            setIsLoading(false);
            return;
          }

          // STEP 2: fetch contacts by IDs for display (NO joins)
          let cQuery = supabase
            .from("contacts")
            .select(
              "id, full_name, email, designation, phone, country_code, company_id, is_active, updated_at, created_by_crm_user_id, is_deleted, deleted_at",
              { count: "exact" },
            )
            .in("id", filteredIds)
            .is("deleted_at", null);

          if (q.trim()) {
            cQuery = cQuery.ilike("full_name", `%${q.trim()}%`);
          }
          if (alpha && alpha !== "#") {
            cQuery = cQuery.ilike("full_name", `${alpha}%`);
          } else if (alpha === "#") {
            cQuery = cQuery
              .not("full_name", "ilike", "a%")
              .not("full_name", "ilike", "b%")
              .not("full_name", "ilike", "c%")
              .not("full_name", "ilike", "d%")
              .not("full_name", "ilike", "e%")
              .not("full_name", "ilike", "f%")
              .not("full_name", "ilike", "g%")
              .not("full_name", "ilike", "h%")
              .not("full_name", "ilike", "i%")
              .not("full_name", "ilike", "j%")
              .not("full_name", "ilike", "k%")
              .not("full_name", "ilike", "l%")
              .not("full_name", "ilike", "m%")
              .not("full_name", "ilike", "n%")
              .not("full_name", "ilike", "o%")
              .not("full_name", "ilike", "p%")
              .not("full_name", "ilike", "q%")
              .not("full_name", "ilike", "r%")
              .not("full_name", "ilike", "s%")
              .not("full_name", "ilike", "t%")
              .not("full_name", "ilike", "u%")
              .not("full_name", "ilike", "v%")
              .not("full_name", "ilike", "w%")
              .not("full_name", "ilike", "x%")
              .not("full_name", "ilike", "y%")
              .not("full_name", "ilike", "z%");
          }

          cQuery = cQuery.order("full_name", { ascending: true }).range(from, to);

          const { data: contacts, count: cCount, error: cErr } = await cQuery;
          if (cErr) {
            setError(cErr.message);
            setRows([]);
            setTotalRows(0);
            setIsLoading(false);
            return;
          }

          // Lookup company names
          const companyIds = [...new Set((contacts || []).map((c: any) => c.company_id).filter(Boolean))];
          let companyMap = new Map<string, string>();
          if (companyIds.length > 0) {
            const { data: companies } = await supabase
              .from("companies")
              .select("id, company_name")
              .in("id", companyIds);
            (companies || []).forEach((co: any) => companyMap.set(co.id, co.company_name));
          }

          const normalized: ContactV2Row[] = (contacts || []).map((row: any) => ({
            id: row.id,
            full_name: row.full_name || "",
            company_name: row.company_id ? (companyMap.get(row.company_id) ?? null) : null,
            designation: row.designation ?? null,
            email: row.email ?? null,
            phone: row.phone ?? null,
            country_code: row.country_code ?? null,
            primary_owner: null,
            primary_owner_id: crmUserId,
            secondary_owner: null,
            secondary_owner_id: null,
            stage: normalizeStage(stageMap.get(row.id)),
            is_active: typeof row.is_active === "boolean" ? row.is_active : null,
            updated_at: row.updated_at ?? null,
            last_interaction_at: null,
            created_by_crm_user_id: row.created_by_crm_user_id ?? null,
            is_deleted: row.is_deleted ?? false,
            deleted_at: row.deleted_at ?? null,
          }));

          setRows(normalized);
          setTotalRows(cCount ?? normalized.length);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Fetch failed");
          setRows([]);
          setTotalRows(0);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // ── My Secondary: 2-step assignment-first fetch ──
      if (tab === "my-secondary") {
        try {
          if (!crmUserId) {
            setRows([]);
            setTotalRows(0);
            setIsLoading(false);
            return;
          }

          // STEP 1: fetch secondary assignment contact_ids
          const { data: secAsg, error: sErr } = await supabase
            .from("contact_assignments")
            .select("contact_id")
            .eq("assigned_to_crm_user_id", crmUserId)
            .eq("assignment_role", "SECONDARY")
            .eq("status", "ACTIVE")
            .is("ended_at", null);
          if (sErr) {
            setError(sErr.message);
            setRows([]);
            setTotalRows(0);
            setIsLoading(false);
            return;
          }
          if (!secAsg || secAsg.length === 0) {
            setRows([]);
            setTotalRows(0);
            setIsLoading(false);
            return;
          }

          const contactIds = secAsg.map((a: any) => a.contact_id);

          // STEP 2: fetch primary assignments for these contacts (stage + primary owner)
          const { data: priAsg } = await supabase
            .from("contact_assignments")
            .select("contact_id, assigned_to_crm_user_id, stage")
            .in("contact_id", contactIds)
            .eq("assignment_role", "PRIMARY")
            .eq("status", "ACTIVE")
            .is("ended_at", null);

          const primaryMap = new Map<string, { ownerId: string | null; stage: string | null }>();
          (priAsg || []).forEach((r: any) =>
            primaryMap.set(r.contact_id, { ownerId: r.assigned_to_crm_user_id, stage: r.stage }),
          );

          // Apply stage filter
          let filteredIds = contactIds;
          if (sf !== "ALL") {
            filteredIds = contactIds.filter((id: string) => normalizeStage(primaryMap.get(id)?.stage) === sf);
          }
          if (filteredIds.length === 0) {
            setRows([]);
            setTotalRows(0);
            setIsLoading(false);
            return;
          }

          // STEP 3: fetch contacts by IDs
          let cQuery = supabase
            .from("contacts")
            .select(
              "id, full_name, email, designation, phone, country_code, company_id, is_active, updated_at, created_by_crm_user_id, is_deleted, deleted_at",
              { count: "exact" },
            )
            .in("id", filteredIds)
            .is("deleted_at", null);

          if (q.trim()) {
            cQuery = cQuery.ilike("full_name", `%${q.trim()}%`);
          }
          if (alpha && alpha !== "#") {
            cQuery = cQuery.ilike("full_name", `${alpha}%`);
          } else if (alpha === "#") {
            cQuery = cQuery
              .not("full_name", "ilike", "a%")
              .not("full_name", "ilike", "b%")
              .not("full_name", "ilike", "c%")
              .not("full_name", "ilike", "d%")
              .not("full_name", "ilike", "e%")
              .not("full_name", "ilike", "f%")
              .not("full_name", "ilike", "g%")
              .not("full_name", "ilike", "h%")
              .not("full_name", "ilike", "i%")
              .not("full_name", "ilike", "j%")
              .not("full_name", "ilike", "k%")
              .not("full_name", "ilike", "l%")
              .not("full_name", "ilike", "m%")
              .not("full_name", "ilike", "n%")
              .not("full_name", "ilike", "o%")
              .not("full_name", "ilike", "p%")
              .not("full_name", "ilike", "q%")
              .not("full_name", "ilike", "r%")
              .not("full_name", "ilike", "s%")
              .not("full_name", "ilike", "t%")
              .not("full_name", "ilike", "u%")
              .not("full_name", "ilike", "v%")
              .not("full_name", "ilike", "w%")
              .not("full_name", "ilike", "x%")
              .not("full_name", "ilike", "y%")
              .not("full_name", "ilike", "z%");
          }

          cQuery = cQuery.order("full_name", { ascending: true }).range(from, to);
          const { data: contacts, count: cCount, error: cErr } = await cQuery;
          if (cErr) {
            setError(cErr.message);
            setRows([]);
            setTotalRows(0);
            setIsLoading(false);
            return;
          }

          // STEP 4: lookup company names
          const companyIds = [...new Set((contacts || []).map((c: any) => c.company_id).filter(Boolean))];
          let companyMap = new Map<string, string>();
          if (companyIds.length > 0) {
            const { data: companies } = await supabase
              .from("companies")
              .select("id, company_name")
              .in("id", companyIds);
            (companies || []).forEach((co: any) => companyMap.set(co.id, co.company_name));
          }

          // STEP 5: lookup primary owner names
          const ownerIds = [...new Set([...(priAsg || []).map((r: any) => r.assigned_to_crm_user_id)].filter(Boolean))];
          let ownerNameMap = new Map<string, string>();
          if (ownerIds.length > 0) {
            const { data: owners } = await supabase.from("crm_users").select("id, full_name").in("id", ownerIds);
            (owners || []).forEach((o: any) => ownerNameMap.set(o.id, o.full_name));
          }

          const normalized: ContactV2Row[] = (contacts || []).map((row: any) => {
            const pri = primaryMap.get(row.id);
            return {
              id: row.id,
              full_name: row.full_name || "",
              company_name: row.company_id ? (companyMap.get(row.company_id) ?? null) : null,
              designation: row.designation ?? null,
              email: row.email ?? null,
              phone: row.phone ?? null,
              country_code: row.country_code ?? null,
              primary_owner: pri?.ownerId ? (ownerNameMap.get(pri.ownerId) ?? "—") : "—",
              primary_owner_id: pri?.ownerId ?? null,
              secondary_owner: null,
              secondary_owner_id: crmUserId,
              stage: normalizeStage(pri?.stage),
              is_active: typeof row.is_active === "boolean" ? row.is_active : null,
              updated_at: row.updated_at ?? null,
              last_interaction_at: null,
              created_by_crm_user_id: row.created_by_crm_user_id ?? null,
              is_deleted: row.is_deleted ?? false,
              deleted_at: row.deleted_at ?? null,
            };
          });

          setRows(normalized);
          setTotalRows(cCount ?? normalized.length);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Fetch failed");
          setRows([]);
          setTotalRows(0);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      const view = VIEW_MAP[tab];
      const stageColumn = tab === "directory" ? "primary_stage" : "stage";

      try {
        let query = supabase
          .from(view)
          .select("*", { count: "exact" })
          .order("full_name", { ascending: true })
          .range(from, to);

        if (sf !== "ALL") {
          query = query.eq(stageColumn, sf);
        }

        if (q.trim()) {
          const term = q.trim();
          if (tab === "directory") {
            query = query.or(`full_name.ilike.%${term}%,company_name.ilike.%${term}%`);
          } else {
            query = query.or(
              `full_name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%,primary_phone.ilike.%${term}%`,
            );
          }
        }

        // A-Z alpha filter
        if (alpha && alpha !== "#") {
          query = query.ilike("full_name", `${alpha}%`);
        } else if (alpha === "#") {
          query = query
            .not("full_name", "ilike", "a%")
            .not("full_name", "ilike", "b%")
            .not("full_name", "ilike", "c%")
            .not("full_name", "ilike", "d%")
            .not("full_name", "ilike", "e%")
            .not("full_name", "ilike", "f%")
            .not("full_name", "ilike", "g%")
            .not("full_name", "ilike", "h%")
            .not("full_name", "ilike", "i%")
            .not("full_name", "ilike", "j%")
            .not("full_name", "ilike", "k%")
            .not("full_name", "ilike", "l%")
            .not("full_name", "ilike", "m%")
            .not("full_name", "ilike", "n%")
            .not("full_name", "ilike", "o%")
            .not("full_name", "ilike", "p%")
            .not("full_name", "ilike", "q%")
            .not("full_name", "ilike", "r%")
            .not("full_name", "ilike", "s%")
            .not("full_name", "ilike", "t%")
            .not("full_name", "ilike", "u%")
            .not("full_name", "ilike", "v%")
            .not("full_name", "ilike", "w%")
            .not("full_name", "ilike", "x%")
            .not("full_name", "ilike", "y%")
            .not("full_name", "ilike", "z%");
        }

        // Owner filter (Directory only)
        if (tab === "directory" && of.unassigned) {
          query = query.is("primary_owner_id", null);
        } else if (tab === "directory" && of.userId) {
          if (of.role === "PRIMARY") {
            query = query.eq("primary_owner_id", of.userId);
          } else if (of.role === "SECONDARY") {
            query = query.eq("secondary_owner_id", of.userId);
          } else {
            query = query.or(`primary_owner_id.eq.${of.userId},secondary_owner_id.eq.${of.userId}`);
          }
        }

        const { data, count, error: fetchErr } = await query;

        if (fetchErr) {
          setError(fetchErr.message);
          setRows([]);
          setTotalRows(0);
          return;
        }

        const normalized: ContactV2Row[] = [];
        (data || []).forEach((row: any) => {
          try {
            normalized.push(normalize(row));
          } catch (e) {
            console.warn("Skipping row:", e instanceof Error ? e.message : e);
          }
        });

        // For Directory tab, merge owner names from v_directory_owner_snapshot
        if (tab === "directory" && normalized.length > 0) {
          const contactIds = normalized.map((r) => r.id);
          const { data: snapshotData } = await supabase
            .from("v_directory_owner_snapshot")
            .select("contact_id, primary_owner_id, primary_owner_name, secondary_owner_id, secondary_owner_name")
            .in("contact_id", contactIds);

          if (snapshotData && snapshotData.length > 0) {
            const snapshotMap = new Map<string, any>();
            snapshotData.forEach((s: any) => snapshotMap.set(s.contact_id, s));
            normalized.forEach((row) => {
              const snap = snapshotMap.get(row.id);
              if (snap) {
                row.primary_owner_id = snap.primary_owner_id ?? row.primary_owner_id;
                row.primary_owner = snap.primary_owner_name ?? row.primary_owner;
                row.secondary_owner_id = snap.secondary_owner_id ?? row.secondary_owner_id;
                row.secondary_owner = snap.secondary_owner_name ?? row.secondary_owner;
              }
            });
          }
        }

        setRows(normalized);
        setTotalRows(count ?? normalized.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fetch failed");
        setRows([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [session, crmUserId],
  );

  // ── Combined fetch ─────────────────────────────────────────────
  const fetchAll = useCallback(
    async (
      tab: TabKey,
      sf: StageFilter,
      q: string,
      p: number,
      alpha: string | null = null,
      of: OwnerFilterState = EMPTY_OWNER_FILTER,
    ) => {
      await Promise.all([fetchStageCounts(tab), fetchContacts(tab, sf, q, p, alpha, of)]);
    },
    [fetchStageCounts, fetchContacts],
  );

  // ── Tab change ─────────────────────────────────────────────────
  const changeTab = useCallback(
    (tab: TabKey) => {
      setActiveTab(tab);
      const defaultStage: StageFilter = tab === "my-primary" ? "COLD_CALLING" : "ALL";
      setStageFilterState(defaultStage);
      setSearchState("");
      setPage(0);
      setAlphaFilterState(null);
      setOwnerFilterState(EMPTY_OWNER_FILTER);
      fetchAll(tab, defaultStage, "", 0, null, EMPTY_OWNER_FILTER);
    },
    [fetchAll],
  );

  // ── Stage filter change ────────────────────────────────────────
  const setStageFilter = useCallback(
    (sf: StageFilter) => {
      setStageFilterState(sf);
      setPage(0);
      fetchContacts(activeTab, sf, search, 0, alphaFilter, ownerFilter);
    },
    [activeTab, search, alphaFilter, ownerFilter, fetchContacts],
  );

  // ── Search change ──────────────────────────────────────────────
  const setSearch = useCallback(
    (q: string) => {
      setSearchState(q);
      setPage(0);
      fetchContacts(activeTab, stageFilter, q, 0, alphaFilter, ownerFilter);
    },
    [activeTab, stageFilter, alphaFilter, ownerFilter, fetchContacts],
  );

  // ── Alpha filter change ────────────────────────────────────────
  const setAlphaFilter = useCallback(
    (alpha: string | null) => {
      setAlphaFilterState(alpha);
      setPage(0);
      fetchContacts(activeTab, stageFilter, search, 0, alpha, ownerFilter);
    },
    [activeTab, stageFilter, search, ownerFilter, fetchContacts],
  );

  // ── Owner filter change ────────────────────────────────────────
  const setOwnerFilter = useCallback(
    (of: OwnerFilterState) => {
      setOwnerFilterState(of);
      setPage(0);
      fetchContacts(activeTab, stageFilter, search, 0, alphaFilter, of);
    },
    [activeTab, stageFilter, search, alphaFilter, fetchContacts],
  );

  // ── Page change ────────────────────────────────────────────────
  const changePage = useCallback(
    (p: number) => {
      setPage(p);
      fetchContacts(activeTab, stageFilter, search, p, alphaFilter, ownerFilter);
    },
    [activeTab, stageFilter, search, alphaFilter, ownerFilter, fetchContacts],
  );

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  return {
    activeTab,
    stageFilter,
    search,
    alphaFilter,
    ownerFilter,
    page,
    isLoading,
    error,
    authLoading,
    rows,
    totalRows,
    totalPages,
    stageCounts,
    myPrimaryStageCounts,
    mySecondaryStageCounts,
    changeTab,
    setStageFilter,
    setSearch,
    setAlphaFilter,
    setOwnerFilter,
    changePage,
    refresh: () => fetchAll(activeTab, stageFilter, search, page, alphaFilter, ownerFilter),
    fetchAll,
  };
}
