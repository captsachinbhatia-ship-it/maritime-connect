/**
 * Preview mode write guard.
 *
 * In Lovable preview (lovable.dev / lovableproject.com), real auth is bypassed
 * with mock users but the Supabase client still points at the production database.
 * All mutating service functions should call assertNotPreview() before any INSERT,
 * UPDATE, or DELETE to prevent accidental production writes during preview sessions.
 *
 * The RLS INSERT policies (migration 0002) also block these writes at the DB level,
 * but this guard gives the caller a clear error message instead of a silent failure.
 */

function isPreviewDomain(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname.endsWith('lovable.dev') || hostname.endsWith('lovableproject.com');
}

export const IS_PREVIEW_MODE = isPreviewDomain();

/**
 * Returns an error string if in preview mode, otherwise null.
 * Use at the top of any mutating service function:
 *
 *   const guardError = previewWriteGuard();
 *   if (guardError) return { data: null, error: guardError };
 */
export function previewWriteGuard(): string | null {
  if (IS_PREVIEW_MODE) {
    return 'Writes are disabled in preview mode. Use the production app to make changes.';
  }
  return null;
}
