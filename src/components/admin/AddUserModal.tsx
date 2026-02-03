import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createCrmUserViaEdgeFunction, CRM_ROLES } from '@/services/users';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export function AddUserModal({ open, onOpenChange, onUserCreated }: AddUserModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    region_focus: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // PART 4: Block UI if session is missing
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in as Admin to create users.',
        variant: 'destructive',
      });
      console.error('Session missing: supabase.auth.getUser() returned null');
      return;
    }

    if (!formData.full_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Full Name is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Email is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.role) {
      toast({
        title: 'Validation Error',
        description: 'Please select a role.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await createCrmUserViaEdgeFunction({
      full_name: formData.full_name.trim(),
      email: formData.email.trim(),
      role: formData.role,
      region_focus: formData.region_focus.trim() || undefined,
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Edge Function error:', error);
      toast({
        title: 'Failed to Create User',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    console.log('User created successfully:', data);

    // Show mode-specific success message
    const mode = (data as any)?.mode;
    let successMessage = 'User created successfully';
    if (mode === 'invited') {
      successMessage = 'User invited successfully';
    } else if (mode === 'created') {
      successMessage = 'User created successfully';
    } else if (mode === 'linked_existing_auth_user') {
      successMessage = 'Existing Auth user linked into CRM successfully';
    }

    toast({
      title: 'Success',
      description: successMessage,
    });

    setFormData({ full_name: '', email: '', role: '', region_focus: '' });
    onUserCreated();
    onOpenChange(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setFormData({ full_name: '', email: '', role: '', region_focus: '' });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Send an invitation to a new CRM user. They will receive an email to set up their account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {CRM_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region_focus">Region Focus</Label>
              <Input
                id="region_focus"
                value={formData.region_focus}
                onChange={(e) => setFormData({ ...formData, region_focus: e.target.value })}
                placeholder="e.g., Asia Pacific, Europe"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending Invite...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
