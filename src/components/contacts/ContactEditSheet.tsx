import { useState, useEffect } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

const PREFERRED_CHANNELS = ['Email', 'Phone', 'WhatsApp', 'ICE', 'LinkedIn'];
const STAGE_OPTIONS = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'INACTIVE', label: 'Inactive' },
];

interface ContactEditSheetProps {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ContactData {
  id: string;
  full_name: string;
  designation: string;
  phone_numbers: string[];
  emails: string[];
  ice_handle: string;
  preferred_channel: string;
  stage: string;
  notes: string;
  company_name: string;
}

export function ContactEditSheet({ contactId, open, onOpenChange, onSuccess }: ContactEditSheetProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState<ContactData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (contactId && open) {
      loadContact(contactId);
    }
  }, [contactId, open]);

  const loadContact = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*, companies(company_name)')
      .eq('id', id)
      .single();

    if (error || !data) {
      toast({ title: 'Error', description: 'Failed to load contact', variant: 'destructive' });
      setLoading(false);
      return;
    }

    setContact({
      id: data.id,
      full_name: data.full_name || '',
      designation: data.designation || '',
      phone_numbers: data.phone ? data.phone.split(',').map((p: string) => p.trim()) : [''],
      emails: data.email ? data.email.split(',').map((e: string) => e.trim()) : [''],
      ice_handle: data.ice_handle || '',
      preferred_channel: data.preferred_channel || '',
      stage: data.stage || 'COLD_CALLING',
      notes: data.notes || '',
      company_name: data.companies?.company_name || '',
    });
    setLoading(false);
  };

  const updateField = (field: keyof ContactData, value: string) => {
    if (!contact) return;
    setContact({ ...contact, [field]: value });
  };

  const updatePhoneAt = (index: number, value: string) => {
    if (!contact) return;
    const newPhones = [...contact.phone_numbers];
    newPhones[index] = value;
    setContact({ ...contact, phone_numbers: newPhones });
  };

  const addPhone = () => {
    if (!contact) return;
    setContact({ ...contact, phone_numbers: [...contact.phone_numbers, ''] });
  };

  const removePhone = (index: number) => {
    if (!contact || contact.phone_numbers.length <= 1) return;
    setContact({ ...contact, phone_numbers: contact.phone_numbers.filter((_, i) => i !== index) });
  };

  const updateEmailAt = (index: number, value: string) => {
    if (!contact) return;
    const newEmails = [...contact.emails];
    newEmails[index] = value;
    setContact({ ...contact, emails: newEmails });
  };

  const addEmail = () => {
    if (!contact) return;
    setContact({ ...contact, emails: [...contact.emails, ''] });
  };

  const removeEmail = (index: number) => {
    if (!contact || contact.emails.length <= 1) return;
    setContact({ ...contact, emails: contact.emails.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!contact || !contact.full_name.trim()) {
      toast({ title: 'Validation', description: 'Full name is required.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const phone = contact.phone_numbers.filter(p => p.trim()).join(', ') || null;
    const email = contact.emails.filter(e => e.trim()).join(', ') || null;

    const { error } = await supabase
      .from('contacts')
      .update({
        full_name: contact.full_name.trim(),
        designation: contact.designation || null,
        phone,
        email,
        ice_handle: contact.ice_handle || null,
        preferred_channel: contact.preferred_channel || null,
        notes: contact.notes || null,
      })
      .eq('id', contact.id);

    setSaving(false);

    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Contact updated', description: 'Changes saved successfully.' });
    onSuccess();
    onOpenChange(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setContact(null);
      setLoading(true);
    }
    onOpenChange(isOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Contact</SheetTitle>
          <SheetDescription>Update contact information. Required fields are marked with *.</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : contact ? (
          <div className="space-y-5 mt-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={contact.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                placeholder="Enter full name"
              />
            </div>

            {/* Company (read-only) */}
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={contact.company_name} disabled className="bg-muted/50" />
            </div>

            {/* Designation */}
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={contact.designation}
                onChange={(e) => updateField('designation', e.target.value)}
                placeholder="e.g., Fleet Manager"
              />
            </div>

            {/* Phone Numbers (multiple) */}
            <div className="space-y-2">
              <Label>Phone Numbers</Label>
              {contact.phone_numbers.map((phone, index) => (
                <div key={index} className="flex items-center gap-2">
                  <PhoneInput
                    value={phone}
                    onChange={(val) => updatePhoneAt(index, val)}
                    placeholder="+1 234 567 8900"
                    className="flex-1"
                  />
                  {contact.phone_numbers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => removePhone(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="link" size="sm" className="px-0 text-primary" onClick={addPhone}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Phone Number
              </Button>
            </div>

            {/* Email Addresses (multiple) */}
            <div className="space-y-2">
              <Label>Email Addresses</Label>
              {contact.emails.map((email, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmailAt(index, e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1"
                  />
                  {contact.emails.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => removeEmail(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="link" size="sm" className="px-0 text-primary" onClick={addEmail}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Email Address
              </Button>
            </div>

            {/* ICE Handle */}
            <div className="space-y-2">
              <Label>ICE Handle</Label>
              <Input
                value={contact.ice_handle}
                onChange={(e) => updateField('ice_handle', e.target.value)}
                placeholder="ICE messenger handle"
              />
            </div>

            {/* Preferred Channel */}
            <div className="space-y-2">
              <Label>Preferred Channel</Label>
              <Select value={contact.preferred_channel || ''} onValueChange={(val) => updateField('preferred_channel', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {PREFERRED_CHANNELS.map((ch) => (
                    <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={contact.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Additional notes..."
                className="min-h-[80px]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Contact not found</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
