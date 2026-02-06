import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
 import { Loader2, PhoneCall, Mail, Video, MessageSquare, FileEdit } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 import { AlertCircle } from 'lucide-react';
 import { Skeleton } from '@/components/ui/skeleton';
 import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentCrmUserId, listCrmUsersForAssignment, CrmUserForAssignment } from '@/services/profiles';
import { getCompanyNamesMap } from '@/services/contacts';
import { getOwnersForContacts, ContactOwners } from '@/services/assignments';
import { getUserNames } from '@/services/interactions';
import { ContactDetailsDrawer } from './ContactDetailsDrawer';
import { ContactsSearch } from './ContactsSearch';
import { ContactWithCompany } from '@/types';
 
 const INTERACTION_TYPE_ICONS: Record<string, React.ReactNode> = {
   CALL: <PhoneCall className="h-3 w-3" />,
   WHATSAPP: <MessageSquare className="h-3 w-3" />,
   EMAIL: <Mail className="h-3 w-3" />,
   MEETING: <Video className="h-3 w-3" />,
   NOTE: <FileEdit className="h-3 w-3" />,
 };
 
 interface MyAddedContactsTabProps {
   onRefresh?: () => void;
 }
 
 export function MyAddedContactsTab({ onRefresh }: MyAddedContactsTabProps) {
  const { session, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [crmUsersMap, setCrmUsersMap] = useState<Record<string, CrmUserForAssignment>>({});
  const [ownersMap, setOwnersMap] = useState<Record<string, ContactOwners>>({});
  const [ownerNamesMap, setOwnerNamesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
 
   // Drawer state
   const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
   const [drawerOpen, setDrawerOpen] = useState(false);
 
   const loadContacts = useCallback(async () => {
     if (!session) {
       setContacts([]);
       setIsLoading(false);
       return;
     }
 
     setIsLoading(true);
     setError(null);
 
     try {
       // Get current user's CRM ID
       const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
 
       if (crmError || !currentCrmUserId) {
         setError(crmError || 'CRM user not found');
         setContacts([]);
         setIsLoading(false);
         return;
       }
 
        // Fetch contacts created by this user from the view
        let contactsQuery = supabase
          .from('contacts_with_primary_phone')
          .select('*')
          .eq('created_by_crm_user_id', currentCrmUserId)
          .order('created_at', { ascending: false });

        // Also fetch CRM users for "Added By" display
        const { data: crmUsersData } = await listCrmUsersForAssignment();
        if (crmUsersData) {
          const usersMap: Record<string, CrmUserForAssignment> = {};
          crmUsersData.forEach(u => { usersMap[u.id] = u; });
          setCrmUsersMap(usersMap);
        }
 
       if (search.trim()) {
         contactsQuery = contactsQuery.ilike('full_name', `%${search.trim()}%`);
       }
 
       const { data: contactsData, error: contactsError } = await contactsQuery;
 
       if (contactsError) {
         setError(contactsError.message);
         setContacts([]);
         setIsLoading(false);
         return;
       }
 
       let contactsList = (contactsData || []) as ContactWithCompany[];
 
       // Fetch last interaction data
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

        // Fetch owners for all contacts
        if (contactsList.length > 0) {
          const contactIds = contactsList.map(c => c.id);
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
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Failed to load contacts');
     } finally {
       setIsLoading(false);
     }
   }, [search, session]);
 
   useEffect(() => {
     if (!authLoading) {
       loadContacts();
     }
   }, [loadContacts, authLoading]);
 
   const handleRowClick = (e: React.MouseEvent, contact: ContactWithCompany) => {
     const target = e.target as HTMLElement;
     if (target.closest('button') || target.closest('[role="menu"]')) {
       return;
     }
     setSelectedContact(contact);
     setDrawerOpen(true);
   };
 
   const formatLastInteraction = (contact: ContactWithCompany) => {
     if (!contact.last_interaction_at) return null;
     const type = contact.last_interaction_type || '';
     const timeAgo = formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true });
     const outcome = contact.last_interaction_outcome;
     return { type, timeAgo, outcome };
   };
 
  const formatCreatedDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, HH:mm');
    } catch {
      return '-';
    }
  };

  const formatAddedBy = (creatorId: string | null | undefined): string => {
    if (!creatorId) return 'Unknown';
    const user = crmUsersMap[creatorId];
    if (!user) return 'Unknown';
    return user.email ? `${user.full_name} (${user.email})` : user.full_name;
  };
  // Enhanced search: filter by name, company, email, phone
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const searchLower = search.toLowerCase().trim();
    return contacts.filter(contact => {
      const fullName = (contact.full_name || '').toLowerCase();
      const companyName = contact.company_id ? (companyNamesMap[contact.company_id] || '').toLowerCase() : '';
      const email = (contact.email || '').toLowerCase();
      const phone = (contact.primary_phone || '').toLowerCase();
      return fullName.includes(searchLower) || 
             companyName.includes(searchLower) || 
             email.includes(searchLower) || 
             phone.includes(searchLower);
    });
  }, [contacts, search, companyNamesMap]);

   if (isLoading) {
     return (
       <div className="space-y-4">
         <div className="flex justify-end">
           <ContactsSearch value={search} onChange={setSearch} />
         </div>
         <div className="rounded-md border overflow-x-auto">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Full Name</TableHead>
                 <TableHead>Company</TableHead>
                 <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                 <TableHead>Last Activity</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {Array.from({ length: 5 }).map((_, i) => (
                 <TableRow key={i}>
                   <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                   <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                   <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                   <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </div>
       </div>
     );
   }
 
   return (
     <div className="space-y-4">
       {error && (
         <Alert variant="destructive">
           <AlertCircle className="h-4 w-4" />
           <AlertDescription>{error}</AlertDescription>
         </Alert>
       )}
 
       <div className="flex items-center justify-between gap-4">
         <p className="text-sm text-muted-foreground">
            Showing {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} you added
         </p>
         <ContactsSearch value={search} onChange={setSearch} />
       </div>
 
        {filteredContacts.length === 0 ? (
         <div className="rounded-md border p-8 text-center">
            <p className="text-muted-foreground">{search.trim() ? 'No contacts match your search.' : 'No contacts found that you added.'}</p>
         </div>
       ) : (
         <div className="rounded-md border overflow-x-auto">
           <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Full Name</TableHead>
                   <TableHead>Company</TableHead>
                   <TableHead>Primary Owner</TableHead>
                   <TableHead>Secondary Owner</TableHead>
                   <TableHead>Added By</TableHead>
                   <TableHead>Created</TableHead>
                   <TableHead>Last Activity</TableHead>
                 </TableRow>
               </TableHeader>
              <TableBody>
                 {filteredContacts.map((contact) => {
                  const lastInteraction = formatLastInteraction(contact);
                  const owners = ownersMap[contact.id];
                  const primaryOwnerId = owners?.primary?.assigned_to_crm_user_id;
                  const secondaryOwnerId = owners?.secondary?.assigned_to_crm_user_id;
 
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
                       <TableCell className="text-sm text-muted-foreground">
                         {formatAddedBy((contact as any).created_by_crm_user_id)}
                       </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatCreatedDate(contact.created_at)}
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
 
       <ContactDetailsDrawer
         contact={selectedContact}
         companyName={selectedContact?.company_id ? companyNamesMap[selectedContact.company_id] || null : null}
         currentStage={null}
         isOpen={drawerOpen}
         onClose={() => {
           setDrawerOpen(false);
           setSelectedContact(null);
         }}
         onOwnersChange={loadContacts}
         onCompanyChange={(newCompanyId, newCompanyName) => {
           setCompanyNamesMap(prev => ({ ...prev, [newCompanyId]: newCompanyName }));
           loadContacts();
         }}
       />
     </div>
   );
 }