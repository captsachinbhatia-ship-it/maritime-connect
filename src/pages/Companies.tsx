import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CompaniesTable } from '@/components/companies/CompaniesTable';
import { CompanyFilters } from '@/components/companies/CompanyFilters';
import { CompanyDetailsDrawer } from '@/components/companies/CompanyDetailsDrawer';
import { AddCompanyModal } from '@/components/companies/AddCompanyModal';
import {
  listCompanies,
  getContactsCountByCompanyIds,
  getDistinctFilterValues,
} from '@/services/companies';
import type { CompanyFilters as FiltersType, CompanyWithContactCount } from '@/types';

export default function Companies() {
  const [companies, setCompanies] = useState<CompanyWithContactCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FiltersType>({
    search: '',
    company_type: 'all',
    status: 'all',
    region: 'all',
  });

  const [filterOptions, setFilterOptions] = useState<{
    companyTypes: string[];
    statuses: string[];
    regions: string[];
  }>({
    companyTypes: [],
    statuses: [],
    regions: [],
  });

  const [selectedCompany, setSelectedCompany] = useState<CompanyWithContactCount | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [companiesResult, filterValuesResult] = await Promise.all([
        listCompanies(filters),
        getDistinctFilterValues(),
      ]);

      if (companiesResult.error) {
        setError(companiesResult.error);
        setLoading(false);
        return;
      }

      if (filterValuesResult.error) {
        console.warn('Failed to load filter values:', filterValuesResult.error);
      } else {
        setFilterOptions({
          companyTypes: filterValuesResult.companyTypes,
          statuses: filterValuesResult.statuses,
          regions: filterValuesResult.regions,
        });
      }

      const companiesData = companiesResult.data || [];
      
      // Fetch contacts count
      const companyIds = companiesData.map((c) => c.id);
      const contactsResult = await getContactsCountByCompanyIds(companyIds);

      if (contactsResult.error) {
        console.warn('Failed to load contacts count:', contactsResult.error);
      }

      const contactsCountMap = contactsResult.data || {};

      // Merge contacts count with companies
      const companiesWithCount: CompanyWithContactCount[] = companiesData.map((company) => ({
        ...company,
        contacts_count: contactsCountMap[company.id] || 0,
      }));

      setCompanies(companiesWithCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleRowClick = (company: CompanyWithContactCount) => {
    setSelectedCompany(company);
    setDrawerOpen(true);
  };

  const handleAddSuccess = () => {
    fetchCompanies();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            Companies
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your company records
          </p>
        </div>

        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CompanyFilters
        filters={filters}
        onFiltersChange={setFilters}
        companyTypes={filterOptions.companyTypes}
        statuses={filterOptions.statuses}
        regions={filterOptions.regions}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : (
            `${companies.length} compan${companies.length !== 1 ? 'ies' : 'y'} found`
          )}
        </span>
      </div>

      <CompaniesTable
        companies={companies}
        loading={loading}
        onRowClick={handleRowClick}
      />

      <CompanyDetailsDrawer
        company={selectedCompany}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <AddCompanyModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={handleAddSuccess}
        companyTypes={filterOptions.companyTypes}
        statuses={filterOptions.statuses}
        regions={filterOptions.regions}
      />
    </div>
  );
}
