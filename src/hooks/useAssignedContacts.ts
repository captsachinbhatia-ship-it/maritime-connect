import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface AssignedContactOption {
  id: string;
  full_name: string;
  company_name: string | null;
}

/**
 * Fetches ALL contacts assigned to a CRM user as PRIMARY or SECONDARY
 * using the same two-step strategy as MyContactsTab / SecondaryContactsTab.
 * No hard limits — handles 500+ contacts via chunked .in() calls.
 */
export function useAssignedContacts(crmUserId: string | null, enabled: boolean) {
  const [contacts, setContacts] = useState<AssignedContactOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!crmUserId) { setContacts([]); return; }
    setLoading(true);
    try {
      // STEP 1: Fetch ALL assignment rows (no limit)
      let allAssignments: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('contact_assignments')
          .select('contact_id')
          .eq('assigned_to_crm_user_id', crmUserId)
          .in('assignment_role', ['PRIMARY', 'SECONDARY'])
          .eq('status', 'ACTIVE')
          .is('ended_at', null)
          .range(from, from + pageSize - 1);

        if (error) { console.error('Assignment fetch error:', error.message); break; }
        if (!data || data.length === 0) break;
        allAssignments = allAssignments.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      if (allAssignments.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      // De-duplicate contact IDs
      const contactIds = [...new Set(allAssignments.map((a: any) => a.contact_id))];

      // STEP 2: Fetch contacts by ID in chunks of 200
      const batchSize = 200;
      let allContactData: any[] = [];
      for (let i = 0; i < contactIds.length; i += batchSize) {
        const chunk = contactIds.slice(i, i + batchSize);
        const { data: contactData, error: cErr } = await supabase
          .from('contacts')
          .select('id, full_name, company_id, companies(name)')
          .in('id', chunk)
          .eq('is_active', true)
          .eq('is_deleted', false)
          .order('full_name', { ascending: true });

        if (cErr) { console.error('Contact fetch error:', cErr.message); continue; }
        if (contactData) allContactData = allContactData.concat(contactData);
      }

      // De-dup by contact id and build final list
      const seen = new Set<string>();
      const list: AssignedContactOption[] = [];
      for (const c of allContactData) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        list.push({
          id: c.id,
          full_name: c.full_name || 'Unknown',
          company_name: c.companies?.name || null,
        });
      }

      // Sort by full_name
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setContacts(list);
    } catch (err) {
      console.error('useAssignedContacts error:', err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [crmUserId]);

  useEffect(() => {
    if (enabled) fetchContacts();
  }, [enabled, fetchContacts]);

  return { contacts, loading, refetch: fetchContacts };
}
