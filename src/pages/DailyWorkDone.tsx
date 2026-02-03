import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, RefreshCw, Download, Search, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  fetchActivityFeed,
  calculatePerformanceSummary,
  exportToCsv,
  ActivityFeedItem,
  PerformanceSummary,
} from '@/services/activityFeed';
import { ContactDetailsDrawer } from '@/components/contacts/ContactDetailsDrawer';
import { ContactWithCompany } from '@/types';

interface CrmUser {
  id: string;
  full_name: string;
  email: string | null;
}

export default function DailyWorkDone() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState<Date>(startOfDay(new Date()));
  const [toDate, setToDate] = useState<Date>(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);

  // Contact drawer
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [selectedContactStage, setSelectedContactStage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        setIsAdmin(false);
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
        navigate('/');
        toast({
          title: 'Access denied',
          description: 'You do not have permission to view this page.',
          variant: 'destructive',
        });
      }
    };

    checkAdminAccess();
  }, [user, navigate, toast]);

  // Load CRM users for dropdown
  useEffect(() => {
    const loadCrmUsers = async () => {
      const { data } = await supabase
        .from('crm_users')
        .select('id, full_name, email')
        .eq('active', true)
        .order('full_name');

      if (data) {
        setCrmUsers(data);
      }
    };

    if (isAdmin) {
      loadCrmUsers();
    }
  }, [isAdmin]);

  // Load activity feed
  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchActivityFeed({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        userId: selectedUserId !== 'all' ? selectedUserId : undefined,
        activityType: selectedType !== 'all' ? (selectedType as 'INTERACTION' | 'STAGE_SNAPSHOT') : undefined,
        search: searchQuery || undefined,
      });

      if (error) {
        toast({
          title: 'Error loading activities',
          description: error,
          variant: 'destructive',
        });
        return;
      }

      setActivities(data || []);
      setPerformanceSummary(calculatePerformanceSummary(data || []));
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedUserId, selectedType, searchQuery, toast]);

  useEffect(() => {
    if (isAdmin) {
      loadActivities();
    }
  }, [isAdmin, loadActivities]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const handleExport = () => {
    const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
    exportToCsv(activities, `daily_work_done_${dateStr}.csv`);
    toast({
      title: 'Export complete',
      description: `Exported ${activities.length} rows to CSV.`,
    });
  };

  const handleRowClick = async (item: ActivityFeedItem) => {
    // Fetch contact data for drawer
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', item.contact_id)
      .maybeSingle();

    if (contact) {
      setSelectedContact({
        ...contact,
        company_name: item.company_name || undefined,
      });
      setSelectedContactStage(item.to_stage || null);
      setDrawerOpen(true);
    }
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm');
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'MMM d');
  };

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Work Done</h1>
          <p className="text-muted-foreground">
            Track team activity and performance
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Date Range - From */}
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[160px] justify-start text-left font-normal',
                      !fromDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, 'MMM d, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => date && setFromDate(startOfDay(date))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Range - To */}
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[160px] justify-start text-left font-normal',
                      !toDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, 'MMM d, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => date && setToDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {crmUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="INTERACTION">Interaction</SelectItem>
                  <SelectItem value="STAGE_SNAPSHOT">Stage Snapshot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Contact, company, user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={activities.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
            <Badge variant="secondary" className="ml-2">
              {activities.length} records
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Interaction Type</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Subject</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No activity found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((item, idx) => (
                    <TableRow
                      key={`${item.activity_at}-${item.contact_id}-${idx}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(item)}
                    >
                      <TableCell className="font-mono text-xs">
                        <div>{formatTime(item.activity_at)}</div>
                        <div className="text-muted-foreground">{formatDate(item.activity_at)}</div>
                      </TableCell>
                      <TableCell>
                        {item.actor_name || item.actor_email || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.contact_name || '—'}
                      </TableCell>
                      <TableCell>
                        {item.company_name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.activity_type === 'INTERACTION' ? 'default' : 'secondary'}
                        >
                          {item.activity_type === 'INTERACTION' ? 'Interaction' : 'Stage'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.assignment_role ? (
                          <Badge variant="outline" className="text-xs">
                            {item.assignment_role}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {item.to_stage || '—'}
                      </TableCell>
                      <TableCell>
                        {item.detail_1 || '—'}
                      </TableCell>
                      <TableCell>
                        {item.detail_2 || '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.detail_3 || '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Interactions</TableHead>
                  <TableHead className="text-right">Unique Contacts</TableHead>
                  <TableHead className="text-right">Stage Snapshots</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : performanceSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No performance data for the selected period.
                    </TableCell>
                  </TableRow>
                ) : (
                  performanceSummary.map((summary) => (
                    <TableRow key={summary.userId}>
                      <TableCell className="font-medium">
                        {summary.userName}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {summary.interactionsCount}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {summary.uniqueContactsTouched}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {summary.stageSnapshotCount}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Contact Details Drawer */}
      <ContactDetailsDrawer
        contact={selectedContact}
        companyName={selectedContact?.company_name || null}
        currentStage={selectedContactStage}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
