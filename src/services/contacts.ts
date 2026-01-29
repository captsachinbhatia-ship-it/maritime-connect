import { supabase } from '@/lib/supabaseClient';
import type { Contact, ContactWithCompany, CreateContactPayload, ContactFilters, ContactAssignment } from '@/types';

export type StageType = 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT';

interface LastInteractionData {
  contact_id: string;
  last_interaction_at: string | null;
  last_interaction_type: string | null;
  last_interaction_outcome: string | null;
}

export async function listContactsByStage(
  stage: StageType,
  filters: ContactFilters = {}
): Promise<{
  data: ContactWithCompany[] | null;
  error: string | null;
}> {
  try {
    // First get contact IDs that match the stage from contact_assignments
    const { data: assignments, error: assignmentError } = await supabase
      .from('contact_assignments')
      .select('contact_id')
      .eq('stage', stage)
      .eq('status', 'ACTIVE');

    if (assignmentError) {
      return { data: null, error: assignmentError.message };
    }

    if (!assignments || assignments.length === 0) {
      return { data: [], error: null };
    }

    const contactIds = assignments.map(a => a.contact_id);

    // Fetch contacts with those IDs
    let query = supabase
      .from('contacts')
      .select(`
        id,
        full_name,
        company_id,
        designation,
        country_code,
        phone,
        phone_type,
        email,
        ice_handle,
        preferred_channel,
        notes,
        is_active,
        updated_at
      `)
      .in('id', contactIds)
      .order('full_name', { ascending: true });

    // Apply search filter
    if (filters.search && filters.search.trim()) {
      query = query.ilike('full_name', `%${filters.search.trim()}%`);
    }

    const { data: contacts, error: contactsError } = await query;

    if (contactsError) {
      return { data: null, error: contactsError.message };
    }

    if (!contacts || contacts.length === 0) {
      return { data: [], error: null };
    }

    // Fetch last interaction data from v_contacts_last_interaction view
    const { data: lastInteractions, error: liError } = await supabase
      .from('v_contacts_last_interaction')
      .select('contact_id, last_interaction_at, last_interaction_type, last_interaction_outcome')
      .in('contact_id', contactIds);

    // Build a map for quick lookup
    const liMap: Record<string, LastInteractionData> = {};
    if (!liError && lastInteractions) {
      lastInteractions.forEach((li: LastInteractionData) => {
        liMap[li.contact_id] = li;
      });
    }

    // Merge last interaction data into contacts
    const contactsWithLI = contacts.map(contact => {
      const li = liMap[contact.id];
      return {
        ...contact,
        last_interaction_at: li?.last_interaction_at || null,
        last_interaction_type: li?.last_interaction_type || null,
        last_interaction_outcome: li?.last_interaction_outcome || null,
      };
    });

    return { data: contactsWithLI as ContactWithCompany[], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

export async function getCompanyNamesMap(companyIds: string[]): Promise<{
  data: Record<string, string> | null;
  error: string | null;
}> {
  try {
    if (companyIds.length === 0) {
      return { data: {}, error: null };
    }

    const uniqueIds = [...new Set(companyIds)];

    const { data, error } = await supabase
      .from('companies')
      .select('id, company_name')
      .in('id', uniqueIds);

    if (error) {
      return { data: null, error: error.message };
    }

    const nameMap: Record<string, string> = {};
    data?.forEach(company => {
      nameMap[company.id] = company.company_name || 'Unknown';
    });

    return { data: nameMap, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

export async function checkDuplicateContact(
  email: string | null,
  phone: string | null
): Promise<{
  isDuplicate: boolean;
  duplicateField: 'email' | 'phone' | null;
  error: string | null;
}> {
  try {
    // Check by email if provided
    if (email && email.trim()) {
      const { data: emailMatch, error: emailError } = await supabase
        .from('contacts')
        .select('id')
        .ilike('email', email.trim())
        .limit(1);

      if (emailError) {
        return { isDuplicate: false, duplicateField: null, error: emailError.message };
      }

      if (emailMatch && emailMatch.length > 0) {
        return { isDuplicate: true, duplicateField: 'email', error: null };
      }
    }

    // Check by phone if provided
    if (phone && phone.trim()) {
      const { data: phoneMatch, error: phoneError } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', phone.trim())
        .limit(1);

      if (phoneError) {
        return { isDuplicate: false, duplicateField: null, error: phoneError.message };
      }

      if (phoneMatch && phoneMatch.length > 0) {
        return { isDuplicate: true, duplicateField: 'phone', error: null };
      }
    }

    return { isDuplicate: false, duplicateField: null, error: null };
  } catch (err) {
    return {
      isDuplicate: false,
      duplicateField: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

export async function createContact(
  payload: CreateContactPayload,
  userId: string
): Promise<{
  data: Contact | null;
  error: string | null;
}> {
  try {
    // Insert contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        full_name: payload.full_name.trim(),
        company_id: payload.company_id || null,
        designation: payload.designation || null,
        country_code: payload.country_code || null,
        phone: payload.phone || null,
        phone_type: payload.phone_type || null,
        email: payload.email || null,
        ice_handle: payload.ice_handle || null,
        preferred_channel: payload.preferred_channel || null,
        notes: payload.notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (contactError) {
      return { data: null, error: contactError.message };
    }

    // Create contact assignment with default ASPIRATION stage
    const { error: assignmentError } = await supabase
      .from('contact_assignments')
      .insert({
        contact_id: contact.id,
        stage: 'ASPIRATION',
        status: 'ACTIVE',
        assigned_to: userId,
      });

    if (assignmentError) {
      console.error('Assignment creation failed:', assignmentError.message);
      // Don't fail the whole operation - contact was created
    }

    return { data: contact as Contact, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

export async function getAllCompaniesForDropdown(): Promise<{
  data: { id: string; company_name: string }[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id, company_name')
      .order('company_name', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}
