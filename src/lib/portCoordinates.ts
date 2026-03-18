// Port name → { lat, lng, region } lookup for map plotting
// Normalised to lowercase for fuzzy matching

interface PortCoord {
  lat: number;
  lng: number;
  region: string;
}

const PORT_DB: Record<string, PortCoord> = {
  // Middle East / AG
  'fujairah': { lat: 25.12, lng: 56.34, region: 'ME' },
  'jebel ali': { lat: 25.01, lng: 55.06, region: 'ME' },
  'ras tanura': { lat: 26.65, lng: 50.16, region: 'ME' },
  'jubail': { lat: 27.00, lng: 49.65, region: 'ME' },
  'yanbu': { lat: 24.09, lng: 38.06, region: 'ME' },
  'jeddah': { lat: 21.49, lng: 39.17, region: 'ME' },
  'basra': { lat: 29.52, lng: 48.18, region: 'ME' },
  'mumbai': { lat: 18.92, lng: 72.83, region: 'ME' },
  'hazira': { lat: 21.10, lng: 72.63, region: 'ME' },
  'kandla': { lat: 23.03, lng: 70.22, region: 'ME' },
  'sikka': { lat: 22.96, lng: 69.84, region: 'ME' },
  'khor fakkan': { lat: 25.35, lng: 56.36, region: 'ME' },
  'muscat': { lat: 23.61, lng: 58.54, region: 'ME' },
  'sohar': { lat: 24.36, lng: 56.73, region: 'ME' },
  'dammam': { lat: 26.43, lng: 50.10, region: 'ME' },
  'bahrain': { lat: 26.24, lng: 50.55, region: 'ME' },
  'kuwait': { lat: 29.34, lng: 47.97, region: 'ME' },
  'bandar abbas': { lat: 27.19, lng: 56.28, region: 'ME' },
  'port sudan': { lat: 19.62, lng: 37.22, region: 'ME' },
  'sudan': { lat: 19.62, lng: 37.22, region: 'ME' },
  'aden': { lat: 12.79, lng: 45.01, region: 'ME' },
  // SE Asia
  'singapore': { lat: 1.29, lng: 103.85, region: 'SA' },
  'penang': { lat: 5.41, lng: 100.34, region: 'SA' },
  'port klang': { lat: 3.00, lng: 101.39, region: 'SA' },
  'tanjung pelepas': { lat: 1.36, lng: 103.55, region: 'SA' },
  'batam': { lat: 1.08, lng: 104.05, region: 'SA' },
  'medan': { lat: 3.78, lng: 98.68, region: 'SA' },
  'dumai': { lat: 1.68, lng: 101.44, region: 'SA' },
  'bangkok': { lat: 13.69, lng: 100.58, region: 'SA' },
  'ho chi minh': { lat: 10.77, lng: 106.70, region: 'SA' },
  'vietnam': { lat: 10.77, lng: 106.70, region: 'SA' },
  'bangladesh': { lat: 22.33, lng: 91.83, region: 'SA' },
  'chittagong': { lat: 22.33, lng: 91.83, region: 'SA' },
  // Far East
  'yokohama': { lat: 35.44, lng: 139.64, region: 'FE' },
  'chiba': { lat: 35.59, lng: 140.07, region: 'FE' },
  'busan': { lat: 35.10, lng: 129.03, region: 'FE' },
  'ningbo': { lat: 29.87, lng: 121.55, region: 'FE' },
  'zhoushan': { lat: 30.00, lng: 122.10, region: 'FE' },
  'qingdao': { lat: 36.07, lng: 120.38, region: 'FE' },
  'guangzhou': { lat: 23.10, lng: 113.30, region: 'FE' },
  'shanghai': { lat: 31.23, lng: 121.47, region: 'FE' },
  'kaohsiung': { lat: 22.62, lng: 120.30, region: 'FE' },
  'south china': { lat: 22.30, lng: 114.17, region: 'FE' },
  // Europe
  'rotterdam': { lat: 51.90, lng: 4.50, region: 'EU' },
  'amsterdam': { lat: 52.38, lng: 4.90, region: 'EU' },
  'antwerp': { lat: 51.22, lng: 4.40, region: 'EU' },
  'hamburg': { lat: 53.55, lng: 9.99, region: 'EU' },
  'london': { lat: 51.50, lng: 0.07, region: 'EU' },
  'piraeus': { lat: 37.94, lng: 23.65, region: 'EU' },
  'genoa': { lat: 44.41, lng: 8.93, region: 'EU' },
  'trieste': { lat: 45.65, lng: 13.77, region: 'EU' },
  'algeciras': { lat: 36.13, lng: -5.44, region: 'EU' },
  'rouen': { lat: 49.44, lng: 1.10, region: 'EU' },
  'north sea': { lat: 56.00, lng: 3.00, region: 'EU' },
  // Americas
  'houston': { lat: 29.76, lng: -95.36, region: 'AM' },
  'new york': { lat: 40.67, lng: -74.04, region: 'AM' },
  'new orleans': { lat: 29.95, lng: -90.07, region: 'AM' },
  'santos': { lat: -23.96, lng: -46.31, region: 'AM' },
  'tubarao': { lat: -20.28, lng: -40.25, region: 'AM' },
  'usg': { lat: 29.76, lng: -95.36, region: 'AM' },
  'usec': { lat: 40.67, lng: -74.04, region: 'AM' },
  // Africa
  'lagos': { lat: 6.45, lng: 3.39, region: 'AF' },
  'dakar': { lat: 14.73, lng: -17.47, region: 'AF' },
  'durban': { lat: -29.87, lng: 31.05, region: 'AF' },
  'mombasa': { lat: -4.04, lng: 39.67, region: 'AF' },
  'dar es salaam': { lat: -6.82, lng: 39.28, region: 'AF' },
  'west africa': { lat: 6.45, lng: 3.39, region: 'AF' },
  // General / areas
  'worldwide': { lat: 0, lng: 0, region: 'ALL' },
  'sea': { lat: 1.29, lng: 103.85, region: 'SA' },
  'east of suez': { lat: 12.00, lng: 45.00, region: 'ME' },
  'ag': { lat: 26.00, lng: 52.00, region: 'ME' },
  'ara': { lat: 51.50, lng: 4.00, region: 'EU' },
  'far east': { lat: 30.00, lng: 122.00, region: 'FE' },
  'waf': { lat: 6.45, lng: 3.39, region: 'AF' },
  'india': { lat: 18.92, lng: 72.83, region: 'ME' },
  'japan': { lat: 35.44, lng: 139.64, region: 'FE' },
  'china': { lat: 31.23, lng: 121.47, region: 'FE' },
  'korea': { lat: 35.10, lng: 129.03, region: 'FE' },
  'malaysia': { lat: 3.00, lng: 101.39, region: 'SA' },
  'ba': { lat: 26.24, lng: 50.55, region: 'ME' }, // Bahrain
};

/**
 * Look up coordinates for a port name. Tries exact match first,
 * then fuzzy substring match against known ports.
 */
export function lookupPortCoordinates(portName: string | null): PortCoord | null {
  if (!portName) return null;

  const normalized = portName.toLowerCase().trim();

  // Exact match
  if (PORT_DB[normalized]) return PORT_DB[normalized];

  // Try first part before comma (e.g. "Ningbo, China" → "ningbo")
  const firstPart = normalized.split(',')[0].trim();
  if (PORT_DB[firstPart]) return PORT_DB[firstPart];

  // Try splitting by dash/slash (e.g. "singapore-malay range" → "singapore")
  const dashPart = normalized.split(/[-/]/)[0].trim();
  if (PORT_DB[dashPart]) return PORT_DB[dashPart];

  // Fuzzy: check if any known port is a substring
  for (const [key, coord] of Object.entries(PORT_DB)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coord;
    }
  }

  return null;
}
