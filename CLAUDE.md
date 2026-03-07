# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server on port 8080

# Build
npm run build        # Production build
npm run build:dev    # Development build

# Lint & Test
npm run lint         # ESLint
npm run test         # Run tests once (vitest)
npm run test:watch   # Run tests in watch mode

# Preview production build
npm run preview
```

The `@` path alias resolves to `./src` throughout the codebase.

## Architecture Overview

This is **AQ Maritime CRM** — a React + TypeScript SPA built with Vite, backed by Supabase (PostgreSQL + Auth + RPC functions). It is scaffolded via [Lovable](https://lovable.dev) and uses shadcn/ui components.

### Auth Flow

Authentication is exclusively Google OAuth, restricted to `@aqmaritime.com` email addresses. The flow is:

1. `src/lib/authGuard.ts` — handles OAuth initiation, sign-out, and the `bootstrapAuth()` function which calls the Supabase RPC `link_google_user_to_crm_user` to resolve the Google identity to a row in the `crm_users` table.
2. `src/contexts/AuthContext.tsx` — wraps the app, exposes `crmUser`, `isAdmin`, `isPreviewMode`. On Lovable preview domains (`lovable.dev` / `lovableproject.com`), real auth is bypassed with mock users.
3. `src/hooks/useCrmUser.ts` — lightweight hook used throughout the app to get `crmUserId` (the `crm_users.id` UUID, not `auth.uid()`). **Always use `crm_users.id` for DB queries, not the Supabase auth UID.**

### Data Layer

All DB access goes through the Supabase client at `src/lib/supabaseClient.ts`. There is no ORM — queries are made directly using the Supabase JS client.

Service files in `src/services/` encapsulate DB queries per domain:
- `contacts.ts` — CRUD for contacts, stage filtering
- `companies.ts` — company CRUD
- `interactions.ts` — interaction logging/fetching
- `followups.ts` / `followupsOversight.ts` — follow-up management
- `enquiries.ts` — enquiry lifecycle
- `bulkImport.ts` — CSV import via RPC `import_validated_contacts` with a client-side fallback
- `assignments.ts` / `adminAssignments.ts` / `assignPrimary.ts` — contact ownership assignment
- `duplicateContacts.ts` — duplicate detection logic (see also `src/lib/duplicateDetection.ts`)
- `teamTasks.ts` / `userTasks.ts` / `userNotepad.ts` — dashboard task/notepad features
- `notifications.ts` / `nudgeStatus.ts` / `stageRequests.ts` — notification and nudge workflows

React Query (`@tanstack/react-query`) is used for server state caching where needed; many pages query Supabase directly in `useEffect`.

### Routing & Layout

`src/App.tsx` defines all routes. All authenticated routes are nested under `<AppLayout>` (sidebar + header shell) wrapped in `<ProtectedRoute>`.

Key pages:
- `/` — Dashboard (role-aware: CallerDashboard or CEO view via `is_ceo_mode` RPC)
- `/contacts` — ContactsV2 (current contacts page with tabs: Directory, My Contacts, Assigned, etc.)
- `/contacts-old` — Legacy Contacts page (kept for reference)
- `/companies` — Companies management
- `/enquiries` — Enquiry pipeline
- `/followups` — My follow-ups
- `/followups-oversight` — Admin follow-up oversight
- `/admin-users` — User management (admin only)
- `/admin/daily-work-done`, `/admin/summary` — Admin reporting views
- `/contacts/bulk-import` — CSV bulk import flow
- `/interactions` — All interactions log
- `/follow-ups` — All follow-ups log

### Contact Ownership Model

Contacts have a primary owner and optionally a secondary owner, tracked via `contact_assignments`. The `stage` field on assignments uses the enum `COLD_CALLING | ASPIRATION | ACHIEVEMENT`. The `contacts_with_primary_phone` Supabase view is used by table components to include phone data.

### Component Structure

Components are organized by feature domain under `src/components/`:
- `contacts/` — large feature set: tables, drawers, modals, tabs (Directory, MyContacts, Assigned, Secondary, Unassigned, DuplicateRisk, Followups, BulkImport tabs)
- `companies/` — company table, drawer, modals
- `dashboard/` — role-specific widgets (KPIs, activity matrix, nudges, tasks, notepad, pipeline health)
- `notifications/` — notification center, enquiry notification bell, new assignments modal
- `admin/` — user table and add-user modal
- `bulk-import/` — CSV preview, staging, and confirm dialog steps
- `ui/` — shadcn/ui primitives (do not edit directly; add new ones via `npx shadcn@latest add <component>`)

### User Roles

- **Admin** — full access, determined via Supabase RPC `is_admin()`
- **CEO mode** — special dashboard view, determined via RPC `is_ceo_mode()`
- **Regular user** — standard caller/operations role

### Key Supabase RPCs

| RPC | Purpose |
|-----|---------|
| `link_google_user_to_crm_user` | Links auth.uid() to crm_users row on login |
| `current_crm_user_id` | Returns the crm_users.id for the current session |
| `is_admin` | Returns boolean admin status |
| `is_ceo_mode` | Returns boolean CEO dashboard mode |
| `import_validated_contacts` | Server-side bulk contact import |
| `validate_import_batch` | Validates CSV rows before import |

### Important Notes

- The dev server runs on **port 8080** (not the typical 5173).
- `bun.lockb` exists alongside `package-lock.json` — either `npm` or `bun` can be used for installs.
- RLS policies on `contacts` and `companies` tables gate INSERT operations — non-admin insert failures are often RLS issues, not frontend bugs.
- `src/pages/Contacts.tsx` is a legacy file kept for reference; the active contacts page is `ContactsV2.tsx`.
- Toast notifications use both `sonner` (via `useToast` / `toast()`) and the shadcn `<Toaster>` — both are mounted in `App.tsx`.
