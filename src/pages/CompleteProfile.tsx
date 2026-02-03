import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CompleteProfile() {
  const { user, crmUser } = useAuth();
  const navigate = useNavigate();
  
  // Auto-fill from user metadata if available
  const defaultFullName = user?.user_metadata?.full_name || user?.user_metadata?.name || crmUser?.full_name || '';
  
  const [fullName, setFullName] = useState(defaultFullName);
  const [regionFocus, setRegionFocus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email is read-only, always from current user
  const email = user?.email || crmUser?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Full Name is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!email) {
      toast({
        title: 'Validation Error',
        description: 'Email is required. Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.rpc('fn_crm_user_upsert_self', {
        p_full_name: fullName.trim(),
        p_email: email,
        p_role: 'Broker', // Hardcoded - users cannot choose their role
        p_region_focus: regionFocus.trim() || null,
        p_active: true,
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Profile saved',
        description: 'Your profile has been saved successfully.',
      });

      navigate('/');
    } catch (err) {
      console.error('Error saving profile:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save profile.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Please fill in your details to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="regionFocus">Region Focus (optional)</Label>
              <Input
                id="regionFocus"
                value={regionFocus}
                onChange={(e) => setRegionFocus(e.target.value)}
                placeholder="e.g., EMEA, APAC, Americas"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
