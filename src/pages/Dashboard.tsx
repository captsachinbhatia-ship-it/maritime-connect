import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CEODashboard } from '@/components/dashboard/CEODashboard';
import { CallerDashboard } from '@/components/dashboard/CallerDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [isCEO, setIsCEO] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkCEOMode = async () => {
      try {
        const { data, error } = await supabase.rpc('is_ceo_mode');
        
        if (error) {
          console.error('Failed to check CEO mode:', error);
          setIsCEO(false);
        } else {
          setIsCEO(data === true);
        }
      } catch (error) {
        console.error('Error checking CEO mode:', error);
        setIsCEO(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkCEOMode();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return isCEO ? <CEODashboard /> : <CallerDashboard />;
}
