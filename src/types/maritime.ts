export interface Vessel {
  id: string;
  name: string;
  imo: string | null;
  vessel_type: string | null;
  dwt: number | null;
  open_port: string | null;
  open_date: string | null;
  lat: number | null;
  lng: number | null;
  region: string | null;
  flag: string | null;
  year_built: number | null;
}

export interface MapEnquiry {
  id: string;
  ref_no: string | null;
  cargo: string | null;
  load_port: string | null;
  load_lat: number | null;
  load_lng: number | null;
  load_region: string | null;
  disch_port: string | null;
  disch_lat: number | null;
  disch_lng: number | null;
  disch_region: string | null;
  qty_mt: number | null;
  laycan: string | null;
  charter_type: string | null;
  status: string | null;
}

export interface PortPda {
  id: string;
  port_name: string | null;
  country: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  port_dues: number | null;
  pilotage: number | null;
  towage: number | null;
  agency_fees: number | null;
  mooring: number | null;
  misc: number | null;
}

export type Region = 'ALL' | 'ME' | 'SA' | 'FE' | 'EU' | 'AM' | 'AF';

export const REGION_LABELS: Record<string, string> = {
  ALL: 'All',
  ME: 'Middle East',
  SA: 'SE Asia',
  FE: 'Far East',
  EU: 'Europe',
  AM: 'Americas',
  AF: 'Africa',
};

export const ADJACENT_REGIONS: Record<string, string[]> = {
  ME: ['SA', 'EU', 'AF'],
  SA: ['ME', 'FE'],
  FE: ['SA'],
  EU: ['ME', 'AM', 'AF'],
  AM: ['EU'],
  AF: ['ME', 'EU'],
};

export interface MatchResult {
  vessel: Vessel;
  score: number;
  breakdown: {
    dwtScore: number;
    typeScore: number;
    regionScore: number;
    dateScore: number;
  };
  reasons: string[];
}
