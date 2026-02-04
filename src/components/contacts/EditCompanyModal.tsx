import { useState, useEffect, useMemo } from 'react';
import { Loader2, Building2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getAllCompaniesForDropdown } from '@/services/contacts';
import { updateContactCompany } from '@/services/contacts';
import { AddCompanyMiniModal } from './AddCompanyMiniModal';

interface EditCompanyModalProps {
  contactId: string;
  contactName: string;
  currentCompanyId: string | null;
  currentCompanyName: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCompanyId: string, newCompanyName: string) => void;
}

interface CompanyOption {
  id: string;
  company_name: string;
}

export function EditCompanyModal({
  contactId,
  contactName,
  currentCompanyId,
  currentCompanyName,
  isOpen,
  onClose,
  onSuccess,
}: EditCompanyModalProps) {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(currentCompanyId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add new company modal
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCompanies();
      setSelectedCompanyId(currentCompanyId);
      setSearch('');
    }
  }, [isOpen, currentCompanyId]);

  const loadCompanies = async () => {
    setIsLoadingCompanies(true);
    const result = await getAllCompaniesForDropdown();
    if (result.data) {
      setCompanies(result.data);
    }
    setIsLoadingCompanies(false);
  };

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies;
    const searchLower = search.toLowerCase().trim();
    return companies.filter(c => 
      c.company_name.toLowerCase().includes(searchLower)
    );
  }, [companies, search]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const hasSearchWithNoExactMatch = search.trim() && 
    !companies.some(c => c.company_name.toLowerCase() === search.toLowerCase().trim());

  const handleAddNewCompany = () => {
    setNewCompanyName(search.trim());
    setIsAddCompanyOpen(true);
  };

  const handleCompanyCreated = (company: { id: string; company_name: string }) => {
    // Add to list and select
    setCompanies(prev => [...prev, company].sort((a, b) => 
      a.company_name.localeCompare(b.company_name)
    ));
    setSelectedCompanyId(company.id);
    setSearch('');
    setIsAddCompanyOpen(false);
  };

  const handleSubmit = async () => {
    if (!selectedCompanyId) {
      toast({
        variant: 'destructive',
        title: 'Validation error',
        description: 'Please select a company.',
      });
      return;
    }

    if (selectedCompanyId === currentCompanyId) {
      // No change
      onClose();
      return;
    }

    setIsSubmitting(true);

    const result = await updateContactCompany(contactId, selectedCompanyId);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update company',
        description: result.error,
      });
    } else {
      const companyName = selectedCompany?.company_name || 'Unknown';
      toast({
        title: 'Company updated successfully',
        description: `${contactName} is now linked to ${companyName}.`,
      });
      onSuccess(selectedCompanyId, companyName);
      onClose();
    }

    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSearch('');
      setSelectedCompanyId(currentCompanyId);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Change Company
            </DialogTitle>
            <DialogDescription>
              Select a company for <strong>{contactName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Company */}
            {currentCompanyName && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Current company:</p>
                <p className="text-sm font-medium">{currentCompanyName}</p>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Companies List */}
            {isLoadingCompanies ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-60 rounded-md border">
                <div className="p-2 space-y-1">
                  {/* Add New Company Option */}
                  {hasSearchWithNoExactMatch && (
                    <button
                      type="button"
                      onClick={handleAddNewCompany}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add New Company "{search.trim()}"
                    </button>
                  )}

                  {filteredCompanies.length === 0 && !hasSearchWithNoExactMatch ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No companies found
                    </div>
                  ) : (
                    filteredCompanies.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => setSelectedCompanyId(company.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md transition-colors ${
                          selectedCompanyId === company.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">{company.company_name}</span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Selected Company Info */}
            {selectedCompany && selectedCompanyId !== currentCompanyId && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                <p className="text-xs text-green-700 dark:text-green-400 mb-1">New company:</p>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  {selectedCompany.company_name}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedCompanyId || selectedCompanyId === currentCompanyId}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Company Mini Modal */}
      <AddCompanyMiniModal
        open={isAddCompanyOpen}
        onOpenChange={setIsAddCompanyOpen}
        initialName={newCompanyName}
        onSuccess={handleCompanyCreated}
      />
    </>
  );
}
