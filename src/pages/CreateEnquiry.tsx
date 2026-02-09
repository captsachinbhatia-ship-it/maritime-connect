import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Anchor, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { useAuth } from '@/contexts/AuthContext';

type EnquiryMode = 'CARGO' | 'VESSEL';

export default function CreateEnquiry() {
  const navigate = useNavigate();
  const { crmUser, isPreviewMode } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [crmUserId, setCrmUserId] = useState<string | null>(null);

  // Contacts for dropdown
  const [contacts, setContacts] = useState<{ id: string; full_name: string; company_id: string | null }[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  // Form fields
  const [mode, setMode] = useState<EnquiryMode>('CARGO');
  const [enquiryType, setEnquiryType] = useState('BROKERAGE');
  const [subject, setSubject] = useState('');
  const [contactId, setContactId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');

  // Cargo fields
  const [cargoType, setCargoType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('MT');
  const [loadingPort, setLoadingPort] = useState('');
  const [dischargePort, setDischargePort] = useState('');
  const [laycanFrom, setLaycanFrom] = useState('');
  const [laycanTo, setLaycanTo] = useState('');

  // Vessel fields
  const [vesselType, setVesselType] = useState('');
  const [vesselName, setVesselName] = useState('');

  // Commercial
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [winProbability, setWinProbability] = useState('');
  const [expectedClose, setExpectedClose] = useState('');

  // Source
  const [receivedVia, setReceivedVia] = useState('');
  const [sourceDetails, setSourceDetails] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isPreviewMode) {
      setCrmUserId(crmUser?.id || null);
    } else {
      getCurrentCrmUserId().then(r => setCrmUserId(r.data));
    }
  }, [isPreviewMode, crmUser]);

  useEffect(() => {
    supabase
      .from('contacts')
      .select('id, full_name, company_id')
      .order('full_name')
      .limit(500)
      .then(({ data }) => setContacts(data || []));
  }, []);

  // Auto-fill company when contact selected
  useEffect(() => {
    if (contactId) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact?.company_id) setCompanyId(contact.company_id);
    }
  }, [contactId, contacts]);

  const filteredContacts = contactSearch
    ? contacts.filter(c => c.full_name?.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast({ title: 'Subject is required', variant: 'destructive' });
      return;
    }
    if (!contactId) {
      toast({ title: 'Contact is required', variant: 'destructive' });
      return;
    }
    if (!crmUserId) {
      toast({ title: 'Could not identify current user', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      // Build insert payload
      const payload: Record<string, unknown> = {
        subject: subject.trim(),
        contact_id: contactId,
        company_id: companyId || null,
        enquiry_type: enquiryType,
        priority,
        description: description.trim() || null,
        status: 'RECEIVED',
        created_by: crmUserId,
        assigned_to: crmUserId,
        assigned_at: new Date().toISOString(),
        cargo_type: cargoType || null,
        quantity: quantity ? parseFloat(quantity) : null,
        quantity_unit: quantityUnit || null,
        loading_port: loadingPort || null,
        discharge_port: dischargePort || null,
        laycan_from: laycanFrom || null,
        laycan_to: laycanTo || null,
        vessel_type: vesselType || null,
        vessel_name: vesselName || null,
        budget_min: budgetMin ? parseFloat(budgetMin) : null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        currency: currency || 'USD',
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
        win_probability: winProbability ? parseInt(winProbability) : null,
        expected_close_date: expectedClose || null,
        received_via: receivedVia || null,
        source_details: sourceDetails || null,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        notes: notes.trim() || null,
      };

      // Try writing enquiry_mode if column exists
      try {
        payload.enquiry_mode = mode;
      } catch {
        // Column may not exist
      }

      const { data, error } = await supabase
        .from('enquiries')
        .insert(payload)
        .select('id, enquiry_number')
        .single();

      if (error) {
        if (error.message.includes('row-level security')) {
          toast({ title: 'Not permitted by access policy.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        setSubmitting(false);
        return;
      }

      toast({ title: 'Enquiry Created', description: `${data.enquiry_number} created successfully.` });
      navigate(`/enquiries/${data.id}`);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/enquiries')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Enquiry</h1>
          <p className="text-muted-foreground text-sm">Create a cargo enquiry or open vessel enquiry</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mode Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enquiry Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={mode === 'CARGO' ? 'default' : 'outline'}
                className="flex-1 h-16 gap-3"
                onClick={() => setMode('CARGO')}
              >
                <Package className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Cargo Enquiry</div>
                  <div className="text-xs opacity-80">Need vessel for cargo</div>
                </div>
              </Button>
              <Button
                type="button"
                variant={mode === 'VESSEL' ? 'default' : 'outline'}
                className="flex-1 h-16 gap-3"
                onClick={() => setMode('VESSEL')}
              >
                <Anchor className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Open Vessel</div>
                  <div className="text-xs opacity-80">Need cargo for vessel</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Core Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Core Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g., 30K MT Naphtha MEG-Japan"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact <span className="text-destructive">*</span></Label>
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger><SelectValue placeholder="Select contact..." /></SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Search contacts..."
                        value={contactSearch}
                        onChange={e => setContactSearch(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {filteredContacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Enquiry Type</Label>
                <Select value={enquiryType} onValueChange={setEnquiryType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BROKERAGE">Brokerage</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority <span className="text-destructive">*</span></Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Additional details..."
                rows={3}
                maxLength={2000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cargo Section - shown when mode=CARGO */}
        {mode === 'CARGO' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Cargo Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo Grade / Type</Label>
                  <Input value={cargoType} onChange={e => setCargoType(e.target.value)} placeholder="e.g., Naphtha, Crude" />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="30000" className="flex-1" />
                    <Select value={quantityUnit} onValueChange={setQuantityUnit}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MT">MT</SelectItem>
                        <SelectItem value="BBL">BBL</SelectItem>
                        <SelectItem value="CBM">CBM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loading Port</Label>
                  <Input value={loadingPort} onChange={e => setLoadingPort(e.target.value)} placeholder="e.g., Ras Tanura" />
                </div>
                <div className="space-y-2">
                  <Label>Discharge Port</Label>
                  <Input value={dischargePort} onChange={e => setDischargePort(e.target.value)} placeholder="e.g., Chiba" />
                </div>
                <div className="space-y-2">
                  <Label>Laycan From</Label>
                  <Input type="date" value={laycanFrom} onChange={e => setLaycanFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Laycan To</Label>
                  <Input type="date" value={laycanTo} onChange={e => setLaycanTo(e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Vessel Type Required</Label>
                <Input value={vesselType} onChange={e => setVesselType(e.target.value)} placeholder="e.g., MR, LR1, VLCC" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vessel Section - shown when mode=VESSEL */}
        {mode === 'VESSEL' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Anchor className="h-4 w-4" />
                Vessel Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vessel Name</Label>
                  <Input value={vesselName} onChange={e => setVesselName(e.target.value)} placeholder="e.g., MT Pacific Star" />
                </div>
                <div className="space-y-2">
                  <Label>Vessel Type</Label>
                  <Input value={vesselType} onChange={e => setVesselType(e.target.value)} placeholder="e.g., MR, LR1, Aframax" />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Open Area</Label>
                  <Input value={loadingPort} onChange={e => setLoadingPort(e.target.value)} placeholder="e.g., AG, WC India" />
                </div>
                <div className="space-y-2">
                  <Label>Open Date From</Label>
                  <Input type="date" value={laycanFrom} onChange={e => setLaycanFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Open Date To</Label>
                  <Input type="date" value={laycanTo} onChange={e => setLaycanTo(e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Cargo Sought</Label>
                <Input value={cargoType} onChange={e => setCargoType(e.target.value)} placeholder="e.g., CPP, DPP, Clean" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commercial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Budget Min</Label>
                <Input type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Budget Max</Label>
                <Input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Estimated Value</Label>
                <Input type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Win Probability (%)</Label>
                <Input type="number" min="0" max="100" value={winProbability} onChange={e => setWinProbability(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Expected Close</Label>
                <Input type="date" value={expectedClose} onChange={e => setExpectedClose(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Received Via</Label>
                <Select value={receivedVia} onValueChange={setReceivedVia}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="PHONE">Phone</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="BROKER">Broker</SelectItem>
                    <SelectItem value="DIRECT">Direct</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source Details</Label>
                <Input value={sourceDetails} onChange={e => setSourceDetails(e.target.value)} placeholder="e.g., Broker X referral" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g., urgent, spot, MEG" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={2000} />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/enquiries')}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="min-w-[160px]">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Enquiry
          </Button>
        </div>
      </form>
    </div>
  );
}
