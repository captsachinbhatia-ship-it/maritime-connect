import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CEODashboard } from '@/components/dashboard/CEODashboard';
import { CallerDashboard } from '@/components/dashboard/CallerDashboard';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [isCEO, setIsCEO] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkModeAndRole = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Check CEO mode and admin role in parallel
        const [ceoResult, roleResult] = await Promise.all([
          supabase.rpc('is_ceo_mode'),
          supabase
            .from('crm_users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
        ]);

        if (ceoResult.error) {
          console.error('Failed to check CEO mode:', ceoResult.error);
          setIsCEO(false);
        } else {
          setIsCEO(ceoResult.data === true);
        }

        // Check if user is admin
        if (!roleResult.error && roleResult.data) {
          setIsAdmin(roleResult.data.role === 'ADMIN');
        }
      } catch (error) {
        console.error('Error checking mode/role:', error);
        setIsCEO(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkModeAndRole();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return isCEO ? (
    <CEODashboard isAdmin={isAdmin} isCEO={isCEO} />
  ) : (
    <CallerDashboard isAdmin={isAdmin} isCEO={isCEO ?? false} />
  );
}
