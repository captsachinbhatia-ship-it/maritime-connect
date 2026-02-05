import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, AlertCircle, Trash2, Star } from 'lucide-react';
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
import { AddCompanyMiniModal } from './AddCompanyMiniModal';
import { PhoneInput } from '@/components/ui/phone-input';

const contactSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  company_id: z.string().optional(),
  designation: z.string().max(100).optional(),
  country_code: z.string().max(10).optional(),
  phone: z.string().max(20).optional(),
  phone_type: z.string().optional(),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  ice_handle: z.string().max(100).optional(),
  preferred_channel: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

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
      email: '',
      ice_handle: '',
      preferred_channel: '',
      notes: '',
    },
  });

  // Load companies on mount
  useEffect(() => {
    if (open) {
      loadCompanies();
    }
  }, [open]);

  const loadCompanies = async () => {
    const result = await getAllCompaniesForDropdown();
    if (result.data) {
      setCompanies(result.data);
    }
  };

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

  const onSubmit = async (data: ContactFormData) => {
    if (!user || !crmUser) {
      setSubmitError('You must be logged in to create a contact');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Check for duplicates (using first phone if available)
      const firstPhone = phoneRows.find(p => p.phone_number.trim())?.phone_number || null;
      const duplicateCheck = await checkDuplicateContact(
        data.email || null,
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

      // Create contact
      const result = await createContact({
        full_name: data.full_name,
        company_id: data.company_id || null,
        designation: data.designation || null,
        country_code: null,
        phone: null,
        phone_type: null,
        email: data.email || null,
        ice_handle: data.ice_handle || null,
        preferred_channel: data.preferred_channel || null,
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
      setOpen(false);
      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
      setSelectedCompany(null);
      setSubmitError(null);
      setCompanySearch('');
      setPhoneRows([{ id: crypto.randomUUID(), phone_type: 'Mobile', phone_number: '', is_primary: true, notes: '' }]);
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
                    />
                    <CommandList>
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

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
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
    </>
  );
}
