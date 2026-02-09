import { supabase } from '@/lib/supabaseClient';

export interface StagingRow {
  id: string;
  batch_id: string;
  full_name: string | null;
  designation: string | null;
  company_name: string | null;
  country_code: string | null;
  phone: string | null;
  phone_type: string | null;
  email: string | null;
  ice_handle: string | null;
  preferred_channel: string | null;
  notes: string | null;
  status: string;
  validation_errors: unknown;
  duplicate_contact_id: string | null;
  created_contact_id: string | null;
  imported_by_crm_user_id: string | null;
  imported_at: string | null;
}

export interface ParsedCsvRow {
  full_name: string;
  designation: string;
  company_name: string;
  country_code: string;
  phone: string;
  phone_type: string;
  email: string;
  ice_handle: string;
  preferred_channel: string;
  notes: string;
}

export interface ValidationResult {
  total_rows: number;
  valid_rows: number;
  failed_rows: number;
  duplicate_rows: number;
}

export interface ImportResult {
  imported_count: number;
  skipped_count: number;
  failed_count: number;
}

export interface ImportValidatedResult {
  imported_count: number;
  skipped_duplicate_count: number;
}

// Resolve current CRM user ID via RPC
export async function getCurrentCrmUserIdViaRpc(): Promise<{
  data: string | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc('current_crm_user_id');
    if (error) return { data: null, error: error.message };
    return { data: data as string | null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Insert parsed rows into staging table
export async function insertStagingRows(
  batchId: string,
  crmUserId: string,
  rows: ParsedCsvRow[]
): Promise<{ count: number; error: string | null }> {
  const payload = rows.map((row) => ({
    batch_id: batchId,
    imported_by_crm_user_id: crmUserId,
    full_name: row.full_name || null,
    designation: row.designation || null,
    company_name: row.company_name || null,
    country_code: row.country_code || null,
    phone: row.phone || null,
    phone_type: row.phone_type || null,
    email: row.email || null,
    ice_handle: row.ice_handle || null,
    preferred_channel: row.preferred_channel || null,
    notes: row.notes || null,
  }));

  const { error } = await supabase
    .from('contact_import_staging')
    .insert(payload);

  if (error) return { count: 0, error: error.message };
  return { count: rows.length, error: null };
}

// Fetch staging rows for a batch
export async function fetchStagingRows(
  batchId: string
): Promise<{ data: StagingRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('contact_import_staging')
    .select('*')
    .eq('batch_id', batchId)
    .order('imported_at', { ascending: false })
    .order('full_name', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data || []) as StagingRow[], error: null };
}

// Validate batch via RPC
export async function validateImportBatch(
  batchId: string
): Promise<{ data: ValidationResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('validate_import_batch', {
    p_batch_id: batchId,
  });

  if (error) return { data: null, error: error.message };
  return { data: data as ValidationResult, error: null };
}

// Import validated rows via RPC (legacy)
export async function importValidatedBatch(
  batchId: string,
  skipDuplicates: boolean
): Promise<{ data: ImportResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('import_validated_batch', {
    p_batch_id: batchId,
    skip_duplicates: skipDuplicates,
  });

  if (error) return { data: null, error: error.message };
  return { data: data as ImportResult, error: null };
}

// Import validated rows via new single-query RPC
export async function importValidatedContacts(
  batchId: string
): Promise<{ data: ImportValidatedResult | null; error: string | null }> {
  console.log('[BulkImport] Calling import_validated_contacts RPC for batch:', batchId);
  const { data, error } = await supabase.rpc('import_validated_contacts', {
    p_batch_id: batchId,
  });

  console.log('[BulkImport] RPC response:', { data, error });

  if (error) return { data: null, error: error.message };

  // RPC returns a table, so data is an array with one row
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row as ImportValidatedResult, error: null };
}

// Client-side fallback: directly insert validated staging rows into contacts
export async function importValidatedContactsClientSide(
  batchId: string,
  crmUserId: string
): Promise<{ data: ImportValidatedResult | null; error: string | null }> {
  console.log('[BulkImport] Starting client-side import for batch:', batchId);

  // 1. Fetch all VALIDATED staging rows
  const { data: rows, error: fetchErr } = await supabase
    .from('contact_import_staging')
    .select('*')
    .eq('batch_id', batchId)
    .eq('status', 'VALIDATED');

  if (fetchErr) return { data: null, error: fetchErr.message };
  if (!rows || rows.length === 0) {
    return { data: { imported_count: 0, skipped_duplicate_count: 0 }, error: null };
  }

  console.log(`[BulkImport] Found ${rows.length} validated rows to import`);

  let importedCount = 0;
  let skippedDuplicateCount = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      // Resolve or create company if company_name is provided
      let companyId: string | null = null;
      if (row.company_name) {
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .ilike('company_name', row.company_name.trim())
          .limit(1)
          .maybeSingle();

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany, error: companyErr } = await supabase
            .from('companies')
            .insert({ company_name: row.company_name.trim(), is_active: true })
            .select('id')
            .single();
          if (!companyErr && newCompany) {
            companyId = newCompany.id;
          }
        }
      }

      // Insert contact
      const { data: contact, error: insertErr } = await supabase
        .from('contacts')
        .insert({
          full_name: row.full_name?.trim() || 'Unknown',
          company_id: companyId,
          designation: row.designation || null,
          country_code: row.country_code || null,
          phone: row.phone || null,
          phone_type: row.phone_type || null,
          email: row.email || null,
          ice_handle: row.ice_handle || null,
          preferred_channel: row.preferred_channel || null,
          notes: row.notes || null,
          is_active: true,
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error(`[BulkImport] Failed to insert ${row.full_name}:`, insertErr.message);
        errors.push(`${row.full_name}: ${insertErr.message}`);
        continue;
      }

      // Insert primary phone if phone exists
      if (row.phone && contact) {
        await supabase.from('contact_phones').insert({
          contact_id: contact.id,
          phone_type: row.phone_type || 'MOBILE',
          phone_number: row.phone,
          is_primary: true,
        });
      }

      // Update staging row to IMPORTED
      await supabase
        .from('contact_import_staging')
        .update({ status: 'IMPORTED', created_contact_id: contact.id })
        .eq('id', row.id);

      importedCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[BulkImport] Exception for ${row.full_name}:`, msg);
      errors.push(`${row.full_name}: ${msg}`);
    }
  }

  if (errors.length > 0) {
    console.warn('[BulkImport] Import completed with errors:', errors);
  }

  console.log(`[BulkImport] Client-side import done: ${importedCount} imported, ${skippedDuplicateCount} skipped`);
  return { data: { imported_count: importedCount, skipped_duplicate_count: skippedDuplicateCount }, error: null };
}

// Fetch a contact by ID for duplicate preview
export async function fetchContactById(
  contactId: string
): Promise<{ data: { id: string; full_name: string; email: string | null; primary_phone: string | null; designation: string | null } | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contacts_with_primary_phone')
    .select('id, full_name, email, primary_phone, designation')
    .eq('id', contactId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
