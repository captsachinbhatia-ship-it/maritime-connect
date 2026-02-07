import { format } from 'date-fns';
import { Building2, Globe, Mail, Phone, MapPin, Calendar, Tag, FileText, CheckCircle, XCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LinkedContactsList } from './LinkedContactsList';
import type { CompanyWithContactCount } from '@/types';

interface CompanyDetailsDrawerProps {
  company: CompanyWithContactCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyDetailsDrawer({
  company,
  open,
  onOpenChange,
}: CompanyDetailsDrawerProps) {
  if (!company) return null;

  const handleContactClick = (contactId: string) => {
    // Navigate to the contact
    window.open(`/contacts?open=${contactId}`, '_blank');
  };

  const DetailRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-xl break-words">
                {company.company_name || 'Unnamed Company'}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                {company.company_type && (
                  <Badge variant="secondary">{company.company_type}</Badge>
                )}
                {company.is_active ? (
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground mb-3">Contact Information</h3>
          
          <DetailRow
            icon={Globe}
            label="Website"
            value={
              company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {company.website}
                </a>
              ) : null
            }
          />
          
          <DetailRow
            icon={Mail}
            label="Email"
            value={
              company.email_general ? (
                <a
                  href={`mailto:${company.email_general}`}
                  className="text-primary hover:underline"
                >
                  {company.email_general}
                </a>
              ) : null
            }
          />
          
          <DetailRow
            icon={Phone}
            label="Phone"
            value={company.phone_general}
          />
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground mb-3">Location</h3>
          
          <DetailRow
            icon={MapPin}
            label="City"
            value={company.city}
          />
          
          <DetailRow
            icon={MapPin}
            label="Region"
            value={company.region}
          />
          
          <DetailRow
            icon={MapPin}
            label="Country"
            value={company.country}
          />
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground mb-3">Details</h3>
          
          <DetailRow
            icon={Tag}
            label="Status"
            value={company.status && <Badge variant="outline">{company.status}</Badge>}
          />
          
          <DetailRow
            icon={Building2}
            label="Contacts"
            value={`${company.contacts_count} contact${company.contacts_count !== 1 ? 's' : ''}`}
          />
          
          <DetailRow
            icon={Calendar}
            label="Last Updated"
            value={
              company.updated_at
                ? format(new Date(company.updated_at), 'PPp')
                : null
            }
          />
        </div>

        {company.notes && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Notes
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-md p-3">
                {company.notes}
              </p>
            </div>
          </>
        )}

        {/* Linked Contacts Section */}
        <LinkedContactsList
          companyId={company.id}
          onContactClick={handleContactClick}
        />
      </SheetContent>
    </Sheet>
  );
}
