 import { useState, useEffect } from 'react';
 import { useForm } from 'react-hook-form';
 import { zodResolver } from '@hookform/resolvers/zod';
 import { z } from 'zod';
 import { Loader2, AlertCircle } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Textarea } from '@/components/ui/textarea';
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
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 import { ContactWithCompany } from '@/types';
 import { supabase } from '@/lib/supabaseClient';
 import { useToast } from '@/hooks/use-toast';
 
 const PREFERRED_CHANNELS = ['Email', 'Phone', 'WhatsApp', 'ICE', 'LinkedIn'];
 
 const contactSchema = z.object({
   full_name: z.string().min(1, 'Full name is required').max(100),
   designation: z.string().max(100).optional().or(z.literal('')),
   email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
   ice_handle: z.string().max(100).optional().or(z.literal('')),
   preferred_channel: z.string().optional().or(z.literal('')),
   notes: z.string().max(1000).optional().or(z.literal('')),
 });
 
 type ContactFormData = z.infer<typeof contactSchema>;
 
 interface EditContactModalProps {
   contact: ContactWithCompany | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSuccess: () => void;
 }
 
 export function EditContactModal({
   contact,
   open,
   onOpenChange,
   onSuccess,
 }: EditContactModalProps) {
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [submitError, setSubmitError] = useState<string | null>(null);
   const { toast } = useToast();
 
   const form = useForm<ContactFormData>({
     resolver: zodResolver(contactSchema),
     defaultValues: {
       full_name: '',
       designation: '',
       email: '',
       ice_handle: '',
       preferred_channel: '',
       notes: '',
     },
   });
 
   // Populate form when contact changes
   useEffect(() => {
     if (contact && open) {
       form.reset({
         full_name: contact.full_name || '',
         designation: contact.designation || '',
         email: contact.email || '',
         ice_handle: contact.ice_handle || '',
         preferred_channel: contact.preferred_channel || '',
         notes: contact.notes || '',
       });
     }
   }, [contact, open, form]);
 
  const handleSubmit = async (data: ContactFormData) => {
    if (!contact) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { data: returnedId, error: rpcError } = await supabase.rpc('update_contact_safe', {
        p_contact_id: contact.id,
        p_full_name: data.full_name || null,
        p_company_name: null,
        p_designation: data.designation || null,
        p_email: data.email || null,
        p_country_code: null,
        p_phone: null,
        p_phone_type: null,
        p_ice_handle: data.ice_handle || null,
        p_preferred_channel: data.preferred_channel || null,
        p_notes: data.notes || null,
      });

      if (rpcError) {
        setSubmitError(rpcError.message);
        toast({ title: 'Update failed', description: rpcError.message, variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      console.log('[EditContact] RPC update_contact_safe returned:', returnedId);

      toast({
        title: 'Contact updated',
        description: 'The contact has been updated successfully.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
 
   const handleClose = (isOpen: boolean) => {
     if (!isOpen) {
       form.reset();
       setSubmitError(null);
     }
     onOpenChange(isOpen);
   };
 
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>Edit Contact</DialogTitle>
           <DialogDescription>
             Update contact information. Required fields are marked with *.
           </DialogDescription>
         </DialogHeader>
 
         {submitError && (
           <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertDescription>{submitError}</AlertDescription>
           </Alert>
         )}
 
         <Form {...form}>
           <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
             <FormField
               control={form.control}
               name="full_name"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Full Name *</FormLabel>
                   <FormControl>
                     <Input placeholder="Enter full name" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             <FormField
               control={form.control}
               name="designation"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Designation</FormLabel>
                   <FormControl>
                     <Input placeholder="e.g., Fleet Manager" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             <FormField
               control={form.control}
               name="email"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Email</FormLabel>
                   <FormControl>
                     <Input type="email" placeholder="email@example.com" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             <FormField
               control={form.control}
               name="ice_handle"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>ICE Handle</FormLabel>
                   <FormControl>
                     <Input placeholder="ICE messenger handle" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             <FormField
               control={form.control}
               name="preferred_channel"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Preferred Channel</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                     <FormControl>
                       <SelectTrigger>
                         <SelectValue placeholder="Select channel" />
                       </SelectTrigger>
                     </FormControl>
                     <SelectContent>
                       {PREFERRED_CHANNELS.map((channel) => (
                         <SelectItem key={channel} value={channel}>
                           {channel}
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
               name="notes"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Notes</FormLabel>
                   <FormControl>
                     <Textarea
                       placeholder="Additional notes..."
                       className="min-h-[80px]"
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
                 Save Changes
               </Button>
             </DialogFooter>
           </form>
         </Form>
       </DialogContent>
     </Dialog>
   );
 }