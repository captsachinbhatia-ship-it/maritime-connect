 import { useState } from 'react';
 import { Loader2, AlertTriangle } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import {
   AlertDialog,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from '@/components/ui/alert-dialog';
 import { supabase } from '@/lib/supabaseClient';
 import { useToast } from '@/hooks/use-toast';
 import { ContactWithCompany } from '@/types';
 
 interface DeleteContactDialogProps {
   contact: ContactWithCompany | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSuccess: () => void;
 }
 
 export function DeleteContactDialog({
   contact,
   open,
   onOpenChange,
   onSuccess,
 }: DeleteContactDialogProps) {
   const [isDeleting, setIsDeleting] = useState(false);
   const { toast } = useToast();
 
   const handleDelete = async () => {
     if (!contact) return;
 
     setIsDeleting(true);
 
     try {
       // Soft delete by setting is_active to false
       const { error } = await supabase
         .from('contacts')
         .update({ is_active: false })
         .eq('id', contact.id);
 
       if (error) {
         toast({
           title: 'Delete failed',
           description: error.message,
           variant: 'destructive',
         });
         setIsDeleting(false);
         return;
       }
 
       toast({
         title: 'Contact deleted',
         description: 'The contact has been deactivated.',
       });
 
       onSuccess();
       onOpenChange(false);
     } catch (err) {
       toast({
         title: 'Delete failed',
         description: err instanceof Error ? err.message : 'An unexpected error occurred',
         variant: 'destructive',
       });
     } finally {
       setIsDeleting(false);
     }
   };
 
   return (
     <AlertDialog open={open} onOpenChange={onOpenChange}>
       <AlertDialogContent>
         <AlertDialogHeader>
           <AlertDialogTitle className="flex items-center gap-2">
             <AlertTriangle className="h-5 w-5 text-destructive" />
             Delete Contact
           </AlertDialogTitle>
           <AlertDialogDescription>
             Are you sure you want to delete <strong>{contact?.full_name || 'this contact'}</strong>?
             This will deactivate the contact and remove them from active lists.
             This action cannot be easily undone.
           </AlertDialogDescription>
         </AlertDialogHeader>
         <AlertDialogFooter>
           <Button
             variant="outline"
             onClick={() => onOpenChange(false)}
             disabled={isDeleting}
           >
             Cancel
           </Button>
           <Button
             variant="destructive"
             onClick={handleDelete}
             disabled={isDeleting}
           >
             {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             Delete Contact
           </Button>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
   );
 }