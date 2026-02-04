import { supabase } from '@/lib/supabaseClient';

export interface ActivityFeedItem {
  activity_at: string;
  activity_type: 'INTERACTION' | 'STAGE_SNAPSHOT';
  actor_crm_user_id: string;
  actor_name: string | null;
  actor_email: string | null;
  contact_id: string;
  contact_name: string | null;
  company_name: string | null;
  assignment_role: string | null;
  to_stage: string | null;
  detail_1: string | null; // interaction_type
  detail_2: string | null; // outcome
  detail_3: string | null; // subject
}

export interface ActivityFeedFilters {
  from: string;
  to: string;
  userId?: string;
  activityType?: 'INTERACTION' | 'STAGE_SNAPSHOT';
  search?: string;
}

export async function fetchActivityFeed(filters: ActivityFeedFilters): Promise<{
  data: ActivityFeedItem[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .rpc('admin_activity_feed', {
        p_from: filters.from,
        p_to: filters.to,
      });

    if (error) {
      return { data: null, error: error.message };
    }

    let filteredData = data as ActivityFeedItem[] || [];

    // Client-side filtering for user
    if (filters.userId) {
      filteredData = filteredData.filter(item => item.actor_crm_user_id === filters.userId);
    }

    // Client-side filtering for activity type
    if (filters.activityType) {
      filteredData = filteredData.filter(item => item.activity_type === filters.activityType);
    }

    // Client-side search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredData = filteredData.filter(item => 
        (item.contact_name?.toLowerCase().includes(searchLower)) ||
        (item.company_name?.toLowerCase().includes(searchLower)) ||
        (item.actor_name?.toLowerCase().includes(searchLower)) ||
        (item.actor_email?.toLowerCase().includes(searchLower))
      );
    }

    // Sort by activity_at desc
    filteredData.sort((a, b) => new Date(b.activity_at).getTime() - new Date(a.activity_at).getTime());

    return { data: filteredData, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

export interface PerformanceSummary {
  userId: string;
  userName: string;
  interactionsCount: number;
  uniqueContactsTouched: number;
  stageSnapshotCount: number;
}

export function calculatePerformanceSummary(data: ActivityFeedItem[]): PerformanceSummary[] {
  const userMap = new Map<string, {
    name: string;
    interactions: number;
    contactIds: Set<string>;
    stageSnapshots: number;
  }>();

  data.forEach(item => {
    const userId = item.actor_crm_user_id;
    const userName = item.actor_name || item.actor_email || 'System / Admin';

    if (!userMap.has(userId)) {
      userMap.set(userId, {
        name: userName,
        interactions: 0,
        contactIds: new Set(),
        stageSnapshots: 0,
      });
    }

    const userStats = userMap.get(userId)!;

    if (item.activity_type === 'INTERACTION') {
      userStats.interactions++;
      userStats.contactIds.add(item.contact_id);
    } else if (item.activity_type === 'STAGE_SNAPSHOT') {
      userStats.stageSnapshots++;
    }
  });

  const summaries: PerformanceSummary[] = [];
  userMap.forEach((stats, userId) => {
    summaries.push({
      userId,
      userName: stats.name,
      interactionsCount: stats.interactions,
      uniqueContactsTouched: stats.contactIds.size,
      stageSnapshotCount: stats.stageSnapshots,
    });
  });

  // Sort by interactions count desc
  summaries.sort((a, b) => b.interactionsCount - a.interactionsCount);

  return summaries;
}

export function exportToCsv(data: ActivityFeedItem[], filename: string): void {
  const headers = [
    'Time',
    'User',
    'Contact',
    'Company',
    'Type',
    'Role',
    'Stage',
    'Interaction Type',
    'Outcome',
    'Subject',
  ];

  const rows = data.map(item => [
    new Date(item.activity_at).toLocaleString(),
    item.actor_name || item.actor_email || 'Unknown',
    item.contact_name || '',
    item.company_name || '',
    item.activity_type,
    item.assignment_role || '',
    item.to_stage || '',
    item.detail_1 || '',
    item.detail_2 || '',
    item.detail_3 || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
