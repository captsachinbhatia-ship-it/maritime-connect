import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  User, Building2, Phone, Mail, MessageSquare, FileText, 
  MapPin, Calendar, UserCheck, Clock, PhoneCall, Video, 
  FileEdit, Loader2, AlertCircle, Plus, CalendarClock, Users,
  ArrowUpRight, UserPlus, Pencil, Bell
} from 'lucide-react';
import { ContactWithCompany } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAssignmentsByContact, getContactOwners, ContactAssignment, ContactOwners } from '@/services/assignments';
import { getInteractionsByContact, getUserNames, ContactInteraction, InteractionFilters } from '@/services/interactions';
import { getFollowupsByContact, ContactFollowup } from '@/services/followups';
import { getNudgeStatus, NudgeStatus } from '@/services/nudgeStatus';
import { AddInteractionModal } from './AddInteractionModal';
import { InteractionsFilters, InteractionsFiltersState } from './InteractionsFilters';
import { FollowupsTab } from './FollowupsTab';
import { AddFollowupModal } from './AddFollowupModal';
import { AssignOwnersModal } from './AssignOwnersModal';
import { StageRequestModal } from './StageRequestModal';
import { StageHistoryPanel } from './StageHistoryPanel';
import { AddAssignmentModal } from './AddAssignmentModal';
import { EditCompanyModal } from './EditCompanyModal';
import { SendNudgeDialog } from './SendNudgeDialog';
import { getContactPhones, ContactPhone } from '@/services/contactPhones';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { EditContactModal } from './EditContactModal';
import { DeleteContactDialog } from './DeleteContactDialog';
import { Trash2 } from 'lucide-react';
import { ContactQuickActions } from './ContactQuickActions';


interface ContactDetailsDrawerProps {
  contact: ContactWithCompany | null;
  companyName: string | null;
  currentStage: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOwnersChange?: () => void;
  onCompanyChange?: (newCompanyId: string, newCompanyName: string) => void;
}

const STAGE_COLORS: Record<string, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ASPIRATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  ACHIEVEMENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const INTERACTION_ICONS: Record<string, React.ReactNode> = {
  CALL: <PhoneCall className="h-4 w-4" />,
  WHATSAPP: <MessageSquare className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
  MEETING: <Video className="h-4 w-4" />,
  NOTE: <FileEdit className="h-4 w-4" />,
};

