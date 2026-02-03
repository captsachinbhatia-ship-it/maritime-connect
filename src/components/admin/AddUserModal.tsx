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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { createCrmUserViaEdgeFunction, CRM_ROLES, updateCrmUser } from '@/services/users';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

// Configurable allowed email domains
const ALLOWED_EMAIL_DOMAINS = ['aqmaritime.com'];

// Standard email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

interface ExistingUser {
  id: string;
  email: string;
  full_name: string;
  active: boolean;
}

export function AddUserModal({ open, onOpenChange, onUserCreated }: AddUserModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [existingInactiveUser, setExistingInactiveUser] = useState<ExistingUser | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    region_focus: '',
  });

  // Validate email format
  const validateEmailFormat = (email: string): { valid: boolean; error?: string } => {
    const trimmed = email.trim().toLowerCase();
    
    if (!trimmed) {
      return { valid: false, error: 'Email is required.' };
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      return { valid: false, error: 'Please enter a valid email address.' };
    }

    // Check domain
    const domain = trimmed.split('@')[1];
    if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
      return { valid: false, error: `Only @${ALLOWED_EMAIL_DOMAINS.join(', @')} emails allowed.` };
    }

    return { valid: true };
  };

  // Pre-check for existing user in crm_users
  const preCheckEmail = async (email: string): Promise<{ exists: boolean; user?: ExistingUser }> => {
    const normalizedEmail = email.trim().toLowerCase();
    console.log('[PreCheck] Checking for existing user with email:', normalizedEmail);

    const { data, error } = await supabase
      .from('crm_users')
      .select('id, email, full_name, active')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('[PreCheck] Query error:', error);
      return { exists: false };
    }

    if (data) {
      console.log('[PreCheck] Found existing user:', { id: data.id, active: data.active, full_name: data.full_name });
      return { exists: true, user: data as ExistingUser };
    }

    console.log('[PreCheck] No existing user found');
    return { exists: false };
  };

  // Handle reactivating an inactive user
  const handleReactivate = async () => {
    if (!existingInactiveUser) return;

    console.log('[Reactivate] Reactivating user:', existingInactiveUser.id);
    setIsReactivating(true);

    const { error } = await updateCrmUser(existingInactiveUser.id, { active: true });

    setIsReactivating(false);

    if (error) {
      console.error('[Reactivate] Error:', error);
      toast({
        title: 'Reactivation Failed',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    console.log('[Reactivate] Success');
    toast({
      title: 'Success',
      description: `${existingInactiveUser.full_name} has been reactivated.`,
    });

    resetForm();
    onUserCreated();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setExistingInactiveUser(null);
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in as Admin to create users.',
        variant: 'destructive',
      });
      console.error('[Submit] Session missing');
      return;
    }

    // Validate full name
    if (!formData.full_name.trim()) {
      setValidationError('Full Name is required.');
      return;
    }

    // Validate email format and domain
    const normalizedEmail = formData.email.trim().toLowerCase();
    const emailValidation = validateEmailFormat(normalizedEmail);
    if (!emailValidation.valid) {
      console.log('[Submit] Email validation failed:', emailValidation.error);
      setValidationError(emailValidation.error || 'Invalid email.');
      return;
    }

    // Validate role
    if (!formData.role) {
      setValidationError('Please select a role.');
      return;
    }

    console.log('[Submit] All client validations passed, running pre-check...');

    // Pre-check for existing user
    setIsSubmitting(true);
    const preCheck = await preCheckEmail(normalizedEmail);

    if (preCheck.exists && preCheck.user) {
      if (preCheck.user.active) {
        console.log('[Submit] Blocked: Active user already exists');
        setValidationError('User already exists.');
        setIsSubmitting(false);
        return;
      } else {
        console.log('[Submit] Found inactive user, offering reactivation');
        setExistingInactiveUser(preCheck.user);
        setIsSubmitting(false);
        return;
      }
    }

    console.log('[Submit] Pre-check passed, calling Edge Function...');

    // Call Edge Function
    const { data, error } = await createCrmUserViaEdgeFunction({
      full_name: formData.full_name.trim(),
      email: normalizedEmail,
      role: formData.role,
      region_focus: formData.region_focus.trim() || null,
    });

    setIsSubmitting(false);

    if (error) {
      console.error('[Submit] Edge Function error:', error);
      
      // Check for "already registered" type errors
      const errorLower = error.toLowerCase();
      if (errorLower.includes('already registered') || errorLower.includes('already exists')) {
        setValidationError('This email is already registered in Auth. Consider linking or reactivating in CRM.');
        return;
      }
      
      toast({
        title: 'Failed to Create User',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    console.log('[Submit] User created successfully:', data);

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

    resetForm();
    onUserCreated();
    onOpenChange(false);
  };

  const resetForm = () => {
    setFormData({ full_name: '', email: '', role: '', region_focus: '' });
    setValidationError(null);
    setExistingInactiveUser(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
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

        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {existingInactiveUser && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-2">
              <span>
                <strong>{existingInactiveUser.full_name}</strong> ({existingInactiveUser.email}) exists but is inactive.
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleReactivate}
                disabled={isReactivating}
                className="w-fit"
              >
                {isReactivating && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Reactivate Instead
              </Button>
            </AlertDescription>
          </Alert>
        )}

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
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setValidationError(null);
                  setExistingInactiveUser(null);
                }}
                placeholder="user@aqmaritime.com"
              />
              <p className="text-xs text-muted-foreground">
                Only @{ALLOWED_EMAIL_DOMAINS.join(', @')} emails allowed
              </p>
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
            <Button type="submit" disabled={isSubmitting || !!existingInactiveUser}>
              {isSubmitting ? 'Checking...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
