import { Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface ContactQuickActionsProps {
  firstName: string | null;
  phone: string | null;
  email: string | null;
  phoneVisible: boolean;
  emailVisible: boolean;
}

export function ContactQuickActions({
  firstName,
  phone,
  email,
  phoneVisible,
  emailVisible,
}: ContactQuickActionsProps) {
  const name = firstName?.split(' ')[0] || '';

  const handleWhatsApp = () => {
    if (!phone) return;
    const rawPhone = phone.replace(/[^0-9+]/g, '');
    const prefilled = encodeURIComponent(`Hi ${name}, following up from AQ Maritime.`);
    try {
      window.open(`https://wa.me/${rawPhone}?text=${prefilled}`, '_blank');
    } catch {
      toast({ title: 'Unable to open WhatsApp', description: 'Please try again.' });
    }
  };

  const handleEmail = () => {
    if (!email) return;
    const subject = encodeURIComponent('Follow-up | AQ Maritime');
    const body = encodeURIComponent(`Hi ${name},\n\nFollowing up from AQ Maritime.\n`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    toast({
      title: 'Email client opened',
      description: 'Action opened. Logging will be enabled once backend is ready.',
    });
  };

  return (
    <div className="flex gap-1">
      {phoneVisible && phone && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleWhatsApp} title="WhatsApp">
          <Phone className="h-3.5 w-3.5 text-emerald-600" />
        </Button>
      )}
      {emailVisible && email && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEmail} title="Email">
          <Mail className="h-3.5 w-3.5 text-primary" />
        </Button>
      )}
    </div>
  );
}
