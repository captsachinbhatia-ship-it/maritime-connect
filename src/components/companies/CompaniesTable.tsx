import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { CompanyWithContactCount } from '@/types';

interface CompaniesTableProps {
  companies: CompanyWithContactCount[];
  loading: boolean;
  onRowClick: (company: CompanyWithContactCount) => void;
}

export function CompaniesTable({
  companies,
  loading,
  onRowClick,
}: CompaniesTableProps) {
  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
          <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Contacts</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
          <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Contacts</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                No companies found. Try adjusting your filters or add a new company.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Company Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Contacts</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company, idx) => (
            <TableRow
              key={company.id}
              className="cursor-pointer"
              onClick={() => onRowClick(company)}
            >
              <TableCell className="text-xs text-muted-foreground tabular-nums">{idx + 1}</TableCell>
              <TableCell className="font-medium">
                {company.company_name || '—'}
              </TableCell>
              <TableCell>
                {company.company_type ? (
                  <Badge variant="secondary">{company.company_type}</Badge>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>{company.country || '—'}</TableCell>
              <TableCell>{company.region || '—'}</TableCell>
              <TableCell>
                {company.status ? (
                  <Badge variant="outline">{company.status}</Badge>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="tabular-nums">
                  {company.contacts_count}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {company.updated_at
                  ? format(new Date(company.updated_at), 'MMM d, yyyy')
                  : '—'}
              </TableCell>
              <TableCell>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
