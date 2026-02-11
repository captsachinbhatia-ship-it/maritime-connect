import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, AlertCircle, Trash2, Star, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { createContact, checkDuplicateContact, getAllCompaniesForDropdown } from '@/services/contacts';
import { saveContactPhones, ContactPhoneInput } from '@/services/contactPhones';
import { fetchContactsForDuplicateCheck, ContactForDuplicateCheck } from '@/services/duplicateContacts';
import { AddCompanyMiniModal } from './AddCompanyMiniModal';
import { PhoneInput } from '@/components/ui/phone-input';
import { useToast } from '@/hooks/use-toast';
import { DuplicateMatchesPanel, DuplicateMatch } from './DuplicateMatchesPanel';
import { HighMatchConfirmDialog } from './HighMatchConfirmDialog';
import {
  normalizePhone,
  isHighPhoneMatch,
  isLowPhoneMatch,
  isNameSimilar,
  isEmailSimilar,
} from '@/lib/duplicateDetection';

const contactSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  company_id: z.string().optional(),
  designation: z.string().max(100).optional(),
  country_code: z.string().max(10).optional(),
  phone: z.string().max(20).optional(),
  phone_type: z.string().optional(),
  ice_handle: z.string().max(100).optional(),
  preferred_channel: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface EmailEntry {
  id: string;
  email: string;
  is_primary: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AddContactModalProps {
  onSuccess: () => void;
}

const PREFERRED_CHANNELS = ['Email', 'Phone', 'WhatsApp', 'ICE', 'LinkedIn'];
const PHONE_TYPES = [
  { label: 'Mobile', value: 'Mobile' },
  { label: 'Landline', value: 'Landline' },
  { label: 'WhatsApp', value: 'WhatsApp' },
  { label: 'Other', value: 'Other' },
];

interface PhoneRow {
  id: string;
  phone_type: string;
  phone_number: string;
  is_primary: boolean;
  notes: string;
}

export function AddContactModal({ onSuccess }: AddContactModalProps) {
  const { user, crmUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Company dropdown state
  const [companies, setCompanies] = useState<{ id: string; company_name: string }[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  
  // Mini modal state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [pendingCompanyName, setPendingCompanyName] = useState('');
  
  // Phone numbers state
  const [phoneRows, setPhoneRows] = useState<PhoneRow[]>([
    { id: crypto.randomUUID(), phone_type: 'Mobile', phone_number: '', is_primary: true, notes: '' }
  ]);

  // Email state
  const [emailRows, setEmailRows] = useState<EmailEntry[]>([
    { id: crypto.randomUUID(), email: '', is_primary: true }
  ]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Duplicate detection state
  const [existingContacts, setExistingContacts] = useState<ContactForDuplicateCheck[]>([]);
  const [showHighMatchConfirm, setShowHighMatchConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<ContactFormData | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      full_name: '',
      company_id: '',
      designation: '',
      country_code: '+91',
      phone: '',
      phone_type: '',
      ice_handle: '',
      preferred_channel: '',
      notes: '',
    },
  });

  const watchedName = watch('full_name');
  // Use first email from emailRows for duplicate detection
  const watchedEmail = emailRows.find(e => e.email.trim())?.email || '';

  // Load companies and existing contacts on mount
  useEffect(() => {
    if (open) {
      loadCompanies();
      loadExistingContacts();
    }
  }, [open]);

  const loadCompanies = async () => {
    const result = await getAllCompaniesForDropdown();
    if (result.data) {
      setCompanies(result.data);
    }
  };

  const loadExistingContacts = async () => {
    const result = await fetchContactsForDuplicateCheck();
    if (result.data) {
      setExistingContacts(result.data);
    }
  };

  // Compute duplicate matches based on current form input
  const { highMatches, possibleMatches } = useMemo(() => {
    const high: DuplicateMatch[] = [];
    const possible: DuplicateMatch[] = [];
    const seenIds = new Set<string>();

    // Get all input phones
    const inputPhones = phoneRows
      .map(p => p.phone_number.trim())
      .filter(p => normalizePhone(p).length >= 4);

    const inputName = watchedName?.trim() || '';
    const inputEmail = watchedEmail?.trim() || '';

    for (const contact of existingContacts) {
      if (seenIds.has(contact.id)) continue;

      const reasons: string[] = [];
      let isHigh = false;

      // Check phone matches
      for (const inputPhone of inputPhones) {
        for (const existingPhone of contact.phones) {
          // High confidence: last 6 digits match
          if (isHighPhoneMatch(inputPhone, existingPhone)) {
            isHigh = true;
            reasons.push('Phone number closely matches');
            break;
          }
          // Low confidence: ANY 4 digits match
          if (isLowPhoneMatch(inputPhone, existingPhone)) {
            reasons.push('Phone has similar digits');
            break;
          }
        }
        if (isHigh) break;
      }

      // Check name similarity (if name has 3+ chars)
      if (inputName.length >= 3 && contact.full_name) {
        if (isNameSimilar(inputName, contact.full_name)) {
          reasons.push('Similar name');
        }
      }

      // Check email similarity
      if (inputEmail.length >= 3 && contact.email) {
        if (isEmailSimilar(inputEmail, contact.email)) {
          reasons.push('Similar email');
        }
      }

      if (reasons.length > 0) {
        seenIds.add(contact.id);
        const match: DuplicateMatch = {
          id: contact.id,
          full_name: contact.full_name,
          company_name: contact.company_name || null,
          stage: contact.stage || null,
          phone: contact.phones[0] || null,
          email: contact.email,
          matchType: isHigh ? 'high' : 'possible',
          matchReason: [...new Set(reasons)].join(', '),
        };

        if (isHigh) {
          high.push(match);
        } else {
          possible.push(match);
        }
      }
    }

    // Limit results to avoid overwhelming the UI
    return {
      highMatches: high.slice(0, 5),
      possibleMatches: possible.slice(0, 5),
    };
  }, [existingContacts, phoneRows, watchedName, watchedEmail]);

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    const search = companySearch.toLowerCase();
    return companies.filter(c => 
      c.company_name?.toLowerCase().includes(search)
    );
  }, [companies, companySearch]);

  const showAddCompanyOption = useMemo(() => {
    if (!companySearch.trim()) return false;
    const search = companySearch.toLowerCase().trim();
    return !companies.some(c => 
      c.company_name?.toLowerCase().trim() === search
    );
  }, [companies, companySearch]);

  const handleSelectCompany = (company: { id: string; company_name: string }) => {
    setSelectedCompany({ id: company.id, name: company.company_name });
    setValue('company_id', company.id);
    setCompanyPopoverOpen(false);
    setCompanySearch('');
  };

  const handleAddCompanyClick = () => {
    setPendingCompanyName(companySearch.trim());
    setShowAddCompanyModal(true);
    setCompanyPopoverOpen(false);
  };

  const handleCompanyCreated = (newCompany: { id: string; company_name: string }) => {
    setCompanies(prev => [...prev, newCompany].sort((a, b) => 
      (a.company_name || '').localeCompare(b.company_name || '')
    ));
    setSelectedCompany({ id: newCompany.id, name: newCompany.company_name });
    setValue('company_id', newCompany.id);
    setShowAddCompanyModal(false);
    setPendingCompanyName('');
  };

  const addPhoneRow = () => {
    setPhoneRows(prev => [
      ...prev,
      { id: crypto.randomUUID(), phone_type: 'Mobile', phone_number: '', is_primary: false, notes: '' }
    ]);
  };

  const removePhoneRow = (id: string) => {
    setPhoneRows(prev => {
      const filtered = prev.filter(p => p.id !== id);
      // If we removed the primary, make the first one primary
      if (filtered.length > 0 && !filtered.some(p => p.is_primary)) {
        filtered[0].is_primary = true;
      }
      return filtered;
    });
  };

  const updatePhoneRow = (id: string, field: keyof PhoneRow, value: string | boolean) => {
    setPhoneRows(prev => prev.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      // If setting is_primary to true, unset others
      if (field === 'is_primary' && value === true) {
        return { ...row, is_primary: false };
      }
      return row;
    }));
    
    // If setting primary, set this one after
    if (field === 'is_primary' && value === true) {
      setPhoneRows(prev => prev.map(row => ({
        ...row,
        is_primary: row.id === id
      })));
    }
  };

  const handleOpenContact = useCallback((contactId: string) => {
    // Open contact in new tab (or could navigate within app)
    window.open(`/contacts?open=${contactId}`, '_blank');
  }, []);

  const handleUseExisting = useCallback((contactId: string) => {
    // Close modal and redirect to existing contact
    setOpen(false);
    window.location.href = `/contacts?open=${contactId}`;
  }, []);

  const performSubmit = async (data: ContactFormData) => {
    if (!user || !crmUser) {
      setSubmitError('You must be logged in to create a contact');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Check for exact duplicates (using first phone if available)
      const firstPhone = phoneRows.find(p => p.phone_number.trim())?.phone_number || null;
      const primaryEmail = emailRows.find(e => e.is_primary && e.email.trim())?.email || emailRows.find(e => e.email.trim())?.email || null;
      const duplicateCheck = await checkDuplicateContact(
        primaryEmail,
        firstPhone
      );

      if (duplicateCheck.error) {
        setSubmitError(duplicateCheck.error);
        setIsSubmitting(false);
        return;
      }

      if (duplicateCheck.isDuplicate) {
        const field = duplicateCheck.duplicateField === 'email' ? 'email address' : 'phone number';
        setSubmitError(`A contact with this ${field} already exists.`);
        setIsSubmitting(false);
        return;
      }

      // Build phone string from phone rows for contacts.phone column
      const validPhoneRows = phoneRows.filter(p => p.phone_number.trim());
      const primaryPhoneRow = validPhoneRows.find(p => p.is_primary) || validPhoneRows[0] || null;
      const allPhonesString = validPhoneRows.map(p => p.phone_number.trim()).join(', ') || null;

      // Create contact - ensure empty strings become null
      const result = await createContact({
        full_name: data.full_name,
        company_id: data.company_id || null,
        designation: data.designation || null,
        country_code: primaryPhoneRow?.phone_number ? null : null,
        phone: allPhonesString,
        phone_type: primaryPhoneRow?.phone_type || null,
        email: emailRows.filter(e => e.email.trim()).map(e => e.email.trim()).join(', ') || null,
        ice_handle: data.ice_handle || null,
        preferred_channel: data.preferred_channel?.trim() || null,
        notes: data.notes || null,
      }, user.id);

      if (result.error) {
        setSubmitError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Save phone numbers to contact_phones table
      if (result.data?.id) {
        const validPhones = phoneRows.filter(p => p.phone_number.trim());
        if (validPhones.length > 0) {
          const phoneInputs: ContactPhoneInput[] = validPhones.map(p => ({
            phone_type: p.phone_type,
            phone_number: p.phone_number.trim(),
            is_primary: p.is_primary,
            notes: p.notes.trim() || undefined,
          }));
          await saveContactPhones(result.data.id, phoneInputs);
        }
      }

      // Success
      reset();
      setSelectedCompany(null);
      setPhoneRows([{ id: crypto.randomUUID(), phone_type: 'Mobile', phone_number: '', is_primary: true, notes: '' }]);
      setEmailRows([{ id: crypto.randomUUID(), email: '', is_primary: true }]);
      setEmailInput('');
      setEmailError(null);
      setOpen(false);
      toast({
        title: 'Contact created',
        description: `"${data.full_name}" has been added successfully.`,
      });
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setSubmitError(message);
      toast({ title: 'Error creating contact', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: ContactFormData) => {
    // Validate all emails
    const invalidEmails = emailRows
      .filter(e => e.email.trim())
      .filter(e => !EMAIL_REGEX.test(e.email.trim()));
    if (invalidEmails.length > 0) {
      setEmailError(`Invalid email: ${invalidEmails[0].email}`);
      return;
    }

    // If high matches exist, show confirmation dialog first
    if (highMatches.length > 0) {
      setPendingSubmitData(data);
      setShowHighMatchConfirm(true);
      return;
    }

    await performSubmit(data);
  };

  const handleConfirmCreate = async () => {
    setShowHighMatchConfirm(false);
    if (pendingSubmitData) {
      await performSubmit(pendingSubmitData);
      setPendingSubmitData(null);
    }
  };

  const handleCancelCreate = () => {
    setShowHighMatchConfirm(false);
    setPendingSubmitData(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
      setSelectedCompany(null);
      setSubmitError(null);
      setCompanySearch('');
      setPhoneRows([{ id: crypto.randomUUID(), phone_type: 'Mobile', phone_number: '', is_primary: true, notes: '' }]);
      setEmailRows([{ id: crypto.randomUUID(), email: '', is_primary: true }]);
      setEmailInput('');
      setEmailError(null);
      setPendingSubmitData(null);
    }
    setOpen(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Create a new contact record. Required fields are marked with *.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Duplicate Matches Panel */}
            <DuplicateMatchesPanel
              highMatches={highMatches}
              possibleMatches={possibleMatches}
              onOpenContact={handleOpenContact}
              onUseExisting={handleUseExisting}
            />

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                {...register('full_name')}
                placeholder="Enter full name"
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            {/* Company - Searchable Dropdown */}
            <div className="space-y-2">
              <Label>Company</Label>
              <Popover open={companyPopoverOpen} onOpenChange={setCompanyPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {selectedCompany ? selectedCompany.name : 'Select company...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search companies..."
                      value={companySearch}
                      onValueChange={setCompanySearch}
                      className="sticky top-0 z-10"
                    />
                    <CommandList className="max-h-[200px] overflow-y-auto">
                      <CommandEmpty>
                        {showAddCompanyOption ? (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-accent"
                            onClick={handleAddCompanyClick}
                          >
                            <Plus className="h-4 w-4" />
                            Add Company "{companySearch.trim()}"
                          </button>
                        ) : (
                          'No companies found.'
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredCompanies.map((company) => (
                          <CommandItem
                            key={company.id}
                            value={company.company_name || ''}
                            onSelect={() => handleSelectCompany(company)}
                          >
                            {company.company_name}
                          </CommandItem>
                        ))}
                        {showAddCompanyOption && filteredCompanies.length > 0 && (
                          <CommandItem
                            value={`add-${companySearch}`}
                            onSelect={handleAddCompanyClick}
                            className="text-primary"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Company "{companySearch.trim()}"
                          </CommandItem>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Designation */}
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                {...register('designation')}
                placeholder="e.g., Fleet Manager"
              />
            </div>

            {/* Phone Numbers Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Phone Numbers</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addPhoneRow}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Phone
                </Button>
              </div>
              
              <div className="space-y-3">
                {phoneRows.map((phone, index) => (
                  <div key={phone.id} className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={phone.phone_type}
                          onValueChange={(value) => updatePhoneRow(phone.id, 'phone_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {PHONE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <PhoneInput
                          value={phone.phone_number}
                          onChange={(value) => updatePhoneRow(phone.id, 'phone_number', value)}
                          placeholder="Phone number"
                        />
                      </div>
                      <Input
                        value={phone.notes}
                        onChange={(e) => updatePhoneRow(phone.id, 'notes', e.target.value)}
                        placeholder="Notes (optional)"
                        className="text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <Button
                        type="button"
                        variant={phone.is_primary ? "default" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updatePhoneRow(phone.id, 'is_primary', true)}
                        title={phone.is_primary ? "Primary" : "Set as primary"}
                      >
                        <Star className={`h-4 w-4 ${phone.is_primary ? 'fill-current' : ''}`} />
                      </Button>
                      {phoneRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removePhoneRow(phone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Addresses */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Email Addresses</Label>
              </div>

              {/* Email chips */}
              {emailRows.filter(e => e.email.trim()).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emailRows.filter(e => e.email.trim()).map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${
                        entry.is_primary
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-muted border-border text-foreground'
                      }`}
                    >
                      <span>{entry.email}</span>
                      {entry.is_primary && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/40">
                          Primary
                        </Badge>
                      )}
                      {!entry.is_primary && (
                        <button
                          type="button"
                          className="ml-0.5 hover:text-primary"
                          onClick={() => {
                            setEmailRows(prev =>
                              prev.map(e => ({ ...e, is_primary: e.id === entry.id }))
                            );
                          }}
                          title="Set as primary"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="ml-0.5 hover:text-destructive"
                        onClick={() => {
                          setEmailRows(prev => {
                            const filtered = prev.filter(e => e.id !== entry.id);
                            if (filtered.length > 0 && !filtered.some(e => e.is_primary)) {
                              filtered[0].is_primary = true;
                            }
                            return filtered;
                          });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Email input */}
              <div className="space-y-1">
                <Input
                  type="text"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setEmailError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                      e.preventDefault();
                      const val = emailInput.trim().replace(/,$/,'');
                      if (!val) return;
                      if (!EMAIL_REGEX.test(val)) {
                        setEmailError(`"${val}" is not a valid email`);
                        return;
                      }
                      if (emailRows.some(r => r.email.toLowerCase() === val.toLowerCase())) {
                        setEmailError('This email is already added');
                        return;
                      }
                      const isFirst = emailRows.filter(r => r.email.trim()).length === 0;
                      setEmailRows(prev => [
                        ...prev.filter(r => r.email.trim()),
                        { id: crypto.randomUUID(), email: val, is_primary: isFirst }
                      ]);
                      setEmailInput('');
                      setEmailError(null);
                    }
                  }}
                  onBlur={() => {
                    const val = emailInput.trim().replace(/,$/,'');
                    if (!val) return;
                    if (!EMAIL_REGEX.test(val)) {
                      setEmailError(`"${val}" is not a valid email`);
                      return;
                    }
                    if (emailRows.some(r => r.email.toLowerCase() === val.toLowerCase())) {
                      setEmailError('This email is already added');
                      return;
                    }
                    const isFirst = emailRows.filter(r => r.email.trim()).length === 0;
                    setEmailRows(prev => [
                      ...prev.filter(r => r.email.trim()),
                      { id: crypto.randomUUID(), email: val, is_primary: isFirst }
                    ]);
                    setEmailInput('');
                    setEmailError(null);
                  }}
                  placeholder="Type email and press Enter, comma, or space"
                />
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>
            </div>

            {/* ICE Handle */}
            <div className="space-y-2">
              <Label htmlFor="ice_handle">ICE Handle</Label>
              <Input
                id="ice_handle"
                {...register('ice_handle')}
                placeholder="ICE messenger handle"
              />
            </div>

            {/* Preferred Channel */}
            <div className="space-y-2">
              <Label>Preferred Channel</Label>
              <Select
                onValueChange={(value) => setValue('preferred_channel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select preferred channel" />
                </SelectTrigger>
                <SelectContent>
                  {PREFERRED_CHANNELS.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Contact
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AddCompanyMiniModal
        open={showAddCompanyModal}
        onOpenChange={setShowAddCompanyModal}
        initialName={pendingCompanyName}
        onSuccess={handleCompanyCreated}
      />

      <HighMatchConfirmDialog
        open={showHighMatchConfirm}
        onOpenChange={setShowHighMatchConfirm}
        matchCount={highMatches.length}
        onConfirm={handleConfirmCreate}
        onCancel={handleCancelCreate}
      />
    </>
  );
}
