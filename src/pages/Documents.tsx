import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Loader2, Plus, Search, ExternalLink, Pencil, Trash2, FolderOpen,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { fetchDocuments, createDocument, softDeleteDocument, CrmDocument } from '@/services/documents';
import { getCurrentCrmUserId } from '@/services/profiles';
import { supabase } from '@/lib/supabaseClient';

// ─── Constants ──────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'TRIP_REPORT', label: 'Trip Report' },
  { value: 'PORT_CIRCULAR', label: 'Port Circular' },
  { value: 'PDA', label: 'PDA / Port Costs' },
  { value: 'MARKET_INTELLIGENCE', label: 'Market Intelligence' },
  { value: 'IMPORTANT_EMAIL', label: 'Important Email' },
  { value: 'GENERAL_REFERENCE', label: 'General Reference' },
  { value: 'ENQUIRY_ATTACHMENT', label: 'Enquiry Attachment' },
];

const CATEGORY_COLORS: Record<string, string> = {
  TRIP_REPORT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  PORT_CIRCULAR: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  PDA: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  MARKET_INTELLIGENCE: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  IMPORTANT_EMAIL: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  GENERAL_REFERENCE: 'bg-muted text-muted-foreground',
  ENQUIRY_ATTACHMENT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
};

import { VESSEL_SIZE_OPTIONS } from '@/lib/vesselSizes';
const SOURCE_OPTIONS = ['Email', 'Meeting', 'Broker Note', 'Other'];

