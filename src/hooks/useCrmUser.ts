import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the current CRM user ID from AuthContext.
 * This avoids the extra DB round-trip of getCurrentCrmUserId()
 * and ensures we use crm_users.id (not auth.uid()) for all queries.
 */
export function useCrmUser() {
  const { crmUser, loading } = useAuth();
  return {
    crmUserId: crmUser?.id ?? null,
    crmUser,
    loading,
  };
}
