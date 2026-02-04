import { useEffect, useState, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, RefreshCw, Users, PhoneCall, Mail, Video, MessageSquare, FileEdit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { ContactOwners, getOwnersForContacts } from '@/services/assignments';
import { getUserNames } from '@/services/interactions';
import { getCompanyNamesMap } from '@/services/contacts';
import { AssignOwnersModal } from './AssignOwnersModal';
import { ContactDetailsDrawer } from './ContactDetailsDrawer';
import { ContactWithCompany } from '@/types';

const INTERACTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  CALL: <PhoneCall className="h-3 w-3" />,
  WHATSAPP: <MessageSquare className="h-3 w-3" />,
  EMAIL: <Mail className="h-3 w-3" />,
  MEETING: <Video className="h-3 w-3" />,
  NOTE: <FileEdit className="h-3 w-3" />,
};

const STAGE_LABELS: Record<string, string> = {
  COLD_CALLING: 'Cold Calling',
  ASPIRATION: 'Aspiration',
  ACHIEVEMENT: 'Achievement',
  INACTIVE: 'Inactive',
};

const STAGE_COLORS: Record<string, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800',
  ASPIRATION: 'bg-amber-100 text-amber-800',
  ACHIEVEMENT: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
};

interface AssignedContact extends ContactWithCompany {
  stage: string | null;
}

