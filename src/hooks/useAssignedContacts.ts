import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface AssignedContactOption {
  id: string;
  full_name: string;
  company_name: string | null;
}

/**
 * Fetches all contacts assigned to a CRM user as PRIMARY or SECONDARY
 * using the same two-step strategy as MyContactsTab / SecondaryContactsTab:
 *   Step 1 – fetch assignment rows (no joins)
 *   Step 2 – fetch contacts by ID
 * This guarantees the dropdown matches those pages exactly.
 */
export function useAssignedContacts(crmUserId: string | null, enabled: boolean) {
  const [contacts, setContacts] = useState<AssignedContactOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!crmUserId) { setContacts([]); return; }
    setLoading(true);
    try {
      // STEP 1: assignment rows only
      const { data: assignments, error: aErr } = await supabase
        .from('contact_assignments')
        .select('contact_id')
        .eq('assigned_to_crm_user_id', crmUserId)
        .in('assignment_role', ['PRIMARY', 'SECONDARY'])
        .eq('status', 'ACTIVE')
        .is('ended_at', null);

      if (aErr || !assignments || assignments.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      // De-duplicate contact IDs
      const contactIds = [...new Set(assignments.map((a: any) => a.contact_id))];

      // STEP 2: fetch contacts by ID
      const { data: contactData, error: cErr } = await supabase
        .from('contacts')
        .select('id, full_name, company_id')
        .in('id', contactIds)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('full_name', { ascending: true });

      if (cErr || !contactData) {
        setContacts([]);
        setLoading(false);
        return;
      }

      // Resolve company names
      const companyIds = [...new Set(contactData.map((c: any) => c.company_id).filter(Boolean))];
      const companyMap = new Map<string, string>();
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, company_name')
          .in('id', companyIds);
        (companies || []).forEach((co: any) => companyMap.set(co.id, co.company_name));
      }

      const list: AssignedContactOption[] = contactData.map((c: any) => ({
        id: c.id,
        full_name: c.full_name || 'Unknown',
        company_name: c.company_id ? (companyMap.get(c.company_id) ?? null) : null,
      }));

      setContacts(list);
    } catch (err) {
      console.error('useAssignedContacts error:', err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [crmUserId]);

  useEffect(() => {
    if (enabled) fetch();
  }, [enabled, fetch]);

  return { contacts, loading, refetch: fetch };
}
