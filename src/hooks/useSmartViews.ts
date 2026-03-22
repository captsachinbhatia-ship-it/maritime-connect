import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCrmUser } from '@/hooks/useCrmUser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SmartViewFilters {
  stage?: string[];
  ownerUserId?: string;
  search?: string;
  days_since_last_interaction?: number;
}

export interface SmartView {
  id: string;
  name: string;
  filters: SmartViewFilters;
  is_shared: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSmartViews() {
  const { crmUserId } = useCrmUser();
  const [views, setViews] = useState<SmartView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const fetchViews = useCallback(async () => {
    if (!crmUserId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_smart_views')
        .select('id, name, filters, is_shared, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch smart views:', error.message);
        setViews([]);
      } else {
        setViews(
          (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            filters: row.filters as SmartViewFilters,
            is_shared: row.is_shared,
            created_at: row.created_at,
          })),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [crmUserId]);

  useEffect(() => {
    if (crmUserId) fetchViews();
  }, [crmUserId, fetchViews]);

  const saveView = useCallback(
    async (name: string, filters: SmartViewFilters, isShared: boolean) => {
      if (!crmUserId) return { error: 'Not authenticated' };

      const { error } = await supabase.from('contact_smart_views').insert({
        crm_user_id: crmUserId,
        name,
        filters,
        is_shared: isShared,
      });

      if (error) return { error: error.message };
      await fetchViews();
      return { error: null };
    },
    [crmUserId, fetchViews],
  );

  const deleteView = useCallback(
    async (viewId: string) => {
      const { error } = await supabase
        .from('contact_smart_views')
        .delete()
        .eq('id', viewId);

      if (error) return { error: error.message };
      if (activeViewId === viewId) setActiveViewId(null);
      await fetchViews();
      return { error: null };
    },
    [activeViewId, fetchViews],
  );

  const applyView = useCallback(
    (viewId: string) => {
      const view = views.find((v) => v.id === viewId);
      if (!view) return null;
      setActiveViewId(viewId);
      return view.filters;
    },
    [views],
  );

  const clearActiveView = useCallback(() => {
    setActiveViewId(null);
  }, []);

  return {
    views,
    isLoading,
    activeViewId,
    saveView,
    deleteView,
    applyView,
    clearActiveView,
    refetch: fetchViews,
  };
}