export function AssignedContactsTab() {
  const [contacts, setContacts] = useState<AssignedContact[]>([]);
  const [ownersMap, setOwnersMap] = useState<Record<string, ContactOwners>>({});
  const [ownerNamesMap, setOwnerNamesMap] = useState<Record<string, string>>({});
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<AssignedContact | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContact, setDrawerContact] = useState<AssignedContact | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all contacts with ACTIVE assignments
      const { data: activeAssignments, error: assignmentsError } = await supabase
        .from('contact_assignments')
        .select('contact_id, stage, assigned_to_crm_user_id')
        .eq('status', 'ACTIVE')
        .eq('assignment_role', 'PRIMARY')
        .not('assigned_to_crm_user_id', 'is', null);

      if (assignmentsError) {
        console.error('[AssignedContactsTab] Error fetching assignments:', assignmentsError);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      const assignmentsByContact: Record<string, { stage: string }> = {};
      (activeAssignments || []).forEach(a => {
        assignmentsByContact[a.contact_id] = { stage: a.stage };
      });

      const contactIds = Object.keys(assignmentsByContact);

      if (contactIds.length === 0) {
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          id,
          full_name,
          company_id,
          designation,
          country_code,
          phone,
          phone_type,
          email,
          ice_handle,
          preferred_channel,
          notes,
          is_active,
          updated_at
        `)
        .in('id', contactIds)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (contactsError) {
        console.error('[AssignedContactsTab] Error fetching contacts:', contactsError);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Fetch last interaction data
      let contactsList = (contactsData || []).map((c: any) => ({
        ...c,
        stage: assignmentsByContact[c.id]?.stage || null,
      })) as AssignedContact[];

      if (contactsList.length > 0) {
        const contactIdsForInteraction = contactsList.map(c => c.id);
        const { data: lastInteractionData } = await supabase
          .from('v_contacts_last_interaction')
          .select('contact_id, last_interaction_at, last_interaction_type, last_interaction_outcome')
          .in('contact_id', contactIdsForInteraction);

        if (lastInteractionData && lastInteractionData.length > 0) {
          const liMap: Record<string, { last_interaction_at: string | null; last_interaction_type: string | null; last_interaction_outcome: string | null }> = {};
          lastInteractionData.forEach((li) => {
            liMap[li.contact_id] = {
              last_interaction_at: li.last_interaction_at,
              last_interaction_type: li.last_interaction_type,
              last_interaction_outcome: li.last_interaction_outcome,
            };
          });
          contactsList = contactsList.map(c => ({
            ...c,
            ...liMap[c.id],
          }));
        }
      }

      setContacts(contactsList);

      // Fetch company names
      const companyIds = contactsList
        .map(c => c.company_id)
        .filter((id): id is string => id !== null);

      if (companyIds.length > 0) {
        const namesResult = await getCompanyNamesMap(companyIds);
        if (namesResult.data) {
          setCompanyNamesMap(namesResult.data);
        }
      }

      // Fetch owners
      if (contactIds.length > 0) {
        const ownersResult = await getOwnersForContacts(contactIds);
        if (ownersResult.data) {
          setOwnersMap(ownersResult.data);

          // Collect owner user IDs for name resolution
          const ownerUserIds = new Set<string>();
          Object.values(ownersResult.data).forEach(owners => {
            if (owners.primary?.assigned_to_crm_user_id) {
              ownerUserIds.add(owners.primary.assigned_to_crm_user_id);
            }
            if (owners.secondary?.assigned_to_crm_user_id) {
              ownerUserIds.add(owners.secondary.assigned_to_crm_user_id);
            }
          });

          if (ownerUserIds.size > 0) {
            const ownerNamesResult = await getUserNames(Array.from(ownerUserIds));
            if (ownerNamesResult.data) {
              setOwnerNamesMap(ownerNamesResult.data);
            }
          }
        }
      }
    } catch (error) {
      console.error('[AssignedContactsTab] Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReassignClick = (contact: AssignedContact, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedContact(contact);
    setReassignModalOpen(true);
  };

  const handleReassignSuccess = () => {
    fetchData();
  };

  const handleRowClick = (contact: AssignedContact) => {
    setDrawerContact(contact);
    setDrawerOpen(true);
  };

  const formatLastInteraction = (contact: AssignedContact) => {
    if (!contact.last_interaction_at) return null;

    const type = contact.last_interaction_type || '';
    const timeAgo = formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true });
    const outcome = contact.last_interaction_outcome;

    return { type, timeAgo, outcome };
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Users className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Assigned Contacts</CardTitle>
                <CardDescription>
                  {isLoading ? 'Loading...' : `${contacts.length} contacts with owners`}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">No assigned contacts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Primary Owner</TableHead>
                    <TableHead>Secondary Owner</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => {
                    const owners = ownersMap[contact.id];
                    const primaryOwnerId = owners?.primary?.assigned_to_crm_user_id;
                    const secondaryOwnerId = owners?.secondary?.assigned_to_crm_user_id;
                    const lastInteraction = formatLastInteraction(contact);

                    return (
                      <TableRow
                        key={contact.id}
                        className="cursor-pointer"
                        onClick={() => handleRowClick(contact)}
                      >
                        <TableCell className="font-medium">
                          {contact.full_name || '—'}
                        </TableCell>
                        <TableCell>
                          {contact.company_id ? (
                            <Badge variant="secondary">
                              {companyNamesMap[contact.company_id] || '—'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.stage ? (
                            <Badge className={STAGE_COLORS[contact.stage] || ''}>
                              {STAGE_LABELS[contact.stage] || contact.stage}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
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
                          {lastInteraction ? (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {INTERACTION_TYPE_ICONS[lastInteraction.type] || null}
                                <span>{lastInteraction.type}</span>
                              </span>
                              <span>·</span>
                              <span>{lastInteraction.timeAgo}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleReassignClick(contact, e)}
                          >
                            <Users className="mr-1 h-4 w-4" />
                            Reassign Owners
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedContact && (
        <AssignOwnersModal
          open={reassignModalOpen}
          onOpenChange={setReassignModalOpen}
          contactId={selectedContact.id}
          contactName={selectedContact.full_name || 'Unknown'}
          currentOwners={ownersMap[selectedContact.id] || null}
          onSuccess={handleReassignSuccess}
        />
      )}

      <ContactDetailsDrawer
        contact={drawerContact}
        companyName={drawerContact?.company_id ? companyNamesMap[drawerContact.company_id] || null : null}
        currentStage={drawerContact?.stage || null}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerContact(null);
        }}
        onOwnersChange={fetchData}
        onCompanyChange={(newCompanyId, newCompanyName) => {
          setCompanyNamesMap(prev => ({ ...prev, [newCompanyId]: newCompanyName }));
          fetchData();
        }}
      />
    </>
  );
}
