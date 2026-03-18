import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Vessel, MapEnquiry, PortPda } from '@/types/maritime';

export function useMapData() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [enquiries, setEnquiries] = useState<MapEnquiry[]>([]);
  const [ports, setPorts] = useState<PortPda[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, eRes, pRes] = await Promise.all([
        supabase
          .from('vessels')
          .select('id, name, imo, vessel_type, dwt, open_port, open_date, lat, lng, region, flag, year_built')
          .not('lat', 'is', null)
          .not('lng', 'is', null),
        supabase
          .from('map_enquiries')
          .select('*'),
        supabase
          .from('port_pda')
          .select('*'),
      ]);

      if (vRes.data) setVessels(vRes.data as Vessel[]);
      if (eRes.data) setEnquiries(eRes.data as MapEnquiry[]);
      if (pRes.data) setPorts(pRes.data as PortPda[]);
    } catch (err) {
      console.error('useMapData fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { vessels, enquiries, ports, loading, refetch: fetchAll };
}
