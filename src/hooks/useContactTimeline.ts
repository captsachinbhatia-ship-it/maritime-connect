import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ---------------------------------------------------------------------------
// Timeline item — the unified shape rendered by ContactTimeline
// ---------------------------------------------------------------------------

export type TimelineItemType = 'interaction' | 'followup' | 'stage_change' | 'enquiry';

export interface TimelineItem {
  id: string;
  date: string; // ISO string
  type: TimelineItemType;
  title: string;
  subtitle?: string;
  actor?: string;
  badge?: string;
  /** Interaction-specific: outcome string */
  outcome?: string | null;
  /** Followup-specific: status */
  status?: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export function useContactTimeline(contactId: string | null, enabled: boolean) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchTimeline = useCallback(async () => {
    if (!contactId) return;
    setIsLoading(true);
    setError(null);

    try {
      const [interactionsRes, followupsRes, assignmentsRes, enquiriesRes] = await Promise.all([
        // Interactions
        supabase
          .from('contact_interactions')
          .select('id, interaction_at, interaction_type, outcome, subject, notes, user_id, crm_users!ci_user_id_fkey(full_name)')
          .eq('contact_id', contactId)
          .order('interaction_at', { ascending: false }),

        // Follow-ups
        supabase
          .from('contact_followups')
          .select('id, due_at, followup_type, followup_reason, notes, status, created_by, crm_users!contact_followups_created_by_fkey(full_name)')
          .eq('contact_id', contactId)
          .order('due_at', { ascending: false }),

        // Assignments (stage changes)
        supabase
          .from('contact_assignments')
          .select('id, assigned_at, stage, assignment_role, status, assigned_to_crm_user_id, crm_users!contact_assignments_assigned_to_crm_user_fk(full_name)')
          .eq('contact_id', contactId)
          .order('assigned_at', { ascending: false }),

        // Enquiries
        supabase
          .from('enquiries')
          .select('id, created_at, enquiry_number, cargo_type, status, subject')
          .or(`contact_id.eq.${contactId},source_contact_id.eq.${contactId}`)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
      ]);

      const merged: TimelineItem[] = [];

      // Map interactions
      if (interactionsRes.data) {
        for (const i of interactionsRes.data) {
          const actor = (i as any).crm_users?.full_name ?? null;
          merged.push({
            id: `int-${i.id}`,
            date: i.interaction_at,
            type: 'interaction',
            title: (i.interaction_type || 'NOTE').replace(/_/g, ' '),
            subtitle: i.subject || i.notes?.slice(0, 120) || undefined,
            actor: actor || undefined,
            outcome: i.outcome,
          });
        }
      }

      // Map follow-ups
      if (followupsRes.data) {
        for (const f of followupsRes.data) {
          const actor = (f as any).crm_users?.full_name ?? null;
          merged.push({
            id: `fu-${f.id}`,
            date: f.due_at,
            type: 'followup',
            title: f.followup_reason || `${(f.followup_type || 'OTHER')} follow-up`,
            subtitle: f.notes?.slice(0, 120) || undefined,
            actor: actor || undefined,
            badge: f.status,
            status: f.status,
          });
        }
      }

      // Map assignments → stage changes
      if (assignmentsRes.data) {
        for (const a of assignmentsRes.data) {
          const actor = (a as any).crm_users?.full_name ?? null;
          merged.push({
            id: `stg-${a.id}`,
            date: a.assigned_at,
            type: 'stage_change',
            title: `${(a.stage || 'Unknown').replace(/_/g, ' ')} — ${a.assignment_role || 'assignment'}`,
            subtitle: `Status: ${a.status}`,
            actor: actor || undefined,
            badge: a.stage || undefined,
          });
        }
      }

      // Map enquiries
      if (enquiriesRes.data) {
        for (const e of enquiriesRes.data) {
          merged.push({
            id: `enq-${e.id}`,
            date: e.created_at,
            type: 'enquiry',
            title: `Enquiry ${e.enquiry_number}`,
            subtitle: [e.cargo_type, e.subject].filter(Boolean).join(' — ') || undefined,
            badge: e.status,
          });
        }
      }

      // Sort descending by date
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setItems(merged);

      // Check for fetch errors (non-fatal — show partial data)
      const errors = [interactionsRes.error, followupsRes.error, assignmentsRes.error, enquiriesRes.error]
        .filter(Boolean)
        .map((e) => e!.message);
      if (errors.length > 0) {
        setError(`Partial data — some sources failed: ${errors.join('; ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  // Fetch on mount / when enabled
  useEffect(() => {
    if (enabled && contactId) {
      fetchTimeline();
    }
  }, [enabled, contactId, fetchTimeline]);

  // Listen for dashboard:refresh events
  useEffect(() => {
    if (!enabled || !contactId) return;
    const handler = () => fetchTimeline();
    window.addEventListener('dashboard:refresh', handler);
    return () => window.removeEventListener('dashboard:refresh', handler);
  }, [enabled, contactId, fetchTimeline]);

  const loadMore = () => setVisibleCount((c) => c + PAGE_SIZE);
  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return {
    items: visibleItems,
    totalCount: items.length,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch: fetchTimeline,
  };
}
