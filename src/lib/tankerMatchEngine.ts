import { TankerVessel, TankerEnquiry, TankerMatchResult } from '@/types/tanker';

// Class matching: cargo category → eligible vessel classes
const CLASS_MAP: Record<string, string[]> = {
  Crude: ['VLCC', 'Suezmax', 'Aframax'],
  CPP: ['LR2', 'LR1', 'MR'],
  DPP: ['Aframax', 'Panamax'],
  Chemical: ['Chemical'],
  LPG: ['VLGC', 'MGC', 'SGC'],
  LNG: ['LNG'],
};

// Dirty cargo grades that make a vessel incompatible for CPP
const DIRTY_LAST_CARGOS = ['Crude', 'Arabian Light', 'Basra Light', 'Fuel Oil', 'Fuel Oil 380', 'Bitumen', 'Asphalt'];

// Cargo grades requiring heating
const HEATING_REQUIRED = ['Fuel Oil', 'Fuel Oil 380', 'Bitumen', 'Asphalt', 'Heavy Fuel Oil'];

// Region proximity scores for tanker trade lanes
const REGION_SCORES: Record<string, Record<string, number>> = {
  ME: { ME: 100, SA: 70, FE: 60, EU: 55, AM: 40, AF: 45 },
  SA: { SA: 100, ME: 70, FE: 75, EU: 45, AM: 35, AF: 40 },
  FE: { FE: 100, SA: 75, ME: 60, EU: 40, AM: 35, AF: 35 },
  EU: { EU: 100, ME: 55, AM: 70, AF: 60, SA: 45, FE: 40 },
  AM: { AM: 100, EU: 70, ME: 40, SA: 35, FE: 35, AF: 45 },
  AF: { AF: 100, ME: 45, EU: 60, AM: 45, SA: 40, FE: 35 },
};

function getRegionScore(vesselRegion: string, loadRegion: string): number {
  return REGION_SCORES[loadRegion]?.[vesselRegion] ?? 30;
}

export function matchTankerVessels(
  vessels: TankerVessel[],
  enquiry: TankerEnquiry
): TankerMatchResult[] {
  const results: TankerMatchResult[] = [];
  const category = enquiry.cargo_category || '';
  const eligibleClasses = CLASS_MAP[category] || [];
  const qtyMt = enquiry.quantity_mt || 0;
  const qtyCbm = enquiry.quantity_cbm || 0;
  const laycanFrom = enquiry.laycan_from ? new Date(enquiry.laycan_from) : null;
  const needsHeating = HEATING_REQUIRED.some(h =>
    (enquiry.cargo_grade || '').toUpperCase().includes(h.toUpperCase())
  );

  for (const vessel of vessels) {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let classScore = 0;
    let sizeScore = 0;
    let regionScore = 0;
    let dateScore = 0;

    // --- Class matching (35%) ---
    if (eligibleClasses.includes(vessel.vessel_class || '')) {
      classScore = 100;
      reasons.push(`${vessel.vessel_class} suitable for ${category}`);
    } else {
      classScore = 0;
      reasons.push(`${vessel.vessel_class} not suitable for ${category}`);
      // Skip vessels with 0 class score — don't even include them
      continue;
    }

    // Coating check for CPP
    if (category === 'CPP' && vessel.coated !== 'Epoxy' && vessel.coated !== 'Stainless') {
      classScore = 40;
      warnings.push(`Vessel not coated (${vessel.coated || 'None'}) — CPP requires Epoxy coating`);
    }

    // Stainless check for Chemical
    if (category === 'Chemical' && vessel.coated !== 'Stainless') {
      classScore = 30;
      warnings.push(`Vessel not stainless (${vessel.coated || 'None'}) — chemicals may require stainless tanks`);
    }

    // Heating check
    if (needsHeating && !vessel.heating) {
      warnings.push('Vessel has no heating — required for this cargo grade');
      classScore = Math.min(classScore, 20);
    }

    // Last cargo compatibility for CPP/Chemical
    if (category === 'CPP' && vessel.last_cargo) {
      if (DIRTY_LAST_CARGOS.some(d => (vessel.last_cargo || '').toUpperCase().includes(d.toUpperCase()))) {
        warnings.push(`Last cargo "${vessel.last_cargo}" may contaminate CPP cargo`);
      }
    }

    // --- Size matching (25%) ---
    const useCbm = category === 'LPG' || category === 'LNG';
    const vesselCap = useCbm ? (vessel.cbm || 0) : (vessel.dwt_mt || 0);
    const requiredCap = useCbm ? qtyCbm : qtyMt;

    if (requiredCap > 0 && vesselCap > 0) {
      const minCap = requiredCap * 1.05;
      const maxCap = requiredCap * 1.45;
      if (vesselCap >= minCap && vesselCap <= maxCap) {
        sizeScore = 100;
        reasons.push(`${useCbm ? 'CBM' : 'DWT'} ${vesselCap.toLocaleString()} ideal for ${requiredCap.toLocaleString()}`);
      } else if (vesselCap >= requiredCap && vesselCap <= requiredCap * 1.6) {
        sizeScore = 60;
        reasons.push(`${useCbm ? 'CBM' : 'DWT'} ${vesselCap.toLocaleString()} acceptable but slightly oversized`);
      } else if (vesselCap < requiredCap) {
        sizeScore = 10;
        warnings.push(`Vessel too small: ${vesselCap.toLocaleString()} vs ${requiredCap.toLocaleString()} required`);
      } else {
        sizeScore = 20;
        warnings.push(`Vessel oversized: ${vesselCap.toLocaleString()} for ${requiredCap.toLocaleString()} cargo`);
      }
    }

    // --- Region proximity (25%) ---
    const vRegion = vessel.region || '';
    const eRegion = enquiry.load_region || '';
    if (vRegion && eRegion) {
      regionScore = getRegionScore(vRegion, eRegion);
      reasons.push(`Region: ${vessel.open_area || vRegion} → ${enquiry.load_area || eRegion} (${regionScore}pts)`);
    }

    // --- Date scoring (15%) ---
    if (laycanFrom && vessel.open_date) {
      const openDate = new Date(vessel.open_date);
      const diffDays = (laycanFrom.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= 5) {
        dateScore = 100;
        reasons.push(`Opens ${Math.round(diffDays)}d before laycan — perfect`);
      } else if (diffDays > 5 && diffDays <= 10) {
        dateScore = 80;
        reasons.push(`Opens ${Math.round(diffDays)}d before laycan`);
      } else if (diffDays > 10) {
        dateScore = 60;
        reasons.push(`Opens ${Math.round(diffDays)}d before laycan — early`);
      } else if (diffDays < 0 && diffDays >= -5) {
        dateScore = 70;
        reasons.push(`Opens ${Math.round(Math.abs(diffDays))}d after laycan start`);
      } else {
        dateScore = 20;
        warnings.push(`Open date ${vessel.open_date} outside laycan window`);
      }
    }

    // --- Weighted final score ---
    const score = Math.round(
      classScore * 0.35 +
      sizeScore * 0.25 +
      regionScore * 0.25 +
      dateScore * 0.15
    );

    results.push({
      vessel,
      score,
      breakdown: { classScore, sizeScore, regionScore, dateScore },
      reasons,
      warnings,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
