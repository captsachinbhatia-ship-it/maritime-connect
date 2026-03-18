import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Vessel, MapEnquiry, PortPda } from '@/types/maritime';
import { TankerVessel, TankerEnquiry } from '@/types/tanker';
import { lookupPortCoordinates } from '@/lib/portCoordinates';

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
        // Real CRM vessels (with lat/lng from map columns)
        supabase
          .from('vessels')
          .select('id, name, imo, vessel_type, dwt, size_class, open_port, open_date, lat, lng, region, flag, year_built')
          .not('lat', 'is', null)
          .not('lng', 'is', null),
        // Real CRM enquiries
        supabase
          .from('enquiries')
          .select('id, enquiry_number, cargo_type, loading_port, discharge_port, laycan_from, laycan_to, status, enquiry_mode, vessel_type, quantity, quantity_unit')
          .eq('is_draft', false)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        // Port PDA
        supabase
          .from('port_pda')
          .select('*'),
        // Tanker vessels
        supabase
          .from('tanker_vessels')
          .select('*'),
        // Tanker enquiries
        supabase
          .from('tanker_enquiries')
          .select('*'),
      ]);

      // Map CRM vessels → Vessel type
      if (vRes.data) {
        setVessels(vRes.data.map((v: any) => ({
          id: v.id,
          name: v.name,
          imo: v.imo,
          vessel_type: v.vessel_type || v.size_class,
          dwt: v.dwt,
          open_port: v.open_port,
          open_date: v.open_date,
          lat: v.lat,
          lng: v.lng,
          region: v.region,
          flag: v.flag,
          year_built: v.year_built,
        })));
      }

      // Map CRM enquiries → MapEnquiry type (geocode ports on the fly)
      if (eRes.data) {
        const mapped: MapEnquiry[] = eRes.data.map((e: any) => {
          const loadCoord = lookupPortCoordinates(e.loading_port);
          const dischCoord = lookupPortCoordinates(e.discharge_port);

          // Map CRM status to map status
          let mapStatus = 'open';
          const s = (e.status || '').toUpperCase();
          if (s === 'FIXED' || s === 'WON' || s === 'SUBJECTS') mapStatus = 'fixed';
          else if (s === 'QUOTED' || s === 'OFFER_OUT' || s === 'COUNTERING' || s === 'IN_MARKET' || s === 'SCREENING') mapStatus = 'pending';

          return {
            id: e.id,
            ref_no: e.enquiry_number,
            cargo: e.cargo_type || e.enquiry_mode || 'General',
            load_port: e.loading_port,
            load_lat: loadCoord?.lat ?? null,
            load_lng: loadCoord?.lng ?? null,
            load_region: loadCoord?.region ?? null,
            disch_port: e.discharge_port,
            disch_lat: dischCoord?.lat ?? null,
            disch_lng: dischCoord?.lng ?? null,
            disch_region: dischCoord?.region ?? null,
            qty_mt: e.quantity ? Number(e.quantity) : null,
            laycan: e.laycan_from ? `${e.laycan_from}${e.laycan_to ? ' — ' + e.laycan_to : ''}` : null,
            charter_type: e.enquiry_mode,
            status: mapStatus,
          };
        });
        setEnquiries(mapped);
      }

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
