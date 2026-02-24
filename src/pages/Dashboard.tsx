import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CallerDashboard } from '@/components/dashboard/CallerDashboard';
import { NewAssignmentsModal } from '@/components/notifications/NewAssignmentsModal';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user, crmUser, isAdmin } = useAuth();
  const [isCEO, setIsCEO] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMode = async () => {
      if (!crmUser?.id) { setIsLoading(false); return; }
      try {
        const { data, error } = await supabase.rpc('is_ceo_mode');
        setIsCEO(!error && data === true);
      } catch {
        setIsCEO(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkMode();
  }, [crmUser?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Unified: both Admin and User use CallerDashboard
  return (
    <>
      <NewAssignmentsModal />
      <CallerDashboard isAdmin={isAdmin} isCEO={isCEO ?? false} />
    </>
  );
}
