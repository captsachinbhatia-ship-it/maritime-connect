import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Users, Loader2, ExternalLink, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabaseClient';

interface LinkedContact {
  id: string;
  full_name: string;
  designation: string | null;
  assignment_role: string | null;
}

export interface LinkedContactsListRef {
  refresh: () => void;
}

interface LinkedContactsListProps {
  companyId: string;
  isAdmin?: boolean;
  onContactClick?: (contactId: string) => void;
  onAssignContact?: (contactId: string, contactName: string) => void;
}

export const LinkedContactsList = forwardRef<LinkedContactsListRef, LinkedContactsListProps>(
  function LinkedContactsList({ companyId, isAdmin, onContactClick, onAssignContact }, ref) {
    const [contacts, setContacts] = useState<LinkedContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadContacts = useCallback(async () => {
      setIsLoading(true);
      try {
        const { data: contactsData } = await supabase
          .from('contacts')
          .select('id, full_name, designation')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('full_name');

        if (!contactsData || contactsData.length === 0) {
          setContacts([]);
          setIsLoading(false);
          return;
        }

        const contactIds = contactsData.map(c => c.id);
        const { data: assignments } = await supabase
          .from('contact_assignments')
          .select('contact_id, assignment_role')
          .in('contact_id', contactIds)
          .eq('status', 'ACTIVE')
          .in('assignment_role', ['primary', 'secondary']);

        // Prefer PRIMARY when a contact has both roles
        const roleMap = new Map<string, string>();
        (assignments || []).forEach(a => {
          const existing = roleMap.get(a.contact_id);
          if (!existing || a.assignment_role === 'primary') {
            roleMap.set(a.contact_id, a.assignment_role);
          }
        });

        setContacts(contactsData.map(c => ({
          ...c,
          assignment_role: roleMap.get(c.id) || null,
        })));
      } catch (err) {
        console.error('Failed to load linked contacts:', err);
        setContacts([]);
      } finally {
        setIsLoading(false);
      }
    }, [companyId]);

    useEffect(() => { loadContacts(); }, [loadContacts]);

    // Expose refresh() to parent via ref so it can reload after an assignment
    useImperativeHandle(ref, () => ({ refresh: loadContacts }), [loadContacts]);

    const assigned = contacts.filter(c => c.assignment_role);
    const unassigned = contacts.filter(c => !c.assignment_role);

    return (
      <>
        <Separator className="my-4" />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Linked Contacts ({contacts.length})
            {isAdmin && unassigned.length > 0 && (
              <span className="ml-auto text-[11px] font-normal text-amber-600 dark:text-amber-400">
                {unassigned.length} unassigned
              </span>
            )}
          </h3>

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts linked to this company.</p>
          ) : (
            <div className="space-y-1.5">
              {/* ── Assigned contacts — green highlight ── */}
              {assigned.map(contact => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-950/20 px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-emerald-100/80 dark:hover:bg-emerald-950/40 group"
                  onClick={() => onContactClick?.(contact.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate group-hover:text-primary transition-colors">
                      {contact.full_name}
                    </p>
                    {contact.designation && (
                      <p className="text-xs text-muted-foreground truncate">{contact.designation}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        contact.assignment_role === 'primary'
                          ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-transparent'
                          : 'border-muted-foreground/50 text-muted-foreground'
                      }`}
                    >
                      {contact.assignment_role}
                    </Badge>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}

              {/* ── Unassigned contacts — amber tint + Assign button for admin ── */}
              {unassigned.map(contact => (
                <div
                  key={contact.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors group ${
                    isAdmin
                      ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/10 hover:bg-amber-100/60 dark:hover:bg-amber-950/30'
                      : 'border-border hover:bg-accent/50 cursor-pointer'
                  }`}
                >
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => onContactClick?.(contact.id)}
                  >
                    <p className="font-medium truncate group-hover:text-primary transition-colors">
                      {contact.full_name}
                    </p>
                    {contact.designation && (
                      <p className="text-xs text-muted-foreground truncate">{contact.designation}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px] border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-600 dark:hover:bg-amber-950/40"
                        onClick={() => onAssignContact?.(contact.id, contact.full_name)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                    ) : (
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }
);
