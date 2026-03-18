import { useMemo } from 'react';
import { Vessel, MapEnquiry, MatchResult } from '@/types/maritime';
import { matchVesselsToEnquiry } from '@/lib/matchEngine';

export function useCargoMatch(
  vessels: Vessel[],
  enquiry: MapEnquiry | null
): MatchResult[] {
  return useMemo(() => {
    if (!enquiry) return [];
    return matchVesselsToEnquiry(vessels, enquiry);
  }, [vessels, enquiry]);
}
