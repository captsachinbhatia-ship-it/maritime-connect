import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, ExternalLink } from 'lucide-react';
import type { StagingRow } from '@/services/bulkImport';
import { fetchContactById } from '@/services/bulkImport';

interface StagingTableProps {
  rows: StagingRow[];
  isLoading: boolean;
  isAdmin: boolean;
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'VALIDATED':
      return 'default';
    case 'IMPORTED':
      return 'secondary';
    case 'FAILED':
      return 'destructive';
    case 'DUPLICATE':
      return 'outline';
    default:
      return 'secondary';
  }
}

function renderValidationErrors(errors: unknown): string {
  if (!errors) return '-';
  if (typeof errors === 'string') return errors;
  if (Array.isArray(errors)) {
    return errors
      .map((e) => {
        if (typeof e === 'string') return e;
        if (e && typeof e === 'object') {
          const field = (e as Record<string, unknown>).field || '';
          const message = (e as Record<string, unknown>).message || JSON.stringify(e);
          return field ? `${field}: ${message}` : String(message);
        }
        return JSON.stringify(e);
      })
      .join('; ');
  }
  return JSON.stringify(errors);
}

export function StagingTable({ rows, isLoading, isAdmin }: StagingTableProps) {
  const [previewContact, setPreviewContact] = useState<{
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    designation: string | null;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleDuplicateClick = async (contactId: string) => {
    if (!isAdmin) return;
    setPreviewLoading(true);
    setPreviewOpen(true);
    const { data } = await fetchContactById(contactId);
    setPreviewContact(data);
    setPreviewLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No rows to display.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Errors</TableHead>
              <TableHead>Dup. Contact</TableHead>
              <TableHead>Created Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.full_name || '-'}</TableCell>
                <TableCell>{row.company_name || '-'}</TableCell>
                <TableCell>{row.designation || '-'}</TableCell>
                <TableCell className="max-w-[180px] truncate">{row.email || '-'}</TableCell>
                <TableCell>{row.phone || '-'}</TableCell>
                <TableCell>{row.phone_type || '-'}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(row.status)}>
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[220px] text-xs">
                  {renderValidationErrors(row.validation_errors)}
                </TableCell>
                <TableCell>
                  {row.duplicate_contact_id ? (
                    isAdmin ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => handleDuplicateClick(row.duplicate_contact_id!)}
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Restricted</span>
                    )
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {row.created_contact_id
                    ? row.created_contact_id.slice(0, 8) + '…'
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Duplicate contact preview sheet */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Existing Contact</SheetTitle>
          </SheetHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : previewContact ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium text-foreground">{previewContact.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground">{previewContact.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="text-foreground">{previewContact.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Designation</p>
                <p className="text-foreground">{previewContact.designation || '-'}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Contact not found.</p>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
