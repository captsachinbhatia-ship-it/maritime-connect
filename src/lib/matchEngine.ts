import { Vessel, MapEnquiry, MatchResult, ADJACENT_REGIONS } from '@/types/maritime';

const CARGO_TYPE_MAP: Record<string, string[]> = {
  'Bulk Carrier': ['Iron Ore', 'Coal', 'Grain', 'Wheat', 'Corn', 'Bauxite', 'Cement'],
  'Tanker': ['Crude', 'Crude Oil', 'ULSD', 'Fuel Oil', 'Naphtha', 'Jet Fuel', 'Diesel', 'Gasoil', 'LPG', 'LNG'],
  'Container': ['Containers', 'Container', 'General Cargo'],
};

function getVesselTypeForCargo(cargo: string): string[] {
  const upper = cargo.toUpperCase();
  const matches: string[] = [];
  for (const [vesselType, cargos] of Object.entries(CARGO_TYPE_MAP)) {
    if (cargos.some(c => upper.includes(c.toUpperCase()))) {
      matches.push(vesselType);
    }
  }
  return matches.length > 0 ? matches : ['Bulk Carrier', 'Tanker'];
}

function parseLaycanStartDate(laycan: string | null): Date | null {
  if (!laycan) return null;
  // Try to parse "Mar 25-30" or "Apr 01-05" style
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const match = laycan.match(/(\w{3})\s+(\d{1,2})/);
  if (match) {
    const month = monthMap[match[1]];
    const day = parseInt(match[2]);
    if (month !== undefined && !isNaN(day)) {
      const year = new Date().getFullYear();
      return new Date(year, month, day);
    }
  }
  return null;
}

export function matchVesselsToEnquiry(
  vessels: Vessel[],
  enquiry: MapEnquiry
): MatchResult[] {
  const results: MatchResult[] = [];
  const qtyMt = enquiry.qty_mt || 0;
  const suitableTypes = getVesselTypeForCargo(enquiry.cargo || '');
  const laycanStart = parseLaycanStartDate(enquiry.laycan);

  for (const vessel of vessels) {
    const reasons: string[] = [];
    let dwtScore = 0;
    let typeScore = 0;
    let regionScore = 0;
    let dateScore = 0;

    // DWT match: vessel.dwt >= qty * 1.05 AND <= qty * 1.4
    const vDwt = vessel.dwt || 0;
    if (qtyMt > 0 && vDwt > 0) {
      const minDwt = qtyMt * 1.05;
      const maxDwt = qtyMt * 1.4;
      if (vDwt >= minDwt && vDwt <= maxDwt) {
        dwtScore = 30;
        reasons.push(`DWT ${vDwt.toLocaleString()} fits cargo ${qtyMt.toLocaleString()} MT`);
      } else if (vDwt >= qtyMt && vDwt <= qtyMt * 1.6) {
        dwtScore = 15;
        reasons.push(`DWT ${vDwt.toLocaleString()} acceptable but not ideal for ${qtyMt.toLocaleString()} MT`);
      } else if (vDwt < qtyMt) {
        dwtScore = 0;
        reasons.push(`DWT ${vDwt.toLocaleString()} too small for ${qtyMt.toLocaleString()} MT`);
      } else {
        dwtScore = 5;
        reasons.push(`DWT ${vDwt.toLocaleString()} oversized for ${qtyMt.toLocaleString()} MT`);
      }
    }

    // Type match
    if (vessel.vessel_type && suitableTypes.includes(vessel.vessel_type)) {
      typeScore = 25;
      reasons.push(`${vessel.vessel_type} suitable for ${enquiry.cargo}`);
    } else if (vessel.vessel_type) {
      typeScore = 5;
      reasons.push(`${vessel.vessel_type} not ideal for ${enquiry.cargo}`);
    }

    // Region proximity
    const vRegion = vessel.region || '';
    const eRegion = enquiry.load_region || '';
    if (vRegion && eRegion) {
      if (vRegion === eRegion) {
        regionScore = 25;
        reasons.push(`Same region (${vRegion})`);
      } else if (ADJACENT_REGIONS[eRegion]?.includes(vRegion)) {
        regionScore = 15;
        reasons.push(`Adjacent region (${vRegion} near ${eRegion})`);
      } else {
        regionScore = 5;
        reasons.push(`Distant region (${vRegion} from ${eRegion})`);
      }
    }

    // Date proximity
    if (laycanStart && vessel.open_date) {
      const openDate = new Date(vessel.open_date);
      const diffDays = Math.abs((openDate.getTime() - laycanStart.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) {
        dateScore = 20;
        reasons.push(`Opens ${Math.round(diffDays)}d from laycan`);
      } else if (diffDays <= 7) {
        dateScore = 15;
        reasons.push(`Opens ${Math.round(diffDays)}d from laycan`);
      } else if (diffDays <= 10) {
        dateScore = 10;
        reasons.push(`Opens ${Math.round(diffDays)}d from laycan`);
      } else {
        dateScore = 2;
        reasons.push(`Opens ${Math.round(diffDays)}d from laycan (too far)`);
      }
    }

    const score = dwtScore + typeScore + regionScore + dateScore;

    results.push({
      vessel,
      score,
      breakdown: { dwtScore, typeScore, regionScore, dateScore },
      reasons,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
