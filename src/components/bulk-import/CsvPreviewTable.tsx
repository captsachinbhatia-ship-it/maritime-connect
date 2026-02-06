import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ParsedCsvRow } from '@/services/bulkImport';

interface CsvPreviewTableProps {
  rows: ParsedCsvRow[];
}

export function CsvPreviewTable({ rows }: CsvPreviewTableProps) {
  if (rows.length === 0) return null;

  const displayRows = rows.slice(0, 50);
  const hasMore = rows.length > 50;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Preview ({rows.length} rows parsed{hasMore ? ', showing first 50' : ''})
      </p>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Country</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium">{row.full_name || '-'}</TableCell>
                <TableCell>{row.company_name || '-'}</TableCell>
                <TableCell>{row.designation || '-'}</TableCell>
                <TableCell className="max-w-[180px] truncate">{row.email || '-'}</TableCell>
                <TableCell>{row.phone || '-'}</TableCell>
                <TableCell>{row.phone_type || '-'}</TableCell>
                <TableCell>{row.country_code || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
