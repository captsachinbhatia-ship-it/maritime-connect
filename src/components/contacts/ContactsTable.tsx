import { format, formatDistanceToNow } from 'date-fns';
import { UserPlus, PhoneCall, Mail, Video, MessageSquare, FileEdit } from 'lucide-react';
import { ContactWithCompany } from '@/types';
import { ContactAssignment, AssignmentStage } from '@/services/assignments';
import { StageDropdown } from './StageDropdown';
import { Button } from '@/components/ui/button';
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
  isLoading: boolean;
  onRowClick: (contact: ContactWithCompany) => void;
  onAssignClick: (contact: ContactWithCompany) => void;
  onStageChange: () => void;
  showAssignColumn?: boolean;
}

const INTERACTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  CALL: <PhoneCall className="h-3 w-3" />,
  WHATSAPP: <MessageSquare className="h-3 w-3" />,
  EMAIL: <Mail className="h-3 w-3" />,
  MEETING: <Video className="h-3 w-3" />,
  NOTE: <FileEdit className="h-3 w-3" />,
};

export function ContactsTable({
  contacts,
  companyNamesMap,
  assignmentsMap,
  isLoading,
  onRowClick,
  onAssignClick,
  onStageChange,
  showAssignColumn = false,
}: ContactsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Stage</TableHead>
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
                <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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

  const formatPhone = (contact: ContactWithCompany) => {
    if (contact.phone) {
      const code = contact.country_code ? `${contact.country_code} ` : '';
      return `${code}${contact.phone}`;
    }
    return '-';
  };

  const formatLastInteraction = (contact: ContactWithCompany) => {
    if (!contact.last_interaction_at) return null;

    const type = contact.last_interaction_type || '';
    const timeAgo = formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true });
    const outcome = contact.last_interaction_outcome;

    return { type, timeAgo, outcome };
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const assignment = assignmentsMap[contact.id];
            const currentStage = assignment?.stage as AssignmentStage | undefined;
            const lastInteraction = formatLastInteraction(contact);
            
            return (
              <TableRow
                key={contact.id}
                className="cursor-pointer"
                onClick={(e) => handleRowClick(e, contact)}
              >
                <TableCell className="font-medium">
                  {contact.full_name || '-'}
                </TableCell>
                <TableCell>
                  {contact.company_id ? companyNamesMap[contact.company_id] || '-' : '-'}
                </TableCell>
                <TableCell>{contact.designation || '-'}</TableCell>
                <TableCell>{formatPhone(contact)}</TableCell>
                <TableCell>{contact.email || '-'}</TableCell>
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
                  {lastInteraction ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {INTERACTION_TYPE_ICONS[lastInteraction.type] || null}
                        <span>{lastInteraction.type}</span>
                      </span>
                      <span>·</span>
                      <span>{lastInteraction.timeAgo}</span>
                      {lastInteraction.outcome && (
                        <>
                          <span>·</span>
                          <span className="text-foreground/70">{lastInteraction.outcome.replace('_', ' ')}</span>
                        </>
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
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
