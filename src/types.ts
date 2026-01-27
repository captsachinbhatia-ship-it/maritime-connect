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

// Contact types
export interface Contact {
  id: string;
  full_name: string | null;
  company_id: string | null;
  designation: string | null;
  country_code: string | null;
  phone: string | null;
  phone_type: string | null;
  email: string | null;
  ice_handle: string | null;
  preferred_channel: string | null;
  notes: string | null;
  is_active: boolean | null;
  updated_at: string | null;
}

export interface ContactWithCompany extends Contact {
  company_name?: string;
}

export interface CreateContactPayload {
  full_name: string;
  company_id?: string | null;
  designation?: string | null;
  country_code?: string | null;
  phone?: string | null;
  phone_type?: string | null;
  email?: string | null;
  ice_handle?: string | null;
  preferred_channel?: string | null;
  notes?: string | null;
}

export interface ContactFilters {
  search?: string;
}

export interface ContactAssignment {
  id: string;
  contact_id: string;
  stage: string;
  status: string;
  assigned_to: string;
  created_at: string | null;
  updated_at: string | null;
}
