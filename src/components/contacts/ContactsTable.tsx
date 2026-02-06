import { format, formatDistanceToNow } from 'date-fns';
import { UserPlus, PhoneCall, Mail, Video, MessageSquare, FileEdit, CalendarClock } from 'lucide-react';
import { ContactWithCompany } from '@/types';
import { ContactAssignment, AssignmentStage, ContactOwners } from '@/services/assignments';
import { getFollowupStatusLabel } from '@/services/followups';
import { StageDropdown } from './StageDropdown';
import { ContactRowHoverCard } from './ContactRowHoverCard';
import { extractKeywordChips } from '@/lib/interactionKeywords';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface ContactsTableProps {
  contacts: ContactWithCompany[];
  companyNamesMap: Record<string, string>;
  assignmentsMap: Record<string, ContactAssignment>;
  ownersMap: Record<string, ContactOwners>;
  ownerNamesMap: Record<string, string>;
  nextFollowupMap: Record<string, string | null>;
  isLoading: boolean;
  onRowClick: (contact: ContactWithCompany) => void;
  onAssignClick: (contact: ContactWithCompany) => void;
  onStageChange: () => void;
}


const INTERACTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  CALL: <PhoneCall className="h-3 w-3" />,
  WHATSAPP: <MessageSquare className="h-3 w-3" />,
  EMAIL: <Mail className="h-3 w-3" />,
  MEETING: <Video className="h-3 w-3" />,
  NOTE: <FileEdit className="h-3 w-3" />,
};

const FOLLOWUP_STATUS_STYLES: Record<string, string> = {
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  DUE_TODAY: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  UPCOMING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};


export function ContactsTable({
  contacts,
  companyNamesMap,
  assignmentsMap,
  ownersMap,
  ownerNamesMap,
  nextFollowupMap,
  isLoading,
  onRowClick,
  onAssignClick,
  onStageChange,
}: ContactsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Primary Owner</TableHead>
              <TableHead>Secondary Owner</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Next Follow-up</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">No contacts found for this stage.</p>
      </div>
    );
  }


  const formatLastInteraction = (contact: ContactWithCompany) => {
    if (!contact.last_interaction_at) return null;

    const type = contact.last_interaction_type || '';
    const timeAgo = formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true });
    const outcome = contact.last_interaction_outcome;
    const subject = contact.last_interaction_subject || null;
    const notes = contact.last_interaction_notes || null;

    return { type, timeAgo, outcome, subject, notes };
  };

  const handleRowClick = (e: React.MouseEvent, contact: ContactWithCompany) => {
    // Don't trigger row click if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="combobox"]')) {
      return;
    }
    onRowClick(contact);
  };

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Primary Owner</TableHead>
              <TableHead>Secondary Owner</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Next Follow-up</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const assignment = assignmentsMap[contact.id];
              const currentStage = assignment?.stage as AssignmentStage | undefined;
              const lastInteraction = formatLastInteraction(contact);
              const nextFollowupDue = nextFollowupMap[contact.id] || null;
              const followupStatus = getFollowupStatusLabel(nextFollowupDue);
              const owners = ownersMap[contact.id];
              const primaryOwnerId = owners?.primary?.assigned_to_crm_user_id;
              const secondaryOwnerId = owners?.secondary?.assigned_to_crm_user_id;
              const lastPreview = lastInteraction?.subject || lastInteraction?.notes || null;
              const lastChips = extractKeywordChips(`${lastInteraction?.subject || ''} ${lastInteraction?.notes || ''}`);
              
              return (
                <ContactRowHoverCard
                  key={contact.id}
                  lastInteractionSubject={lastInteraction?.subject}
                  lastInteractionNotes={lastInteraction?.notes}
                  nextFollowupDue={nextFollowupDue}
                >
                  <TableRow
                    className="cursor-pointer"
                    onClick={(e) => handleRowClick(e, contact)}
                  >
                    <TableCell className="font-medium">
                      {contact.full_name || '-'}
                    </TableCell>
                    <TableCell>
                      {contact.company_id ? companyNamesMap[contact.company_id] || '-' : '-'}
                    </TableCell>
                    <TableCell>
                      {contact.primary_phone || contact.phone ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground max-w-[110px] truncate block">
                              {contact.primary_phone || contact.phone}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{contact.primary_phone || contact.phone}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground max-w-[140px] truncate block">
                              {contact.email}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{contact.email}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {primaryOwnerId 
                        ? ownerNamesMap[primaryOwnerId] || 'Unknown'
                        : <span className="text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {secondaryOwnerId 
                        ? ownerNamesMap[secondaryOwnerId] || 'Unknown'
                        : <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell>
                      {currentStage ? (
                        <StageDropdown
                          contactId={contact.id}
                          currentStage={currentStage}
                          onStageChange={onStageChange}
                        />
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {nextFollowupDue ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <CalendarClock className="h-3 w-3 text-muted-foreground" />
                            <span>{format(new Date(nextFollowupDue), 'MMM d, h:mm a')}</span>
                          </div>
                          {followupStatus && (
                            <Badge className={`text-xs ${FOLLOWUP_STATUS_STYLES[followupStatus]}`}>
                              {followupStatus.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lastInteraction ? (
                        <div className="space-y-0.5 max-w-[200px]">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {INTERACTION_TYPE_ICONS[lastInteraction.type] || null}
                              <span>{lastInteraction.type}</span>
                            </span>
                            <span>·</span>
                            <span>{lastInteraction.timeAgo}</span>
                          </div>
                          {lastPreview && (
                            <p className="text-xs text-muted-foreground/70 line-clamp-1 leading-snug">
                              {lastPreview}
                            </p>
                          )}
                          {lastChips.length > 0 && (
                            <div className="flex flex-wrap gap-0.5">
                              {lastChips.slice(0, 3).map(chip => (
                                <Badge
                                  key={chip}
                                  variant="outline"
                                  className="h-4 px-1 text-[9px] font-semibold border-amber-500 text-amber-600 dark:text-amber-400"
                                >
                                  {chip}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssignClick(contact);
                        }}
                      >
                        <UserPlus className="mr-1 h-4 w-4" />
                        {assignment ? 'Reassign' : 'Assign'}
                      </Button>
                    </TableCell>
                  </TableRow>
                </ContactRowHoverCard>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
