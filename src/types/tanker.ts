export interface TankerVessel {
  id: string;
  vessel_name: string | null;
  imo: string | null;
  vessel_class: string | null;
  cargo_type: string | null;
  dwt_mt: number | null;
  cbm: number | null;
  built_year: number | null;
  flag: string | null;
  owner: string | null;
  open_port: string | null;
  open_area: string | null;
  open_date: string | null;
  lat: number | null;
  lng: number | null;
  region: string | null;
  last_cargo: string | null;
  coated: string | null;
  heating: boolean | null;
  ice_class: string | null;
  status: string | null;
  tc_rate_usd: number | null;
}

export interface TankerEnquiry {
  id: string;
  ref_no: string | null;
  charterer: string | null;
  cargo_grade: string | null;
  cargo_category: string | null;
  quantity_mt: number | null;
  quantity_cbm: number | null;
  load_port: string | null;
  load_area: string | null;
  load_lat: number | null;
  load_lng: number | null;
  load_region: string | null;
  disch_port: string | null;
  disch_area: string | null;
  disch_lat: number | null;
  disch_lng: number | null;
  disch_region: string | null;
  laycan_from: string | null;
  laycan_to: string | null;
  charter_type: string | null;
  freight_type: string | null;
  freight_indication: string | null;
  demurrage_rate: number | null;
  status: string | null;
  broker: string | null;
  special_requirements: string | null;
}

export interface TankerMatchResult {
  vessel: TankerVessel;
  score: number;
  breakdown: {
    classScore: number;
    sizeScore: number;
    regionScore: number;
    dateScore: number;
  };
  reasons: string[];
  warnings: string[];
}

export interface VoyageCalculation {
  id?: string;
  enquiry_id: string;
  vessel_id: string;
  load_port: string;
  disch_port: string;
  distance_nm: number;
  sea_days: number;
  port_days_load: number;
  port_days_disch: number;
  bunker_ifo_mt: number;
  bunker_mgo_mt: number;
  ifo_price_usd: number;
  mgo_price_usd: number;
  bunker_cost: number;
  port_cost_load: number;
  port_cost_disch: number;
  canal_dues: number;
  total_voyage_cost: number;
  freight_revenue: number;
  tce_usd_day: number;
}
