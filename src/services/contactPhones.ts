 import { supabase } from '@/lib/supabaseClient';
 
 export interface ContactPhone {
   id: string;
   contact_id: string;
   phone_type: string;
   phone_number: string;
   is_primary: boolean;
   notes: string | null;
   created_at: string | null;
   updated_at: string | null;
 }
 
 export interface ContactPhoneInput {
   phone_type: string;
   phone_number: string;
   is_primary: boolean;
   notes?: string;
 }
 
 export async function getContactPhones(contactId: string): Promise<{
   data: ContactPhone[] | null;
   error: string | null;
 }> {
   try {
     const { data, error } = await supabase
       .from('contact_phones')
       .select('*')
       .eq('contact_id', contactId)
       .order('is_primary', { ascending: false })
       .order('created_at', { ascending: true });
 
     if (error) {
       return { data: null, error: error.message };
     }
 
     return { data: data as ContactPhone[], error: null };
   } catch (err) {
     return {
       data: null,
       error: err instanceof Error ? err.message : 'Unknown error occurred',
     };
   }
 }
 
 export async function saveContactPhones(
   contactId: string,
   phones: ContactPhoneInput[]
 ): Promise<{ success: boolean; error: string | null }> {
   try {
     // Delete existing phones for this contact
     const { error: deleteError } = await supabase
       .from('contact_phones')
       .delete()
       .eq('contact_id', contactId);
 
     if (deleteError) {
       return { success: false, error: deleteError.message };
     }
 
     // Insert new phones if any
     if (phones.length > 0) {
       // Ensure only one primary
       const hasPrimary = phones.some(p => p.is_primary);
       const phonesToInsert = phones.map((phone, idx) => ({
         contact_id: contactId,
         phone_type: phone.phone_type,
         phone_number: phone.phone_number,
         is_primary: hasPrimary ? phone.is_primary : idx === 0,
         notes: phone.notes || null,
       }));
 
       const { error: insertError } = await supabase
         .from('contact_phones')
         .insert(phonesToInsert);
 
       if (insertError) {
         return { success: false, error: insertError.message };
       }
     }
 
     return { success: true, error: null };
   } catch (err) {
     return {
       success: false,
       error: err instanceof Error ? err.message : 'Unknown error occurred',
     };
   }
 }