import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { createEnquiryQuote, QuoteStatus } from '@/services/enquiries';
import { getCurrentCrmUserId } from '@/services/profiles';

interface CreateQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiryId: string;
  contactId?: string | null;
  onSuccess?: (enquiryId: string) => void;
  allowDraft?: boolean;
}

export function CreateQuoteModal({
  open,
  onOpenChange,
  enquiryId,
  contactId,
  onSuccess,
  allowDraft = false,
}: CreateQuoteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [status, setStatus] = useState<QuoteStatus>(allowDraft ? 'DRAFT' : 'SENT');
  const [sentVia, setSentVia] = useState('EMAIL');
  const [sentMessage, setSentMessage] = useState('');
  const [rate, setRate] = useState('');
  const [rateUnit, setRateUnit] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [additionalCharges, setAdditionalCharges] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [vesselName, setVesselName] = useState('');
  const [vesselImo, setVesselImo] = useState('');
  const [vesselDwt, setVesselDwt] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [laycanFrom, setLaycanFrom] = useState('');
  const [laycanTo, setLaycanTo] = useState('');
  const [specialConditions, setSpecialConditions] = useState('');
  const [terms, setTerms] = useState('');

  const resetForm = () => {
    setStatus(allowDraft ? 'DRAFT' : 'SENT');
    setSentVia('EMAIL');
    setSentMessage('');
    setRate('');
    setRateUnit('');
    setBaseAmount('');
    setAdditionalCharges('');
    setTotalAmount('');
    setCurrency('USD');
    setVesselName('');
    setVesselImo('');
    setVesselDwt('');
    setValidityDate('');
    setPaymentTerms('');
    setLaycanFrom('');
    setLaycanTo('');
    setSpecialConditions('');
    setTerms('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: crmUserId } = await getCurrentCrmUserId();
    if (!crmUserId) {
      toast({ title: 'Error', description: 'Could not identify user.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    const result = await createEnquiryQuote(
      {
        enquiry_id: enquiryId,
        status,
        rate: rate ? parseFloat(rate) : null,
        rate_unit: rateUnit || null,
        base_amount: baseAmount ? parseFloat(baseAmount) : null,
        additional_charges: additionalCharges ? parseFloat(additionalCharges) : null,
        total_amount: totalAmount ? parseFloat(totalAmount) : null,
        currency,
        vessel_name: vesselName || null,
        vessel_imo: vesselImo || null,
        vessel_dwt: vesselDwt ? parseFloat(vesselDwt) : null,
        validity_date: validityDate || null,
        payment_terms: paymentTerms || null,
        laycan_from: laycanFrom || null,
        laycan_to: laycanTo || null,
        special_conditions: specialConditions || null,
        terms: terms || null,
        sent_via: status === 'SENT' ? sentVia : null,
        sent_message: status === 'SENT' ? sentMessage : null,
      },
      crmUserId,
      contactId
    );

    setIsSubmitting(false);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }

    toast({
      title: status === 'SENT' ? 'Quote Sent' : 'Quote Draft Created',
      description: 'Quote has been saved successfully.',
    });

    resetForm();
    onOpenChange(false);
    onSuccess?.(enquiryId);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Offer / Quote</DialogTitle>
          <DialogDescription>Create and send a quote for this enquiry.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status */}
          {allowDraft && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as QuoteStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Send details */}
          {status === 'SENT' && (
            <>
              <div className="space-y-2">
                <Label>Sent Via *</Label>
                <Select value={sentVia} onValueChange={setSentVia}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="PHONE">Phone</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={sentMessage}
                  onChange={(e) => setSentMessage(e.target.value)}
                  placeholder="Message sent with the quote..."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Pricing */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium text-foreground">Pricing</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rate</Label>
                <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0.00" step="0.01" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rate Unit</Label>
                <Input value={rateUnit} onChange={(e) => setRateUnit(e.target.value)} placeholder="e.g., per MT" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Base Amount</Label>
                <Input type="number" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} placeholder="0.00" step="0.01" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Additional Charges</Label>
                <Input type="number" value={additionalCharges} onChange={(e) => setAdditionalCharges(e.target.value)} placeholder="0.00" step="0.01" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total Amount</Label>
                <Input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0.00" step="0.01" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Vessel (optional) */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium text-foreground">Vessel (optional)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Vessel Name</Label>
                <Input value={vesselName} onChange={(e) => setVesselName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">IMO</Label>
                <Input value={vesselImo} onChange={(e) => setVesselImo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">DWT</Label>
                <Input type="number" value={vesselDwt} onChange={(e) => setVesselDwt(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Terms (optional) */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium text-foreground">Terms (optional)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Validity Date</Label>
                <Input type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment Terms</Label>
                <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Laycan From</Label>
                <Input type="date" value={laycanFrom} onChange={(e) => setLaycanFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Laycan To</Label>
                <Input type="date" value={laycanTo} onChange={(e) => setLaycanTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Special Conditions</Label>
              <Textarea value={specialConditions} onChange={(e) => setSpecialConditions(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">General Terms</Label>
              <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status === 'SENT' ? 'Send Quote' : 'Save Draft'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
