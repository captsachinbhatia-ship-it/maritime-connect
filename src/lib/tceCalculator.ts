// ─── Distance table (NM) for key tanker routes ────────────────────
export const TANKER_DISTANCES: Record<string, number> = {
  'Ras Tanura-Ningbo': 6200,
  'Ras Tanura-Chiba': 6600,
  'Ras Tanura-Rotterdam': 11500,
  'Ras Tanura-USG': 12800,
  'Ras Tanura-Mumbai': 1600,
  'Ras Tanura-Singapore': 3800,
  'Basra-Rotterdam': 12200,
  'Basra-Ningbo': 6500,
  'Basra-Chiba': 6900,
  'Fujairah-Singapore': 3560,
  'Fujairah-Chiba': 6400,
  'Fujairah-Rotterdam': 10900,
  'Fujairah-Mumbai': 1200,
  'Fujairah-Guangzhou': 4800,
  'Jubail-Chiba': 6700,
  'Jubail-Ningbo': 6300,
  'Singapore-Yokohama': 3300,
  'Singapore-Guangzhou': 1650,
  'Singapore-Chiba': 3400,
  'Rotterdam-Lagos': 5400,
  'Rotterdam-New York': 3570,
  'Rotterdam-Houston': 5200,
  'Rotterdam-Dakar': 3200,
  'Houston-Rotterdam': 5200,
  'Houston-Chiba': 9600,
};

// ─── WS Flat rates (USD/MT) for key routes ─────────────────────────
export const WS_FLAT_RATES: Record<string, number> = {
  'AG-FE-VLCC': 18.50,
  'AG-EU-Suezmax': 21.80,
  'AG-FE-LR2': 24.50,
  'AG-SA-MR': 12.60,
  'AG-FE-Aframax': 22.00,
  'EU-AF-MR': 18.00,
  'EU-AM-Aframax': 16.50,
  'AG-ME-MR': 8.50,
};

// ─── Default fuel consumption (MT/day at sea) by vessel class ───────
export const DEFAULT_IFO_CONSUMPTION: Record<string, number> = {
  VLCC: 95,
  Suezmax: 55,
  Aframax: 40,
  LR2: 38,
  LR1: 30,
  MR: 22,
  Panamax: 35,
  Chemical: 18,
  VLGC: 48,
  LNG: 130,
};

// ─── Suez Canal dues (approximate USD) by vessel class ──────────────
export const SUEZ_CANAL_DUES: Record<string, number> = {
  VLCC: 600000,
  Suezmax: 280000,
  Aframax: 180000,
  LR2: 170000,
  LR1: 140000,
  MR: 90000,
  Panamax: 120000,
  Chemical: 65000,
  VLGC: 220000,
  LNG: 350000,
};

// ─── Default speed (knots) ──────────────────────────────────────────
export const DEFAULT_LADEN_SPEED = 13.0;
export const DEFAULT_BALLAST_SPEED = 14.5;
export const DEFAULT_PORT_MGO_CONSUMPTION = 3; // MT/day in port
export const DEFAULT_IFO_PRICE = 500; // USD/MT
export const DEFAULT_MGO_PRICE = 700; // USD/MT
export const DEFAULT_PORT_DAYS_LOAD = 2.5;
export const DEFAULT_PORT_DAYS_DISCH = 2.0;
export const BROKER_COMMISSION = 0.0125; // 1.25%

// ─── Route needs Suez Canal? ────────────────────────────────────────
function routeNeedsSuez(loadRegion: string, dischRegion: string): boolean {
  const suezPairs = [
    ['ME', 'EU'], ['ME', 'AM'], ['SA', 'EU'], ['SA', 'AM'],
    ['FE', 'EU'], ['FE', 'AM'],
  ];
  return suezPairs.some(([a, b]) =>
    (loadRegion === a && dischRegion === b) || (loadRegion === b && dischRegion === a)
  );
}

// ─── Lookup distance (try both directions) ──────────────────────────
export function lookupDistance(loadPort: string, dischPort: string): number | null {
  const normalize = (s: string) => s.split(',')[0].trim();
  const lp = normalize(loadPort);
  const dp = normalize(dischPort);

  return TANKER_DISTANCES[`${lp}-${dp}`]
    ?? TANKER_DISTANCES[`${dp}-${lp}`]
    ?? null;
}

