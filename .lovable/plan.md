

# AQ Maritime CRM - Comprehensive Production Fixes

## Overview

Four production issues to fix across the Contacts module: bulk import returning 0, Add Contact modal failures, phone display in tables, and user name display in sidebar.

---

## Issue 1: Bulk Import Shows "Imported: 0"

### Root Cause
The `importValidatedContacts` RPC returns 0, then the client-side fallback (`importValidatedContactsClientSide`) also fails silently due to RLS policies blocking non-admin users from inserting into `contacts` and `companies` tables.

### Fix
**This is an RLS/database issue.** The client-side fallback code in `src/services/bulkImport.ts` and `src/pages/BulkImport.tsx` is already correctly implemented with session verification, retry logic, and cache invalidation. The problem is server-side.

**Action required from you (manual SQL in Supabase dashboard):**
- Verify/update RLS INSERT policies on `contacts` and `companies` tables to allow all authenticated users (not just admin).
- Verify the `import_validated_contacts` RPC function correctly resolves `auth.uid()` to the CRM user and has SECURITY DEFINER if needed.

**No frontend code changes needed** -- the existing hybrid RPC/client-side fallback and post-import cache invalidation are already in place.

---

## Issue 2: "Add Contact" Modal Doesn't Create Contact

### Root Cause
After reviewing `AddContactModal.tsx` and `createContact()` in `services/contacts.ts`, the code path looks correct -- it creates the contact, saves phones, creates assignment, and calls `onSuccess()`. If the modal stays open with no error, this is likely the same RLS issue as Issue 1: the `contacts` INSERT policy blocks non-admin users, causing a silent failure.

### Fix
- **RLS fix (same as Issue 1):** Ensure INSERT policy on `contacts` allows all authenticated users.
- **Frontend improvement:** Add better error surfacing. Currently `setSubmitError` is called on failure, but if the RLS error isn't caught properly, the user sees nothing. We'll add a toast notification on success and ensure errors always surface.

### Changes
- `src/components/contacts/AddContactModal.tsx`: Add a success toast after `onSuccess()` call, and add a catch-all error handler.

---

## Issue 3: Phone Number Not Displaying in List

### Root Cause
The `DirectoryTab` already fetches primary phones from `contact_phones` (lines 156-168) and stores them in `primaryPhoneMap`. The display logic (lines 724-738) already tries `primaryPhoneMap[contact.id]` first, then falls back to `contacts.phone`.

The problem is the `country_code` comes from `contacts.country_code`, which may be null for contacts where the country code was only stored in the phone number string itself. Also, the `contact_phones` query doesn't fetch `country_code` because that column doesn't exist on `contact_phones`.

### Fix
- Update the `fetchPrimaryPhones` function in `DirectoryTab.tsx` to also select `country_code` from the parent `contacts` table (already available in the contacts data).
- The real fix: ensure the phone number itself displays even without a country code. Currently if `primaryPhoneMap` has a value, it shows. If not, it falls back to `contacts.phone`. This should work. Let me verify the actual data is being fetched.

**Approach:** The `contact_phones` primary phone fetch is already correct. The display code at line 726-737 already shows the phone. The likely issue is that `contact_phones` rows don't exist for older contacts (they only have `contacts.phone`). The fallback at line 732 handles this. 

**Additional fix for ContactsTable.tsx and MyContactsTab.tsx:** These components use `contacts_with_primary_phone` view which includes `primary_phone`. The last diff already added country code formatting. We need to verify the `contacts_with_primary_phone` view includes the phone data.

### Changes
- `src/components/contacts/ContactsTable.tsx`: Already fixed in last diff. Verify it works.
- `src/components/contacts/MyContactsTab.tsx`: Already fixed in last diff. Verify it works.
- `src/components/contacts/DirectoryTab.tsx`: Already has phone display logic. Minor improvement: show phone number even without country code (remove empty display issue).

---

## Issue 4: Show User Name in Sidebar Bottom-Left

### Root Cause
The `AppSidebar.tsx` footer (line 121-123) shows only the email:
```tsx
{isPreviewMode ? crmUser?.email : user?.email}
```

### Fix
Update the sidebar footer to show both the user's full name and email, with an avatar initial.

### Changes
- `src/components/AppSidebar.tsx`: Replace the single email line with a two-line display showing full name and email, with an avatar circle showing the user's initial.

---

## Technical Implementation Details

### File Changes Summary

1. **`src/components/AppSidebar.tsx`** - Update footer to show user name + email with avatar
2. **`src/components/contacts/AddContactModal.tsx`** - Add success toast notification
3. **`src/components/contacts/DirectoryTab.tsx`** - Minor phone display robustness improvement

### Database Changes (Manual - User Action Required)
- Verify/fix RLS INSERT policies on `contacts` and `companies` tables for all authenticated users
- Verify `import_validated_contacts` and `validate_import_batch` RPC functions work for non-admin users

