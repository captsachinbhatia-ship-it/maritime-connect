import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnassignedContactsList } from '@/components/dashboard/UnassignedContactsList';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function UnassignedContacts() {
  const { user, crmUser } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      if (!crmUser || !user) {
        navigate('/');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const hasAccess = data?.role === 'ADMIN' || data?.role === 'CEO';
      setIsAdmin(hasAccess);

      if (!hasAccess) {
        console.log('[UnassignedContacts] Access denied - redirecting to dashboard');
        navigate('/');
      }
    };

    checkRole();
  }, [user, crmUser, navigate]);

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Unassigned Contacts</h1>
        <p className="mt-1 text-muted-foreground">
          Manage and assign contacts that are not yet assigned to any team member
        </p>
      </div>

      {/* Unassigned Contacts List */}
      <UnassignedContactsList />
    </div>
  );
}
