import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { createCompany, checkDuplicateCompanyName } from '@/services/companies';
import { AddCompanyMiniModal } from './AddCompanyMiniModal';

const contactSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  company_id: z.string().optional(),
  designation: z.string().max(100).optional(),
  country_code: z.string().max(5).optional(),
  mobile_number: z.string().max(20).optional(),
  landline_number: z.string().max(20).optional(),
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
const PHONE_TYPES = ['Mobile', 'Work', 'Personal'];

export function AddContactModal({ onSuccess }: AddContactModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sameAsMobile, setSameAsMobile] = useState(false);
  
  // Company dropdown state
  const [companies, setCompanies] = useState<{ id: string; company_name: string }[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  
  // Mini modal state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [pendingCompanyName, setPendingCompanyName] = useState('');

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
      country_code: '',
      mobile_number: '',
      landline_number: '',
      phone_type: '',
      email: '',
      ice_handle: '',
      preferred_channel: '',
      notes: '',
    },
  });

  const mobileNumber = watch('mobile_number');

  // Load companies on mount
  useEffect(() => {
    if (open) {
      loadCompanies();
    }
  }, [open]);

  // Handle "Same as mobile" checkbox
  useEffect(() => {
    if (sameAsMobile && mobileNumber) {
      setValue('landline_number', mobileNumber);
    }
  }, [sameAsMobile, mobileNumber, setValue]);

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

  const onSubmit = async (data: ContactFormData) => {
    if (!user) {
      setSubmitError('You must be logged in to create a contact');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Check for duplicates
      const duplicateCheck = await checkDuplicateContact(
        data.email || null,
        data.mobile_number || null
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
        country_code: data.country_code || null,
        mobile_number: data.mobile_number || null,
        landline_number: data.landline_number || null,
        phone_type: data.phone_type || null,
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

      // Success
      reset();
      setSelectedCompany(null);
      setSameAsMobile(false);
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
      setSameAsMobile(false);
      setSubmitError(null);
      setCompanySearch('');
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

            {/* Phone Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="country_code">Country Code</Label>
                  <Input
                    id="country_code"
                    {...register('country_code')}
                    placeholder="+1"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="mobile_number">Mobile Number</Label>
                  <Input
                    id="mobile_number"
                    {...register('mobile_number')}
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="landline_number">Landline Number</Label>
                <Input
                  id="landline_number"
                  {...register('landline_number')}
                  placeholder="Enter landline number"
                  disabled={sameAsMobile}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="same_as_mobile"
                    checked={sameAsMobile}
                    onCheckedChange={(checked) => setSameAsMobile(checked === true)}
                  />
                  <label
                    htmlFor="same_as_mobile"
                    className="text-sm text-muted-foreground"
                  >
                    Same as mobile
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone Type</Label>
                <Select
                  onValueChange={(value) => setValue('phone_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select phone type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PHONE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
