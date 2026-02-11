import { useState, useEffect } from 'react';
import { Loader2, Plus, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸', label: 'US' },
  { code: '+44', flag: '🇬🇧', label: 'UK' },
  { code: '+91', flag: '🇮🇳', label: 'IN' },
  { code: '+971', flag: '🇦🇪', label: 'AE' },
  { code: '+65', flag: '🇸🇬', label: 'SG' },
  { code: '+852', flag: '🇭🇰', label: 'HK' },
  { code: '+86', flag: '🇨🇳', label: 'CN' },
  { code: '+81', flag: '🇯🇵', label: 'JP' },
  { code: '+82', flag: '🇰🇷', label: 'KR' },
  { code: '+49', flag: '🇩🇪', label: 'DE' },
  { code: '+33', flag: '🇫🇷', label: 'FR' },
  { code: '+39', flag: '🇮🇹', label: 'IT' },
  { code: '+34', flag: '🇪🇸', label: 'ES' },
  { code: '+31', flag: '🇳🇱', label: 'NL' },
  { code: '+46', flag: '🇸🇪', label: 'SE' },
  { code: '+47', flag: '🇳🇴', label: 'NO' },
  { code: '+45', flag: '🇩🇰', label: 'DK' },
  { code: '+61', flag: '🇦🇺', label: 'AU' },
  { code: '+64', flag: '🇳🇿', label: 'NZ' },
  { code: '+27', flag: '🇿🇦', label: 'ZA' },
  { code: '+55', flag: '🇧🇷', label: 'BR' },
  { code: '+52', flag: '🇲🇽', label: 'MX' },
];

const PHONE_TYPES = ['Mobile', 'Office', 'Home', 'WhatsApp'];

interface ContactEditSheetProps {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PhoneEntry {
  country_code: string;
  type: string;
  number: string;
  is_primary: boolean;
}

interface EmailEntry {
  email: string;
  is_primary: boolean;
}

interface ContactData {
  id: string;
  full_name: string;
  designation: string;
  phone_numbers: PhoneEntry[];
  emails: EmailEntry[];
  ice_handle: string;
  preferred_channel: string;
  notes: string;
  company_name: string;
}

/** Parse a phone string like "+91 9876543210" into country_code and number */
function parsePhoneWithCode(raw: string): { country_code: string; number: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\+\d{1,4})\s+(.+)$/);
  if (match) {
    return { country_code: match[1], number: match[2] };
  }
  // Check if starts with + but no space
  const match2 = trimmed.match(/^(\+\d{1,4})(\d.*)$/);
  if (match2) {
    return { country_code: match2[1], number: match2[2] };
  }
  return { country_code: '+91', number: trimmed };
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

    // Parse phone numbers with country codes
    const phoneNumbers: PhoneEntry[] = data.phone
      ? data.phone.split(',').map((p: string, idx: number) => {
          const parsed = parsePhoneWithCode(p);
          return {
            country_code: parsed.country_code,
            type: 'Mobile',
            number: parsed.number,
            is_primary: idx === 0,
          };
        })
      : [{ country_code: '+91', type: 'Mobile', number: '', is_primary: true }];

    // Parse emails
    const emails: EmailEntry[] = data.email
      ? data.email.split(',').map((e: string, idx: number) => ({
          email: e.trim(),
          is_primary: idx === 0,
        }))
      : [{ email: '', is_primary: true }];

    setContact({
      id: data.id,
      full_name: data.full_name || '',
      designation: data.designation || '',
      phone_numbers: phoneNumbers,
      emails: emails,
      ice_handle: data.ice_handle || '',
      preferred_channel: data.preferred_channel || '',
      notes: data.notes || '',
      company_name: data.companies?.company_name || '',
    });
    setLoading(false);
  };

  const updateField = (field: keyof ContactData, value: string) => {
    if (!contact) return;
    setContact({ ...contact, [field]: value });
  };

  // Phone helpers
  const updatePhone = (index: number, field: keyof PhoneEntry, value: string | boolean) => {
    if (!contact) return;
    const newPhones = [...contact.phone_numbers];
    if (field === 'is_primary' && value === true) {
      // Unset all others
      newPhones.forEach((p, i) => { p.is_primary = i === index; });
    } else {
      (newPhones[index] as any)[field] = value;
    }
    setContact({ ...contact, phone_numbers: newPhones });
  };

  const addPhone = () => {
    if (!contact) return;
    setContact({
      ...contact,
      phone_numbers: [...contact.phone_numbers, { country_code: '+91', type: 'Mobile', number: '', is_primary: false }],
    });
  };

  const removePhone = (index: number) => {
    if (!contact || contact.phone_numbers.length <= 1) return;
    const newPhones = contact.phone_numbers.filter((_, i) => i !== index);
    if (!newPhones.some(p => p.is_primary) && newPhones.length > 0) newPhones[0].is_primary = true;
    setContact({ ...contact, phone_numbers: newPhones });
  };

  // Email helpers
  const updateEmail = (index: number, value: string) => {
    if (!contact) return;
    const newEmails = [...contact.emails];
    newEmails[index] = { ...newEmails[index], email: value };
    setContact({ ...contact, emails: newEmails });
  };

  const addEmail = () => {
    if (!contact) return;
    setContact({ ...contact, emails: [...contact.emails, { email: '', is_primary: false }] });
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

    // Format phones: "+91 9876543210, +44 7700900123"
    const formattedPhones = contact.phone_numbers
      .filter(p => p.number.trim())
      .map(p => `${p.country_code} ${p.number.trim()}`)
      .join(', ') || null;

    const formattedEmails = contact.emails
      .filter(e => e.email.trim())
      .map(e => e.email.trim())
      .join(', ') || null;

    const { error } = await supabase
      .from('contacts')
      .update({
        full_name: contact.full_name.trim(),
        designation: contact.designation || null,
        phone: formattedPhones,
        email: formattedEmails,
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

            {/* Phone Numbers with Country Code */}
            <div className="space-y-3">
              <Label>Phone Numbers</Label>
              {contact.phone_numbers.map((phone, index) => (
                <div key={index} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-[110px_100px_1fr] gap-2">
                      {/* Country Code */}
                      <select
                        value={phone.country_code}
                        onChange={(e) => updatePhone(index, 'country_code', e.target.value)}
                        className="px-2 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {COUNTRY_CODES.map(cc => (
                          <option key={cc.code} value={cc.code}>
                            {cc.flag} {cc.code}
                          </option>
                        ))}
                      </select>
                      {/* Phone Type */}
                      <select
                        value={phone.type}
                        onChange={(e) => updatePhone(index, 'type', e.target.value)}
                        className="px-2 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {PHONE_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      {/* Number */}
                      <Input
                        type="tel"
                        inputMode="tel"
                        value={phone.number}
                        onChange={(e) => updatePhone(index, 'number', e.target.value)}
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pt-1">
                    <Button
                      type="button"
                      variant={phone.is_primary ? 'default' : 'ghost'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updatePhone(index, 'is_primary', true)}
                      title={phone.is_primary ? 'Primary' : 'Set as primary'}
                    >
                      <Star className={`h-4 w-4 ${phone.is_primary ? 'fill-current' : ''}`} />
                    </Button>
                    {contact.phone_numbers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removePhone(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
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
              {contact.emails.map((emailEntry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={emailEntry.email}
                    onChange={(e) => updateEmail(index, e.target.value)}
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
