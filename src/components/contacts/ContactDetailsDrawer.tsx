import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  User, Building2, Phone, Mail, MessageSquare, FileText, 
  MapPin, Calendar, UserCheck, Clock, PhoneCall, Video, 
  FileEdit, Loader2, AlertCircle, Plus, CalendarClock
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
import { getAssignmentsByContact, ContactAssignment } from '@/services/assignments';
import { getInteractionsByContact, getUserNames, ContactInteraction, InteractionFilters } from '@/services/interactions';
import { getFollowupsByContact, ContactFollowup } from '@/services/followups';
import { AddInteractionModal } from './AddInteractionModal';
import { InteractionsFilters, InteractionsFiltersState } from './InteractionsFilters';
import { FollowupsTab } from './FollowupsTab';
import { AddFollowupModal } from './AddFollowupModal';


interface ContactDetailsDrawerProps {
  contact: ContactWithCompany | null;
  companyName: string | null;
  currentStage: string | null;
  isOpen: boolean;
  onClose: () => void;
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
}: ContactDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState('details');
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
  
  // Interactions filters state
  const [interactionsFilters, setInteractionsFilters] = useState<InteractionsFiltersState>({
    type: 'all',
    outcome: 'all',
    dateRange: 'all',
    search: '',
  });

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('details');
      setAssignments([]);
      setInteractions([]);
      setFollowups([]);
      setAssignmentsError(null);
      setInteractionsError(null);
      setFollowupsError(null);
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
      
      // Get user names for assigned_to and assigned_by
      const userIds = result.data
        .flatMap(a => [a.assigned_to, a.assigned_by])
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
    if (contact.phone) {
      const code = contact.country_code ? `+${contact.country_code} ` : '';
      return `${code}${contact.phone}`;
    }
    return null;
  };

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
    if (!userId) return '-';
    return nameMap[userId] || 'Unknown User';
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
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100vh-100px)]">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6">
            <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Details
            </TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Assignments
            </TabsTrigger>
            <TabsTrigger value="interactions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Interactions
            </TabsTrigger>
            <TabsTrigger value="followups" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Follow-ups
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
                  <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    Company
                  </h4>
                  <p className="text-foreground">{companyName || 'Not assigned'}</p>
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Contact Information
                  </h4>
                  <div className="grid gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Phone</span>
                      <p className="text-foreground">
                        {formatPhone() || '-'}
                        {contact.phone_type && (
                          <span className="ml-2 text-xs text-muted-foreground">({contact.phone_type})</span>
                        )}
                      </p>
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

                {/* Meta */}
                <Separator />
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Record Info
                  </h4>
                  <div className="grid gap-2 text-sm">
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
                  {/* Current Assignment (ACTIVE) */}
                  {(() => {
                    const currentAssignment = assignments.find(a => a.status === 'ACTIVE');
                    const historyAssignments = assignments.filter(a => a.status === 'CLOSED' || a.status === 'PAUSED');
                    
                    return (
                      <>
                        {currentAssignment && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Current Assignment</h4>
                            <div className="rounded-lg border border-primary/50 bg-primary/5 p-4">
                              <div className="grid gap-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Stage</span>
                                  <Badge className={STAGE_COLORS[currentAssignment.stage] || STAGE_COLORS.INACTIVE}>
                                    {currentAssignment.stage.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Assigned To</span>
                                  <span>{getUserName(currentAssignment.assigned_to, assigneeNames)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Assigned By</span>
                                  <span>{getUserName(currentAssignment.assigned_by, assigneeNames)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Assigned At</span>
                                  <span>{formatDate(currentAssignment.assigned_at)}</span>
                                </div>
                              </div>
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
                                      <Badge className={STAGE_COLORS[assignment.stage] || STAGE_COLORS.INACTIVE}>
                                        {assignment.stage.replace('_', ' ')}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {assignment.status}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Assigned To</span>
                                      <span>{getUserName(assignment.assigned_to, assigneeNames)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Assigned By</span>
                                      <span>{getUserName(assignment.assigned_by, assigneeNames)}</span>
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

                        {!currentAssignment && historyAssignments.length === 0 && (
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
                            By: {interaction.creator_full_name || interaction.creator_email || 'Unknown User'}
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
      </SheetContent>
    </Sheet>
  );
}