const INTERACTION_COLORS: Record<string, string> = {
  CALL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  WHATSAPP: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  EMAIL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  MEETING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  NOTE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function ContactDetailsDrawer({
  contact,
  companyName,
  currentStage,
  isOpen,
  onClose,
  onOwnersChange,
  onCompanyChange,
}: ContactDetailsDrawerProps) {
  const { crmUser, isAdmin: authIsAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('interactions');
  const [assignments, setAssignments] = useState<ContactAssignment[]>([]);
  const [interactions, setInteractions] = useState<ContactInteraction[]>([]);
  const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [isLoadingFollowups, setIsLoadingFollowups] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [interactionsError, setInteractionsError] = useState<string | null>(null);
  const [followupsError, setFollowupsError] = useState<string | null>(null);
  const [interactionsTableExists, setInteractionsTableExists] = useState(true);
  const [isAddInteractionOpen, setIsAddInteractionOpen] = useState(false);
  const [isAddFollowupOpen, setIsAddFollowupOpen] = useState(false);
  const [followups, setFollowups] = useState<ContactFollowup[]>([]);
  
  // Owners state
  const [owners, setOwners] = useState<ContactOwners | null>(null);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [isLoadingOwners, setIsLoadingOwners] = useState(false);
  const [isAssignOwnersOpen, setIsAssignOwnersOpen] = useState(false);
  
  // Stage request modal state
  const [isStageRequestOpen, setIsStageRequestOpen] = useState(false);
  
  // Add assignment modal state
  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState(false);
  
  // Edit company modal state
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [displayedCompanyName, setDisplayedCompanyName] = useState<string | null>(companyName);
  
  // Phone numbers state
  const [contactPhones, setContactPhones] = useState<ContactPhone[]>([]);
  const [isLoadingPhones, setIsLoadingPhones] = useState(false);

  // Edit/Delete contact state (admin only)
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [isDeleteContactOpen, setIsDeleteContactOpen] = useState(false);

  // Admin check
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Nudge state
  const [isNudgeModalOpen, setIsNudgeModalOpen] = useState(false);
  const [nudgeStatus, setNudgeStatus] = useState<NudgeStatus | null>(null);
  
  // Interactions filters state
  const [interactionsFilters, setInteractionsFilters] = useState<InteractionsFiltersState>({
    type: 'all',
    outcome: 'all',
    dateRange: 'all',
    search: '',
  });

  // Update displayed company name when prop changes
  useEffect(() => {
    setDisplayedCompanyName(companyName);
  }, [companyName]);

  // Permission check: can edit company if Admin/CEO or PRIMARY/SECONDARY assignee
  const canEditCompany = useMemo(() => {
    if (isAdmin) return true;
    if (!crmUser?.id || !owners) return false;
    
    const isPrimaryOwner = owners.primary?.assigned_to_crm_user_id === crmUser.id;
    const isSecondaryOwner = owners.secondary?.assigned_to_crm_user_id === crmUser.id;
    
    return isPrimaryOwner || isSecondaryOwner;
  }, [isAdmin, crmUser?.id, owners]);

  // Permission checks for nudge workflow
  const isPrimaryOwner = useMemo(() => {
    if (!crmUser?.id || !owners) return false;
    return owners.primary?.assigned_to_crm_user_id === crmUser.id;
  }, [crmUser?.id, owners]);

  const isSecondaryOwner = useMemo(() => {
    if (!crmUser?.id || !owners) return false;
    return owners.secondary?.assigned_to_crm_user_id === crmUser.id;
  }, [crmUser?.id, owners]);

  const canNudgeSecondary = useMemo(() => {
    // Can nudge if: (Primary owner OR Admin/CEO) AND there's a secondary owner
    const hasSecondary = !!owners?.secondary?.assigned_to_crm_user_id;
    return hasSecondary && (isPrimaryOwner || isAdmin);
  }, [isPrimaryOwner, isAdmin, owners]);

  const secondaryOwnerName = useMemo(() => {
    if (!owners?.secondary?.assigned_to_crm_user_id) return '';
    return ownerNames[owners.secondary.assigned_to_crm_user_id] || 'Unknown';
  }, [owners, ownerNames]);

  // Check admin status - use context value, with DB fallback
  useEffect(() => {
    if (authIsAdmin !== undefined) {
      setIsAdmin(authIsAdmin);
      return;
    }
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      
      setIsAdmin(data?.role === 'ADMIN' || data?.role === 'CEO');
    };
    
    checkAdmin();
  }, [authIsAdmin]);

  // Load contact phones when drawer opens
  const loadContactPhones = useCallback(async () => {
    if (!contact) return;
    
    setIsLoadingPhones(true);
    
    const result = await getContactPhones(contact.id);
    
    if (result.data) {
      setContactPhones(result.data);
    } else {
      setContactPhones([]);
    }
    
    setIsLoadingPhones(false);
  }, [contact]);

  // Load phones when drawer opens
  useEffect(() => {
    if (isOpen && contact) {
      loadContactPhones();
    }
  }, [isOpen, contact?.id, loadContactPhones]);

  // Load owners when drawer opens
  const loadOwners = useCallback(async () => {
    if (!contact) return;
    
    setIsLoadingOwners(true);
    
    const result = await getContactOwners(contact.id);
    
    if (result.data) {
      setOwners(result.data);
      
      // Get user names for owners (assigned_to, assigned_by, stage_changed_by) and creator
      const userIds: string[] = [];
      if (result.data.primary?.assigned_to_crm_user_id) {
        userIds.push(result.data.primary.assigned_to_crm_user_id);
      }
      if (result.data.primary?.assigned_by_crm_user_id) {
        userIds.push(result.data.primary.assigned_by_crm_user_id);
      }
      if (result.data.secondary?.assigned_to_crm_user_id) {
        userIds.push(result.data.secondary.assigned_to_crm_user_id);
      }
      if (result.data.secondary?.assigned_by_crm_user_id) {
        userIds.push(result.data.secondary.assigned_by_crm_user_id);
      }
      
      // Add creator ID if present
      const creatorId = (contact as any).created_by_crm_user_id;
      if (creatorId) {
        userIds.push(creatorId);
      }
      
      if (userIds.length > 0) {
        const namesResult = await getUserNames(userIds);
        if (namesResult.data) {
          setOwnerNames(namesResult.data);
        }
      }
    }
    
    setIsLoadingOwners(false);
  }, [contact]);

  // Load owners when drawer opens
  useEffect(() => {
    if (isOpen && contact) {
      loadOwners();
    }
  }, [isOpen, contact?.id, loadOwners]);

  // Load nudge status when drawer opens
  const loadNudgeStatus = useCallback(async () => {
    if (!contact) return;
    
    const result = await getNudgeStatus(contact.id);
    if (result.data) {
      setNudgeStatus(result.data);
    }
  }, [contact]);

  useEffect(() => {
    if (isOpen && contact) {
      loadNudgeStatus();
    }
  }, [isOpen, contact?.id, loadNudgeStatus]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('interactions');
      setAssignments([]);
      setInteractions([]);
      setFollowups([]);
      setOwners(null);
      setOwnerNames({});
      setAssignmentsError(null);
      setInteractionsError(null);
      setFollowupsError(null);
      setContactPhones([]);
      setNudgeStatus(null);
      // Reset filters when drawer closes
      setInteractionsFilters({
        type: 'all',
        outcome: 'all',
        dateRange: 'all',
        search: '',
      });
    }
  }, [isOpen]);

  // Load assignments when tab changes to assignments
  useEffect(() => {
    if (isOpen && contact && activeTab === 'assignments') {
      loadAssignments();
    }
  }, [isOpen, contact?.id, activeTab]);

  // Load interactions when tab changes to interactions or filters change
  useEffect(() => {
    if (isOpen && contact && activeTab === 'interactions') {
      loadInteractions();
    }
  }, [isOpen, contact?.id, activeTab, interactionsFilters]);

  // Load followups when tab changes to followups
  useEffect(() => {
    if (isOpen && contact && activeTab === 'followups') {
      loadFollowups();
    }
  }, [isOpen, contact?.id, activeTab]);


  const loadAssignments = async () => {
    if (!contact) return;
    
    setIsLoadingAssignments(true);
    setAssignmentsError(null);
    
    const result = await getAssignmentsByContact(contact.id);
    
    if (result.error) {
      setAssignmentsError(result.error);
    } else if (result.data) {
      setAssignments(result.data);
      
      // Get user names for assigned_to_crm_user_id and assigned_by_crm_user_id
      const userIds = result.data
        .flatMap(a => [a.assigned_to_crm_user_id, a.assigned_by_crm_user_id])
        .filter((id): id is string => id !== null);
      
      if (userIds.length > 0) {
        const namesResult = await getUserNames(userIds);
        if (namesResult.data) {
          setAssigneeNames(namesResult.data);
        }
      }
    }
    
    setIsLoadingAssignments(false);
  };

  const loadInteractions = useCallback(async () => {
    if (!contact) return;
    
    setIsLoadingInteractions(true);
    setInteractionsError(null);
    
    // Build filters object for query
    const filters: InteractionFilters = {
      type: interactionsFilters.type,
      outcome: interactionsFilters.outcome,
      dateRange: interactionsFilters.dateRange,
      search: interactionsFilters.search,
    };
    
    const result = await getInteractionsByContact(contact.id, filters);
    
    setInteractionsTableExists(result.tableExists);
    
    if (result.error) {
      setInteractionsError(result.error);
    } else if (result.data) {
      setInteractions(result.data);
    }
    
    setIsLoadingInteractions(false);
  }, [contact, interactionsFilters]);

  const loadFollowups = useCallback(async () => {
    if (!contact) return;
    
    setIsLoadingFollowups(true);
    setFollowupsError(null);
    
    const result = await getFollowupsByContact(contact.id);
    
    if (result.error) {
      setFollowupsError(result.error);
    } else if (result.data) {
      setFollowups(result.data);
    }
    
    setIsLoadingFollowups(false);
  }, [contact]);

  if (!contact) return null;

  const formatPhone = () => {
    // Prefer primary_phone from the view
    if (contact.primary_phone) {
      return contact.primary_phone;
    }
    if (contact.phone) {
      const code = contact.country_code ? `+${contact.country_code} ` : '';
      return `${code}${contact.phone}`;
    }
    return null;
  };

  const primaryPhoneType = contact.primary_phone_type || contact.phone_type || null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return '-';
    }
  };

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return '-';
    }
  };

  const getUserName = (userId: string | null, nameMap: Record<string, string>) => {
    if (!userId) return 'System / Admin';
    return nameMap[userId] || 'System / Admin';
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl overflow-hidden p-0">
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-lg font-semibold truncate">
                  {contact.full_name || 'Unknown'}
                </SheetTitle>
                <p className="text-sm text-muted-foreground truncate">
                  {companyName || 'No company'}
                </p>
              </div>
            </div>
            {currentStage && (
              <Badge className={`shrink-0 ${STAGE_COLORS[currentStage] || STAGE_COLORS.INACTIVE}`}>
                {currentStage.replace('_', ' ')}
              </Badge>
            )}
            <ContactQuickActions
              firstName={contact.full_name}
              phone={contact.primary_phone || contact.phone || null}
              email={contact.email}
              phoneVisible={!!(contact.primary_phone || contact.phone)}
              emailVisible={!!contact.email}
            />
            {isAdmin && (
              <div className="flex gap-2 shrink-0 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditContactOpen(true)}
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteContactOpen(true)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100vh-100px)]">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6">
            <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Details
            </TabsTrigger>
            <TabsTrigger value="interactions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Interactions
            </TabsTrigger>
            <TabsTrigger value="followups" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Follow-ups
            </TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Assignments
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* Details Tab */}
            <TabsContent value="details" className="m-0 p-6">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="h-4 w-4" />
                    Basic Information
                  </h4>
                  <div className="grid gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Full Name</span>
                      <p className="text-foreground">{contact.full_name || '-'}</p>
                    </div>
                    {contact.designation && (
                      <div>
                        <span className="text-xs text-muted-foreground">Designation</span>
                        <p className="text-foreground">{contact.designation}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Company */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Company
                    </h4>
                    {canEditCompany && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setIsEditCompanyOpen(true)}
                      >
                        <Pencil className="h-3 w-3" />
                        <span className="sr-only">Edit company</span>
                      </Button>
                    )}
                  </div>
                  <p className="text-foreground">{displayedCompanyName || 'Not assigned'}</p>
                </div>

                <Separator />

                {/* Ownership */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Ownership
                    </h4>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAssignOwnersOpen(true)}
                      >
                        <Users className="mr-1 h-3 w-3" />
                        Assign Owners
                      </Button>
                    )}
                  </div>
                  {isLoadingOwners ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {/* Primary Owner */}
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">Primary Owner</span>
                        <p className="text-foreground">
                          {owners?.primary?.assigned_to_crm_user_id
                            ? ownerNames[owners.primary.assigned_to_crm_user_id] || 'System / Admin'
                            : <span className="text-muted-foreground">Unassigned</span>}
                        </p>
                        {owners?.primary && (
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-1">
                            <div>
                              <span className="block text-muted-foreground/70">Assigned By</span>
                              <span>
                                {owners.primary.assigned_by_crm_user_id
                                  ? ownerNames[owners.primary.assigned_by_crm_user_id] || 'System / Admin'
                                  : 'System / Admin'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-muted-foreground/70">Assigned At</span>
                              <span>
                                {owners.primary.assigned_at
                                  ? formatDate(owners.primary.assigned_at)
                                  : '—'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Secondary Owner */}
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">Secondary Owner</span>
                        <p className="text-foreground">
                          {owners?.secondary?.assigned_to_crm_user_id
                            ? ownerNames[owners.secondary.assigned_to_crm_user_id] || 'System / Admin'
                            : <span className="text-muted-foreground">None</span>}
                        </p>
                        {owners?.secondary && (
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-1">
                            <div>
                              <span className="block text-muted-foreground/70">Assigned By</span>
                              <span>
                                {owners.secondary.assigned_by_crm_user_id
                                  ? ownerNames[owners.secondary.assigned_by_crm_user_id] || 'System / Admin'
                                  : 'System / Admin'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-muted-foreground/70">Assigned At</span>
                              <span>
                                {owners.secondary.assigned_at
                                  ? formatDate(owners.secondary.assigned_at)
                                  : '—'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Contact Information
                  </h4>
                  <div className="grid gap-3">
                    {/* Phone Numbers from contact_phones */}
                    <div>
                      <span className="text-xs text-muted-foreground">Phone Numbers</span>
                      {isLoadingPhones ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading...
                        </div>
                      ) : contactPhones.length > 0 ? (
                        <div className="space-y-1 mt-1">
                          {contactPhones.map((phone) => (
                            <div key={phone.id} className="flex items-center gap-2 text-foreground">
                              <span>{phone.phone_number}</span>
                              <Badge variant="outline" className="text-xs">
                                {phone.phone_type}
                              </Badge>
                              {phone.is_primary && (
                                <Badge className="text-xs bg-primary/10 text-primary border-0">
                                  Primary
                                </Badge>
                              )}
                              {phone.notes && (
                                <span className="text-xs text-muted-foreground">({phone.notes})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : formatPhone() ? (
                        <p className="text-foreground">
                          {formatPhone()}
                          {primaryPhoneType && (
                            <span className="ml-2 text-xs text-muted-foreground">({primaryPhoneType})</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">-</p>
                      )}
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Email</span>
                      <p className="text-foreground">{contact.email || '-'}</p>
                    </div>
                    {contact.ice_handle && (
                      <div>
                        <span className="text-xs text-muted-foreground">ICE Handle</span>
                        <p className="text-foreground">{contact.ice_handle}</p>
                      </div>
                    )}
                    {contact.preferred_channel && (
                      <div>
                        <span className="text-xs text-muted-foreground">Preferred Channel</span>
                        <p className="text-foreground">{contact.preferred_channel}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {contact.notes && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        Notes
                      </h4>
                      <p className="text-foreground whitespace-pre-wrap">{contact.notes}</p>
                    </div>
                  </>
                )}

                {/* Stage & Coordination Actions (Admin only) */}
                {currentStage && isAdmin && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <ArrowUpRight className="h-4 w-4" />
                          Stage Actions
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsStageRequestOpen(true)}
                        >
                          <ArrowUpRight className="mr-1 h-3 w-3" />
                          Change Stage
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Nudge/Acknowledge Section */}
                {owners?.secondary && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Bell className="h-4 w-4" />
                            Backup Coordination
                          </h4>
                          {nudgeStatus?.hasActiveNudge && (
                            <Badge className="mt-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                              Backup requested
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {canNudgeSecondary && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsNudgeModalOpen(true)}
                            >
                              <Bell className="mr-1 h-3 w-3" />
                              Send Nudge
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Stage History (visible to admins, optional for others) */}
                {isAdmin && contact && (
                  <>
                    <Separator />
                    <StageHistoryPanel contactId={contact.id} isVisible={true} />
                  </>
                )}

                {/* Meta */}
                <Separator />
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Record Info
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Added By</span>
                      <span>
                        {(contact as any).created_by_crm_user_id
                          ? (ownerNames[(contact as any).created_by_crm_user_id] || 'Unknown')
                          : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{formatDate(contact.created_at || null)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className={contact.is_active ? 'text-green-600' : 'text-red-600'}>
                        {contact.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated</span>
                      <span>{formatDate(contact.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="m-0 p-6">
              {/* Current Owners Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Current Owners
                  </h4>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddAssignmentOpen(true)}
                      >
                        <UserPlus className="mr-1 h-3 w-3" />
                        Add Assignment
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAssignOwnersOpen(true)}
                      >
                        <Users className="mr-1 h-3 w-3" />
                        Assign Owners
                      </Button>
                    </div>
                  )}
                </div>
                {isLoadingOwners ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading owners...
                  </div>
                ) : (
                  <div className="rounded-lg border border-primary/50 bg-primary/5 p-4">
                    <div className="grid gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Primary Owner</span>
                        <span className="font-medium">
                          {owners?.primary?.assigned_to_crm_user_id
                            ? ownerNames[owners.primary.assigned_to_crm_user_id] || 'System / Admin'
                            : <span className="text-muted-foreground italic">Unassigned</span>}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Secondary Owner</span>
                        <span className="font-medium">
                          {owners?.secondary?.assigned_to_crm_user_id
                            ? ownerNames[owners.secondary.assigned_to_crm_user_id] || 'System / Admin'
                            : <span className="text-muted-foreground italic">None</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Assignment History */}
              {isLoadingAssignments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : assignmentsError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{assignmentsError}</AlertDescription>
                </Alert>
              ) : assignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No assignment history</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current Active Assignments */}
                  {(() => {
                    const activeAssignments = assignments.filter(a => a.status === 'ACTIVE');
                    const historyAssignments = assignments.filter(a => a.status === 'CLOSED' || a.status === 'PAUSED');
                    
                    return (
                      <>
                        {activeAssignments.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Active Assignments ({activeAssignments.length})</h4>
                            <div className="space-y-3">
                              {activeAssignments.map((assignment) => (
                                <div key={assignment.id} className="rounded-lg border border-primary/50 bg-primary/5 p-4">
                                  <div className="grid gap-3 text-sm">
                                    <div className="flex justify-between items-center">
                                      <Badge className={STAGE_COLORS[assignment.stage] || STAGE_COLORS.INACTIVE}>
                                        {assignment.stage.replace('_', ' ')}
                                      </Badge>
                                      {assignment.assignment_role && (
                                        <Badge variant="outline" className="text-xs">
                                          {assignment.assignment_role}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Assigned To</span>
                                      <span>{getUserName(assignment.assigned_to_crm_user_id, assigneeNames)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Assigned By</span>
                                      <span>{getUserName(assignment.assigned_by_crm_user_id, assigneeNames)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Assigned At</span>
                                      <span>{formatDate(assignment.assigned_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* History (CLOSED/PAUSED) */}
                        {historyAssignments.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">
                              Assignment History ({historyAssignments.length})
                            </h4>
                            <div className="space-y-3">
                              {historyAssignments.map((assignment) => (
                                <div key={assignment.id} className="rounded-lg border p-4">
                                  <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <Badge className={STAGE_COLORS[assignment.stage] || STAGE_COLORS.INACTIVE}>
                                          {assignment.stage.replace('_', ' ')}
                                        </Badge>
                                        {assignment.assignment_role && (
                                          <Badge variant="secondary" className="text-xs">
                                            {assignment.assignment_role}
                                          </Badge>
                                        )}
                                      </div>
                                      <Badge variant="outline" className="text-xs">
                                        {assignment.status}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Assigned To</span>
                                      <span>{getUserName(assignment.assigned_to_crm_user_id, assigneeNames)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Assigned By</span>
                                      <span>{getUserName(assignment.assigned_by_crm_user_id, assigneeNames)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Assigned At</span>
                                      <span>{formatDate(assignment.assigned_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeAssignments.length === 0 && historyAssignments.length === 0 && (
                          <div className="text-center py-12 text-muted-foreground">
                            <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No assignment records</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </TabsContent>

            {/* Interactions Tab */}
            <TabsContent value="interactions" className="m-0 p-6">
              {/* Add Interaction Button */}
              <div className="mb-4">
                <Button
                  onClick={() => setIsAddInteractionOpen(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Interaction
                </Button>
              </div>

              {/* Filter Bar */}
              <div className="mb-4">
                <InteractionsFilters
                  filters={interactionsFilters}
                  onFiltersChange={setInteractionsFilters}
                />
              </div>

              {isLoadingInteractions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : interactionsError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{interactionsError}</AlertDescription>
                </Alert>
              ) : !interactionsTableExists ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Interactions not available</p>
                  <p className="text-sm mt-1">The interactions table has not been set up yet.</p>
                </div>
              ) : interactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No interactions yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interactions.map((interaction) => (
                    <div key={interaction.id} className="rounded-lg border p-4">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-full p-2 ${INTERACTION_COLORS[interaction.interaction_type] || INTERACTION_COLORS.NOTE}`}>
                          {INTERACTION_ICONS[interaction.interaction_type] || <FileEdit className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {interaction.interaction_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(interaction.interaction_at)}
                            </span>
                          </div>
                          {interaction.summary && (
                            <p className="text-sm text-foreground mb-2">{interaction.summary}</p>
                          )}
                          {interaction.next_action && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t">
                              <Clock className="h-3 w-3" />
                              <span>Next: {interaction.next_action}</span>
                              {interaction.next_action_date && (
                                <span>({formatShortDate(interaction.next_action_date)})</span>
                              )}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            By: {interaction.creator_full_name || interaction.creator_email || 'System / Admin'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Follow-ups Tab */}
            <TabsContent value="followups" className="m-0 p-6">
              <FollowupsTab
                followups={followups}
                isLoading={isLoadingFollowups}
                error={followupsError}
                onRefresh={loadFollowups}
                onAddFollowup={() => setIsAddFollowupOpen(true)}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Add Interaction Modal */}
        {contact && (
          <AddInteractionModal
            contactId={contact.id}
            isOpen={isAddInteractionOpen}
            onClose={() => setIsAddInteractionOpen(false)}
            onSuccess={loadInteractions}
          />
        )}

        {/* Add Follow-up Modal */}
        {contact && (
          <AddFollowupModal
            contactId={contact.id}
            contactName={contact.full_name || 'Unknown'}
            isOpen={isAddFollowupOpen}
            onClose={() => setIsAddFollowupOpen(false)}
            onSuccess={loadFollowups}
          />
        )}

        {/* Assign Owners Modal (Admin only) */}
        {contact && (
          <AssignOwnersModal
            open={isAssignOwnersOpen}
            onOpenChange={setIsAssignOwnersOpen}
            contactId={contact.id}
            contactName={contact.full_name || 'Unknown'}
            currentOwners={owners}
            onSuccess={() => {
              loadOwners();
              onOwnersChange?.();
            }}
          />
        )}

        {/* Stage Request Modal */}
        {contact && currentStage && (
          <StageRequestModal
            contactId={contact.id}
            contactName={contact.full_name || 'Unknown'}
            currentStage={currentStage}
            isOpen={isStageRequestOpen}
            onClose={() => setIsStageRequestOpen(false)}
            onSuccess={() => {
              // Could refresh stage requests list here if needed
            }}
          />
        )}

        {/* Add Assignment Modal (Admin only) */}
        {contact && currentStage && (
          <AddAssignmentModal
            contactId={contact.id}
            contactName={contact.full_name || 'Unknown'}
            currentStage={currentStage}
            existingAssigneeIds={[
              ...(owners?.primary?.assigned_to_crm_user_id ? [owners.primary.assigned_to_crm_user_id] : []),
              ...(owners?.secondary?.assigned_to_crm_user_id ? [owners.secondary.assigned_to_crm_user_id] : []),
            ]}
            isOpen={isAddAssignmentOpen}
            onClose={() => setIsAddAssignmentOpen(false)}
            onSuccess={() => {
              loadOwners();
              loadAssignments();
              onOwnersChange?.();
            }}
          />
        )}

        {/* Edit Company Modal */}
        {contact && (
          <EditCompanyModal
            contactId={contact.id}
            contactName={contact.full_name || 'Unknown'}
            currentCompanyId={contact.company_id}
            currentCompanyName={displayedCompanyName}
            isOpen={isEditCompanyOpen}
            onClose={() => setIsEditCompanyOpen(false)}
            onSuccess={(newCompanyId, newCompanyName) => {
              setDisplayedCompanyName(newCompanyName);
              onCompanyChange?.(newCompanyId, newCompanyName);
            }}
          />
        )}

        {/* Edit Contact Modal (Admin only) */}
        {isAdmin && (
          <EditContactModal
            contact={contact}
            open={isEditContactOpen}
            onOpenChange={setIsEditContactOpen}
            onSuccess={() => {
              onOwnersChange?.();
              onClose();
            }}
          />
        )}

        {/* Delete Contact Dialog (Admin only) */}
        {isAdmin && (
          <DeleteContactDialog
            contact={contact}
            open={isDeleteContactOpen}
            onOpenChange={setIsDeleteContactOpen}
            onSuccess={() => {
              onOwnersChange?.();
              onClose();
            }}
          />
        )}

        {/* Send Nudge Dialog */}
        {contact && (
          <SendNudgeDialog
            open={isNudgeModalOpen}
            onOpenChange={setIsNudgeModalOpen}
            contactId={contact.id}
            contactName={contact.full_name || 'Unknown'}
            onSuccess={() => {
              loadNudgeStatus();
              loadInteractions();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