// ─── TCE Calculation ────────────────────────────────────────────────
export interface TceInputs {
  loadPort: string;
  dischPort: string;
  loadRegion: string;
  dischRegion: string;
  vesselClass: string;
  distanceNm: number;
  ladenSpeed: number;
  ballastSpeed: number;
  ifoConsumption: number; // MT/day at sea
  mgoConsumption: number; // MT/day in port
  ifoPrice: number;       // USD/MT
  mgoPrice: number;       // USD/MT
  portDaysLoad: number;
  portDaysDisch: number;
  portCostLoad: number;
  portCostDisch: number;
  canalDues: number;
  freightRevenue: number; // total gross freight USD
}

export interface TceResult {
  ladenSeaDays: number;
  ballastSeaDays: number;
  totalSeaDays: number;
  totalPortDays: number;
  totalVoyageDays: number;
  bunkerIfoMt: number;
  bunkerMgoMt: number;
  bunkerCost: number;
  portCosts: number;
  canalDues: number;
  totalVoyageCost: number;
  grossFreight: number;
  brokerCommission: number;
  netFreight: number;
  tcePerDay: number;
  breakevenFreight: number;
}

export function calculateTce(inputs: TceInputs): TceResult {
  const ladenSeaDays = inputs.distanceNm / (inputs.ladenSpeed * 24);
  const ballastSeaDays = inputs.distanceNm / (inputs.ballastSpeed * 24);
  const totalSeaDays = ladenSeaDays + ballastSeaDays;
  const totalPortDays = inputs.portDaysLoad + inputs.portDaysDisch;
  const totalVoyageDays = totalSeaDays + totalPortDays;

  const bunkerIfoMt = totalSeaDays * inputs.ifoConsumption;
  const bunkerMgoMt = totalPortDays * inputs.mgoConsumption;
  const bunkerCost = bunkerIfoMt * inputs.ifoPrice + bunkerMgoMt * inputs.mgoPrice;

  const portCosts = inputs.portCostLoad + inputs.portCostDisch;
  const canalDues = inputs.canalDues;
  const totalVoyageCost = bunkerCost + portCosts + canalDues;

  const grossFreight = inputs.freightRevenue;
  const brokerCommission = grossFreight * BROKER_COMMISSION;
  const netFreight = grossFreight - brokerCommission;

  const tcePerDay = totalVoyageDays > 0
    ? (netFreight - totalVoyageCost) / totalVoyageDays
    : 0;

  // Breakeven freight = total voyage cost / (1 - commission)
  const breakevenFreight = totalVoyageCost / (1 - BROKER_COMMISSION);

  return {
    ladenSeaDays: Math.round(ladenSeaDays * 100) / 100,
    ballastSeaDays: Math.round(ballastSeaDays * 100) / 100,
    totalSeaDays: Math.round(totalSeaDays * 100) / 100,
    totalPortDays,
    totalVoyageDays: Math.round(totalVoyageDays * 100) / 100,
    bunkerIfoMt: Math.round(bunkerIfoMt),
    bunkerMgoMt: Math.round(bunkerMgoMt),
    bunkerCost: Math.round(bunkerCost),
    portCosts,
    canalDues,
    totalVoyageCost: Math.round(totalVoyageCost),
    grossFreight,
    brokerCommission: Math.round(brokerCommission),
    netFreight: Math.round(netFreight),
    tcePerDay: Math.round(tcePerDay),
    breakevenFreight: Math.round(breakevenFreight),
  };
}

export function getDefaultCanalDues(
  vesselClass: string,
  loadRegion: string,
  dischRegion: string
): number {
  if (routeNeedsSuez(loadRegion, dischRegion)) {
    return SUEZ_CANAL_DUES[vesselClass] || 100000;
  }
  return 0;
}

export function getDefaultIfoConsumption(vesselClass: string): number {
  return DEFAULT_IFO_CONSUMPTION[vesselClass] || 30;
}
