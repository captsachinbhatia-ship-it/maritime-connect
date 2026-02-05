import { supabase } from '@/lib/supabaseClient';

export interface ContactForDuplicateCheck {
  id: string;
  full_name: string | null;
  email: string | null;
  company_id: string | null;
  company_name?: string | null;
  stage?: string | null;
  phones: string[];
}

/**
 * Fetch all contacts with their phone numbers for duplicate detection
 * Returns a lightweight dataset optimized for client-side matching
 */
export async function fetchContactsForDuplicateCheck(): Promise<{
  data: ContactForDuplicateCheck[] | null;
  error: string | null;
}> {
  try {
    // Fetch contacts with basic info
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select(`
        id,
        full_name,
        email,
        company_id,
        companies:company_id (
          company_name
        )
      `)
      .eq('is_active', true);

    if (contactsError) {
      return { data: null, error: contactsError.message };
    }

    if (!contacts || contacts.length === 0) {
      return { data: [], error: null };
    }

    const contactIds = contacts.map(c => c.id);

    // Fetch phone numbers for all contacts
    const { data: phones, error: phonesError } = await supabase
      .from('contact_phones')
      .select('contact_id, phone_number')
      .in('contact_id', contactIds);

    if (phonesError) {
      console.error('Error fetching phones for duplicate check:', phonesError);
      // Continue without phones rather than failing
    }

    // Fetch active assignments to get stage
    const { data: assignments, error: assignmentsError } = await supabase
      .from('contact_assignments')
      .select('contact_id, stage')
      .in('contact_id', contactIds)
      .eq('status', 'ACTIVE');

    if (assignmentsError) {
      console.error('Error fetching assignments for duplicate check:', assignmentsError);
    }

    // Build phone map
    const phoneMap: Record<string, string[]> = {};
    phones?.forEach(p => {
      if (!phoneMap[p.contact_id]) {
        phoneMap[p.contact_id] = [];
      }
      if (p.phone_number) {
        phoneMap[p.contact_id].push(p.phone_number);
      }
    });

    // Build stage map
    const stageMap: Record<string, string> = {};
    assignments?.forEach(a => {
      if (a.contact_id && a.stage) {
        stageMap[a.contact_id] = a.stage;
      }
    });

    // Combine data
    const result: ContactForDuplicateCheck[] = contacts.map(contact => {
      // Handle the joined company data - Supabase may return object or array
      let companyName: string | null = null;
      const companiesData = contact.companies as unknown;
      if (companiesData) {
        if (Array.isArray(companiesData) && companiesData.length > 0) {
          companyName = companiesData[0]?.company_name || null;
        } else if (typeof companiesData === 'object' && companiesData !== null) {
          companyName = (companiesData as { company_name?: string })?.company_name || null;
        }
      }
      return {
        id: contact.id,
        full_name: contact.full_name,
        email: contact.email,
        company_id: contact.company_id,
        company_name: companyName,
        stage: stageMap[contact.id] || null,
        phones: phoneMap[contact.id] || [],
      };
    });

    return { data: result, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}
