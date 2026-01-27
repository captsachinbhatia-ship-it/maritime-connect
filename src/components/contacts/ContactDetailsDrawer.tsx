import { format } from 'date-fns';
import { X, User, Building2, Phone, Mail, MessageSquare, FileText } from 'lucide-react';
import { ContactWithCompany } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ContactDetailsDrawerProps {
  contact: ContactWithCompany | null;
  companyName: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContactDetailsDrawer({
  contact,
  companyName,
  isOpen,
  onClose,
}: ContactDetailsDrawerProps) {
  if (!contact) return null;

  const formatPhone = () => {
    if (contact.mobile_number) {
      const code = contact.country_code ? `+${contact.country_code} ` : '';
      return `${code}${contact.mobile_number}`;
    }
    return null;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-md overflow-hidden p-0">
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              Contact Details
            </SheetTitle>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)] px-6 py-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{contact.full_name || 'Unknown'}</h3>
                  {contact.designation && (
                    <p className="text-sm text-muted-foreground">{contact.designation}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Company */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Company
              </h4>
              <p className="text-foreground">{companyName || 'Not assigned'}</p>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Phone className="h-4 w-4" />
                Phone
              </h4>
              <div className="space-y-2">
                {formatPhone() && (
                  <div>
                    <span className="text-xs text-muted-foreground">Mobile: </span>
                    <span className="text-foreground">{formatPhone()}</span>
                    {contact.phone_type && (
                      <span className="ml-2 text-xs text-muted-foreground">({contact.phone_type})</span>
                    )}
                  </div>
                )}
                {contact.landline_number && (
                  <div>
                    <span className="text-xs text-muted-foreground">Landline: </span>
                    <span className="text-foreground">{contact.landline_number}</span>
                  </div>
                )}
                {!formatPhone() && !contact.landline_number && (
                  <p className="text-muted-foreground">No phone number</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Email */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email
              </h4>
              <p className="text-foreground">{contact.email || 'Not provided'}</p>
            </div>

            <Separator />

            {/* Communication */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                Communication
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Preferred Channel</span>
                  <p className="text-foreground">{contact.preferred_channel || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">ICE Handle</span>
                  <p className="text-foreground">{contact.ice_handle || '-'}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {contact.notes && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Notes
                  </h4>
                  <p className="text-foreground whitespace-pre-wrap">{contact.notes}</p>
                </div>
              </>
            )}

            {/* Meta */}
            <Separator />
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Status</span>
                <span className={contact.is_active ? 'text-green-600' : 'text-red-600'}>
                  {contact.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated</span>
                <span>
                  {contact.updated_at
                    ? format(new Date(contact.updated_at), 'MMM d, yyyy h:mm a')
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
