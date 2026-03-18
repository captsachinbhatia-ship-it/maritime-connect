import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Vessel, MapEnquiry, PortPda } from '@/types/maritime';
import { TankerVessel, TankerEnquiry } from '@/types/tanker';

export function useMapData() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [enquiries, setEnquiries] = useState<MapEnquiry[]>([]);
  const [ports, setPorts] = useState<PortPda[]>([]);
  const [tankerVessels, setTankerVessels] = useState<TankerVessel[]>([]);
  const [tankerEnquiries, setTankerEnquiries] = useState<TankerEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, eRes, pRes, tvRes, teRes] = await Promise.all([
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
        supabase
          .from('tanker_vessels')
          .select('*'),
        supabase
          .from('tanker_enquiries')
          .select('*'),
      ]);

      if (vRes.data) setVessels(vRes.data as Vessel[]);
      if (eRes.data) setEnquiries(eRes.data as MapEnquiry[]);
      if (pRes.data) setPorts(pRes.data as PortPda[]);
      if (tvRes.data) setTankerVessels(tvRes.data as TankerVessel[]);
      if (teRes.data) setTankerEnquiries(teRes.data as TankerEnquiry[]);
    } catch (err) {
      console.error('useMapData fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { vessels, enquiries, ports, tankerVessels, tankerEnquiries, loading, refetch: fetchAll };
}
