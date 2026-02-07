import { useEffect, useState, useCallback } from 'react';
import { Users, Loader2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabaseClient';

interface LinkedContact {
  id: string;
  full_name: string;
  designation: string | null;
  assignment_role: string | null;
}

interface LinkedContactsListProps {
  companyId: string;
  onContactClick?: (contactId: string) => void;
}

export function LinkedContactsList({ companyId, onContactClick }: LinkedContactsListProps) {
  const [contacts, setContacts] = useState<LinkedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get contacts for this company
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

      // Get active assignments for these contacts
      const contactIds = contactsData.map(c => c.id);
      const { data: assignments } = await supabase
        .from('contact_assignments')
        .select('contact_id, assignment_role')
        .in('contact_id', contactIds)
        .eq('status', 'ACTIVE')
        .in('assignment_role', ['PRIMARY', 'SECONDARY']);

      // Build role map (prefer PRIMARY)
      const roleMap = new Map<string, string>();
      (assignments || []).forEach(a => {
        const existing = roleMap.get(a.contact_id);
        if (!existing || a.assignment_role === 'PRIMARY') {
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

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return (
    <>
      <Separator className="my-4" />
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Linked Contacts ({contacts.length})
        </h3>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts linked to this company.</p>
        ) : (
          <div className="space-y-1">
            {contacts.map(contact => (
              <div
                key={contact.id}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent/50 cursor-pointer transition-colors group"
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
                  {contact.assignment_role && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        contact.assignment_role === 'PRIMARY'
                          ? 'border-primary/50 text-primary'
                          : 'border-muted-foreground/50 text-muted-foreground'
                      }`}
                    >
                      {contact.assignment_role}
                    </Badge>
                  )}
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