function getCategoryLabel(val: string) {
  return CATEGORIES.find(c => c.value === val)?.label ?? val;
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function Documents() {
  const [docs, setDocs] = useState<CrmDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [crmUserId, setCrmUserId] = useState<string | null>(null);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterPort, setFilterPort] = useState('');
  const [filterTags, setFilterTags] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => { getCurrentCrmUserId().then(r => setCrmUserId(r.data)); }, []);

  const loadDocs = async () => {
    setLoading(true);
    const result = await fetchDocuments();
    setDocs(result.data || []);
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, []);

  const filtered = useMemo(() => {
    let list = docs;
    if (filterCategory) list = list.filter(d => d.category === filterCategory);
    if (filterProduct) list = list.filter(d => d.product?.toLowerCase().includes(filterProduct.toLowerCase()));
    if (filterPort) {
      const p = filterPort.toLowerCase();
      list = list.filter(d =>
        d.load_area?.toLowerCase().includes(p) || d.discharge_area?.toLowerCase().includes(p)
      );
    }
    if (filterTags) {
      const t = filterTags.toLowerCase();
      list = list.filter(d => (d.tags || []).some(tag => tag.toLowerCase().includes(t)));
    }
    if (filterDateFrom) list = list.filter(d => d.created_at >= filterDateFrom);
    if (filterDateTo) list = list.filter(d => d.created_at <= filterDateTo + 'T23:59:59');
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(d =>
        d.title.toLowerCase().includes(s) || d.description?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [docs, search, filterCategory, filterProduct, filterPort, filterTags, filterDateFrom, filterDateTo]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await softDeleteDocument(deleteId);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Document deleted' });
      loadDocs();
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-6 w-6" />
        <h1 className="text-2xl font-bold text-foreground">Documents & Intelligence</h1>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setAddDocOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Document
        </Button>
        <Button onClick={() => setIntelOpen(true)} variant="secondary">
          <Brain className="h-4 w-4 mr-1" /> Save Intelligence
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title or description..."
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterCategory} onValueChange={v => setFilterCategory(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={filterProduct} onChange={e => setFilterProduct(e.target.value)} placeholder="Product" className="w-32" />
        <Input value={filterPort} onChange={e => setFilterPort(e.target.value)} placeholder="Port" className="w-32" />
        <Input value={filterTags} onChange={e => setFilterTags(e.target.value)} placeholder="Tags" className="w-32" />
        <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-36" />
        <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-36" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No documents found.</div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Linked ENQ</TableHead>
                <TableHead>Linked Company</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Drive</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{doc.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={CATEGORY_COLORS[doc.category] || ''}>
                      {getCategoryLabel(doc.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(doc.tags || []).map((t, i) => (
                        <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {doc.related_enquiry ? (
                      <a href={`/enquiries/${doc.related_enquiry_id}`} className="text-primary hover:underline">
                        {(doc.related_enquiry as any)?.enquiry_number}
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{(doc.related_company as any)?.company_name || '—'}</TableCell>
                  <TableCell className="text-xs">{(doc.uploaded_by_user as any)?.full_name || '—'}</TableCell>
                  <TableCell className="text-xs">{format(new Date(doc.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    {doc.drive_url ? (
                      <a href={doc.drive_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(doc.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Document Modal */}
      <AddDocumentModal open={addDocOpen} onClose={() => setAddDocOpen(false)} crmUserId={crmUserId} onSuccess={loadDocs} />

      {/* Save Intelligence Modal */}
      <SaveIntelligenceModal open={intelOpen} onClose={() => setIntelOpen(false)} crmUserId={crmUserId} onSuccess={loadDocs} />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>This will archive the document. It can be restored later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ADD DOCUMENT MODAL
// ═══════════════════════════════════════════════════════════════════
function AddDocumentModal({ open, onClose, crmUserId, onSuccess }: {
  open: boolean; onClose: () => void; crmUserId: string | null; onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const clear = () => { setTitle(''); setCategory(''); setDescription(''); setDriveUrl(''); setTagsStr(''); };

  const handleSubmit = async () => {
    if (!title.trim() || !category) {
      toast({ title: 'Title and Category are required', variant: 'destructive' });
      return;
    }
    if (!crmUserId) {
      toast({ title: 'User not linked', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const result = await createDocument({
      title: title.trim(),
      category,
      description: description.trim() || null,
      drive_url: driveUrl.trim() || null,
      tags,
      uploaded_by: crmUserId,
    });
    setSubmitting(false);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Document saved' });
      clear();
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { clear(); onClose(); } }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
          <DialogDescription>Save a reference document with an optional Google Drive link.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional description" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Google Drive Link</Label>
            <Input type="url" value={driveUrl} onChange={e => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tags (comma-separated)</Label>
            <Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="tanker, MR, AG-East" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { clear(); onClose(); }}>Cancel</Button>
          <Button disabled={submitting} onClick={handleSubmit}>
            {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Save Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SAVE INTELLIGENCE MODAL
// ═══════════════════════════════════════════════════════════════════
function SaveIntelligenceModal({ open, onClose, crmUserId, onSuccess }: {
  open: boolean; onClose: () => void; crmUserId: string | null; onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [product, setProduct] = useState('');
  const [loadArea, setLoadArea] = useState('');
  const [dischargeArea, setDischargeArea] = useState('');
  const [vesselSize, setVesselSize] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [notes, setNotes] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const clear = () => {
    setTitle(''); setProduct(''); setLoadArea(''); setDischargeArea('');
    setVesselSize(''); setSourceType(''); setNotes(''); setDriveUrl(''); setTagsStr('');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !product.trim()) {
      toast({ title: 'Title and Product are required', variant: 'destructive' });
      return;
    }
    if (!crmUserId) {
      toast({ title: 'User not linked', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const result = await createDocument({
      title: title.trim(),
      category: 'MARKET_INTELLIGENCE',
      description: notes.trim() || null,
      drive_url: driveUrl.trim() || null,
      tags,
      product: product.trim(),
      load_area: loadArea.trim() || null,
      discharge_area: dischargeArea.trim() || null,
      vessel_size: vesselSize && vesselSize !== 'NONE' ? vesselSize : null,
      source_type: sourceType && sourceType !== 'NONE' ? sourceType : null,
      intel_notes: notes.trim() || null,
      uploaded_by: crmUserId,
    });
    setSubmitting(false);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Intelligence saved' });
      clear();
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { clear(); onClose(); } }}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save Market Intelligence</DialogTitle>
          <DialogDescription>Record market intelligence for future reference.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. AG-East MR rates firming" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Product <span className="text-destructive">*</span></Label>
            <Input value={product} onChange={e => setProduct(e.target.value)} placeholder="Jet A1, Naphtha, ULSD, CPP, Crude" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Load Area</Label>
              <Input value={loadArea} onChange={e => setLoadArea(e.target.value)} placeholder="AG, MEG, SEA" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Discharge Area</Label>
              <Input value={dischargeArea} onChange={e => setDischargeArea(e.target.value)} placeholder="East, West, Med" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Vessel Size</Label>
              <Select value={vesselSize} onValueChange={setVesselSize}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {VESSEL_SIZE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {SOURCE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes / Summary</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Market observations, rate indications, etc." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Google Drive Link</Label>
            <Input type="url" value={driveUrl} onChange={e => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tags (comma-separated)</Label>
            <Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="rate, market, AG" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { clear(); onClose(); }}>Cancel</Button>
          <Button disabled={submitting} onClick={handleSubmit}>
            {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Save Intelligence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
