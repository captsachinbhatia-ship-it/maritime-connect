import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { Users, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';

// Configurable: assignments within this many hours are considered "new"
const NEW_ASSIGNMENT_HOURS = 24;
const MAX_DISPLAY_COUNT = 10;
const SESSION_KEY = 'new_assignments_modal_shown';

interface NewAssignment {
  id: string;
  contact_id: string;
  contact_name: string;
  assignment_role: 'primary' | 'secondary';
  stage: string;
  assigned_at: string;
  assigned_by: string;
}

const STAGE_LABELS: Record<string, string> = {
  COLD_CALLING: 'Cold Calling',
  ASPIRATION: 'Aspiration',
  ACHIEVEMENT: 'Achievement',
  INACTIVE: 'Inactive',
};

const STAGE_COLORS: Record<string, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ASPIRATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  ACHIEVEMENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function NewAssignmentsModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [assignments, setAssignments] = useState<NewAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkNewAssignments = async () => {
      // Check if modal was already shown this session
      if (sessionStorage.getItem(SESSION_KEY) === 'true') {
        setIsLoading(false);
        return;
      }

      try {
        const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
        
        if (crmError || !currentCrmUserId) {
          setIsLoading(false);
          return;
        }

        // Calculate cutoff time
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - NEW_ASSIGNMENT_HOURS);

        // Query for recent ACTIVE assignments for this user
        const { data: recentAssignments, error: assignmentError } = await supabase
          .from('contact_assignments')
          .select('id, contact_id, assignment_role, stage, assigned_at, assigned_by_crm_user_id')
          .eq('status', 'ACTIVE')
          .eq('assigned_to_crm_user_id', currentCrmUserId)
          .in('assignment_role', ['primary', 'secondary'])
          .gte('assigned_at', cutoffTime.toISOString())
          .order('assigned_at', { ascending: false })
          .limit(MAX_DISPLAY_COUNT);

        if (assignmentError) {
          console.error('[NewAssignmentsModal] Error fetching assignments:', assignmentError);
          setIsLoading(false);
          return;
        }

        if (!recentAssignments || recentAssignments.length === 0) {
          // Mark as shown even if no assignments
          sessionStorage.setItem(SESSION_KEY, 'true');
          setIsLoading(false);
          return;
        }

        // Fetch contact names
        const contactIds = recentAssignments.map(a => a.contact_id);
        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select('id, full_name')
          .in('id', contactIds);

        if (contactsError) {
          console.error('[NewAssignmentsModal] Error fetching contacts:', contactsError);
          setIsLoading(false);
          return;
        }

        const contactNameMap: Record<string, string> = {};
        (contacts || []).forEach(c => {
          contactNameMap[c.id] = c.full_name || 'Unknown Contact';
        });

        // Fetch assigner names (crm_users)
        const assignerIds = [...new Set(recentAssignments.map(a => a.assigned_by_crm_user_id).filter(Boolean))];
        const assignerNameMap: Record<string, string> = {};
        
        if (assignerIds.length > 0) {
          const { data: assigners } = await supabase
            .from('crm_users')
            .select('id, full_name, email')
            .in('id', assignerIds);
          
          (assigners || []).forEach(u => {
            assignerNameMap[u.id] = u.full_name || u.email || 'Admin';
          });
        }

        // Build display list
        const displayAssignments: NewAssignment[] = recentAssignments.map(a => ({
          id: a.id,
          contact_id: a.contact_id,
          contact_name: contactNameMap[a.contact_id] || 'Unknown Contact',
          assignment_role: a.assignment_role as 'primary' | 'secondary',
          stage: a.stage,
          assigned_at: a.assigned_at,
          assigned_by: a.assigned_by_crm_user_id ? (assignerNameMap[a.assigned_by_crm_user_id] || 'Admin') : 'Admin',
        }));

        setAssignments(displayAssignments);
        setOpen(true);
      } catch (err) {
        console.error('[NewAssignmentsModal] Unexpected error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkNewAssignments();
  }, []);

  const handleClose = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setOpen(false);
  };

  const handleViewContacts = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setOpen(false);
    navigate('/contacts');
  };

  if (isLoading || assignments.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            New Assignments
          </DialogTitle>
          <DialogDescription>
            You have {assignments.length} new contact{assignments.length > 1 ? 's' : ''} assigned to you in the last {NEW_ASSIGNMENT_HOURS} hours.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{assignment.contact_name}</span>
                    <Badge
                      variant={assignment.assignment_role === 'primary' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {assignment.assignment_role === 'primary' ? 'Primary' : 'Secondary'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge className={`text-xs ${STAGE_COLORS[assignment.stage] || ''}`}>
                      {STAGE_LABELS[assignment.stage] || assignment.stage}
                    </Badge>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(assignment.assigned_at), { addSuffix: true })}</span>
                    <span>·</span>
                    <span>by {assignment.assigned_by}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Dismiss
          </Button>
          <Button onClick={handleViewContacts} className="w-full sm:w-auto">
            View My Contacts
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
