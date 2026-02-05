import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { checkDuplicateCompanyName, createCompany } from '@/services/companies';
import { useToast } from '@/hooks/use-toast';

const COMPANY_TYPE_DB_VALUES = [
  { label: 'Ship Owner', value: 'Owner' },
  { label: 'Charterer', value: 'Charterer' },
  { label: 'Broker', value: 'Broker' },
  { label: 'Other', value: 'Other' },
];

const STATUS_OPTIONS = [
  'Active',
  'Inactive',
  'Prospect',
  'Lead',
  'Partner',
];

const companySchema = z.object({
  company_name: z.string().trim().min(1, 'Company name is required').max(255),
  company_type: z.string().min(1, 'Company type is required'),
  company_type_other_text: z.string().max(100).optional().or(z.literal('')),
  board_line: z.string().max(50).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  region: z.string().max(100).optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  email_general: z.string().email('Invalid email').optional().or(z.literal('')),
  phone_general: z.string().max(50).optional().or(z.literal('')),
  status: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  is_active: z.boolean(),
}).refine(
  (data) => data.company_type !== 'Other' || (data.company_type_other_text && data.company_type_other_text.trim().length > 0),
  { message: 'Please describe the company type', path: ['company_type_other_text'] }
);

type CompanyFormValues = z.infer<typeof companySchema>;

interface AddCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  companyTypes: string[];
  statuses: string[];
  regions: string[];
}

export function AddCompanyModal({
  open,
  onOpenChange,
  onSuccess,
  statuses,
}: AddCompanyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const { toast } = useToast();

  const allStatuses = [...new Set([...STATUS_OPTIONS, ...statuses])].sort();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: '',
      company_type: '',
      company_type_other_text: '',
      board_line: '',
      country: '',
      city: '',
      region: '',
      website: '',
      email_general: '',
      phone_general: '',
      status: '',
      notes: '',
      is_active: true,
    },
  });

  const watchedCompanyType = form.watch('company_type');

  const handleSubmit = async (values: CompanyFormValues) => {
    setIsSubmitting(true);
    setDuplicateError(null);

    try {
      // Check for duplicate
      const duplicateCheck = await checkDuplicateCompanyName(values.company_name);
      
      if (duplicateCheck.error) {
        toast({
          title: 'Error',
          description: duplicateCheck.error,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      if (duplicateCheck.isDuplicate) {
        setDuplicateError(`Company already exists: "${duplicateCheck.matchedCompanyName}"`);
        setIsSubmitting(false);
        return;
      }

      // Create company
      const result = await createCompany({
        company_name: values.company_name,
        company_type: values.company_type,
        company_type_other_text: values.company_type === 'Other' ? values.company_type_other_text : null,
        board_line: values.board_line || null,
        country: values.country || null,
        city: values.city || null,
        region: values.region || null,
        website: values.website || null,
        email_general: values.email_general || null,
        phone_general: values.phone_general || null,
        status: values.status || null,
        notes: values.notes || null,
        is_active: values.is_active,
      });

      if (result.error) {
        toast({
          title: 'Error creating company',
          description: result.error,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'Company created',
        description: `${values.company_name} has been added successfully.`,
      });

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setDuplicateError(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogDescription>
            Create a new company record. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        {duplicateError && (
          <Alert variant="destructive">
            <AlertDescription>{duplicateError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_type"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Type *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        // Clear other text when not Other
                        if (value !== 'Other') {
                          form.setValue('company_type_other_text', '');
                        }
                      }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          {COMPANY_TYPE_DB_VALUES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedCompanyType === 'Other' && (
                <FormField
                  control={form.control}
                  name="company_type_other_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Describe Type *</FormLabel>
                      <FormControl>
                        <Input placeholder="Describe company type" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter city" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter region" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="board_line"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Board Line</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 234 567 890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email_general"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>General Email</FormLabel>
                    <FormControl>
                      <Input placeholder="info@company.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_general"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>General Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 234 567 890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the company..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Company
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
