import { format } from 'date-fns';
import { ContactWithCompany } from '@/types';
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
  isLoading: boolean;
  onRowClick: (contact: ContactWithCompany) => void;
}

export function ContactsTable({
  contacts,
  companyNamesMap,
  isLoading,
  onRowClick,
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
              <TableHead>Preferred Channel</TableHead>
              <TableHead>Updated</TableHead>
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
    if (contact.mobile_number) {
      const code = contact.country_code ? `+${contact.country_code} ` : '';
      return `${code}${contact.mobile_number}`;
    }
    if (contact.landline_number) {
      return contact.landline_number;
    }
    return '-';
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
            <TableHead>Preferred Channel</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              className="cursor-pointer"
              onClick={() => onRowClick(contact)}
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
              <TableCell>{contact.preferred_channel || '-'}</TableCell>
              <TableCell>
                {contact.updated_at
                  ? format(new Date(contact.updated_at), 'MMM d, yyyy')
                  : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
