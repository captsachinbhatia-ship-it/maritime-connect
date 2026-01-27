export interface Company {
  id: string;
  company_name: string | null;
  company_type: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  website: string | null;
  email_general: string | null;
  phone_general: string | null;
  status: string | null;
  notes: string | null;
  is_active: boolean | null;
  updated_at: string | null;
}

export interface CompanyWithContactCount extends Company {
  contacts_count: number;
}

export interface CreateCompanyPayload {
  company_name: string;
  company_type: string;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  website?: string | null;
  email_general?: string | null;
  phone_general?: string | null;
  status?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface CompanyFilters {
  search?: string;
  company_type?: string;
  status?: string;
  region?: string;
}

export interface User {
  id: string;
  email: string;
}
