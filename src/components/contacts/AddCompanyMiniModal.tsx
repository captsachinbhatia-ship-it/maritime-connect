import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createCompany, checkDuplicateCompanyName } from '@/services/companies';

const COMPANY_TYPE_DB_VALUES = [
  { label: 'Ship Owner', value: 'Owner' },
  { label: 'Charterer', value: 'Charterer' },
  { label: 'Broker', value: 'Broker' },
  { label: 'Other', value: 'Other' },
];

const companySchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  company_type: z.string().optional(),
  company_type_other_text: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
}).refine(
  (data) => data.company_type !== 'Other' || (data.company_type_other_text && data.company_type_other_text.trim().length > 0),
  { message: 'Please describe the company type', path: ['company_type_other_text'] }
);

type CompanyFormData = z.infer<typeof companySchema>;

interface AddCompanyMiniModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  onSuccess: (company: { id: string; company_name: string }) => void;
}

export function AddCompanyMiniModal({
  open,
  onOpenChange,
  initialName,
  onSuccess,
}: AddCompanyMiniModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: initialName,
      company_type: '',
      company_type_other_text: '',
      country: '',
      city: '',
      region: '',
    },
  });

  const watchedCompanyType = watch('company_type');
  const watchedCompanyTypeOther = watch('company_type_other_text');
  
  // Disable button if Other is selected but describe type is empty
  const isOtherInvalid = watchedCompanyType === 'Other' && (!watchedCompanyTypeOther || !watchedCompanyTypeOther.trim());

  // Update form when initialName changes
  useState(() => {
    if (initialName) {
      setValue('company_name', initialName);
    }
  });

  const onSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Check for duplicate
      const duplicateCheck = await checkDuplicateCompanyName(data.company_name);

      if (duplicateCheck.error) {
        setSubmitError(duplicateCheck.error);
        setIsSubmitting(false);
        return;
      }

      if (duplicateCheck.isDuplicate) {
        setSubmitError(`Company "${duplicateCheck.matchedCompanyName}" already exists.`);
        setIsSubmitting(false);
        return;
      }

      // Create company
      const result = await createCompany({
        company_name: data.company_name,
        company_type: data.company_type || 'Other',
        company_type_other_text: data.company_type === 'Other' ? data.company_type_other_text : null,
        country: data.country || null,
        city: data.city || null,
        region: data.region || null,
      });

      if (result.error) {
        // Handle DB constraint error with friendly message
        if (result.error.includes('companies_company_type_other_text_check')) {
          setSubmitError("Please describe the company type when 'Other' is selected.");
          setIsSubmitting(false);
          return;
        }
        setSubmitError(result.error);
        setIsSubmitting(false);
        return;
      }

      if (result.data) {
        reset();
        onSuccess({ id: result.data.id, company_name: result.data.company_name || '' });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
      setSubmitError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogDescription>
            Quickly add a company to continue with contact creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              {...register('company_name')}
              placeholder="Enter company name"
            />
            {errors.company_name && (
              <p className="text-sm text-destructive">{errors.company_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select onValueChange={(value) => {
              setValue('company_type', value);
              if (value !== 'Other') {
                setValue('company_type_other_text', '');
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_TYPE_DB_VALUES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {watchedCompanyType === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="company_type_other_text">Describe Type *</Label>
              <Input
                id="company_type_other_text"
                {...register('company_type_other_text')}
                placeholder="Describe company type"
              />
              {errors.company_type_other_text && (
                <p className="text-sm text-destructive">{errors.company_type_other_text.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...register('country')}
                placeholder="Country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="City"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input
              id="region"
              {...register('region')}
              placeholder="Region"
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
            <Button type="submit" disabled={isSubmitting || isOtherInvalid}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Company
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
