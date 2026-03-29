import { useState, useEffect, useCallback } from "react";
import {
  fetchMarketData,
  fetchResolutions,
  type MarketRecord,
  type Resolution,
} from "@/services/marketData";
import { supabase } from "@/lib/supabaseClient";

export function useMarketData(filters?: { dateFrom?: string; dateTo?: string }) {
  const [records, setRecords] = useState<MarketRecord[]>([]);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const f: { dateFrom?: string; dateTo?: string } = {};
    if (filters?.dateFrom) f.dateFrom = filters.dateFrom;
    if (filters?.dateTo) f.dateTo = filters.dateTo;
    const { data, error: err } = await fetchMarketData(Object.keys(f).length > 0 ? f : undefined);
    if (err) setError(err);
    else setRecords(data ?? []);
    fetchResolutions().then(({ data: res }) => setResolutions(res ?? []));
    setLoading(false);
  }, [filters?.dateFrom, filters?.dateTo]);

  useEffect(() => { load(); }, [load]);

  return { records, resolutions, loading, error, reload: load };
}

export function useBalticRoutes(reportDate?: string) {
  const [tcRoutes, setTcRoutes] = useState<Record<string, unknown>[]>([]);
  const [tdRoutes, setTdRoutes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      let tcQuery = supabase.from("baltic_routes").select("*").order("route");
      let tdQuery = supabase.from("dirty_baltic_routes").select("*").order("route");
      if (reportDate) {
        tcQuery = tcQuery.eq("report_date", reportDate);
        tdQuery = tdQuery.eq("report_date", reportDate);
      }
      const [{ data: tc }, { data: td }] = await Promise.all([tcQuery, tdQuery]);
      setTcRoutes((tc ?? []) as Record<string, unknown>[]);
      setTdRoutes((td ?? []) as Record<string, unknown>[]);
      setLoading(false);
    }
    fetch();
  }, [reportDate]);

  return { tcRoutes, tdRoutes, loading };
}

export function useRatesAssessment(reportDate?: string) {
  const [rates, setRates] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      let query = supabase.from("rates_assessment").select("*").order("size_kt").order("route_raw");
      if (reportDate) query = query.eq("report_date", reportDate);
      const { data } = await query;
      setRates((data ?? []) as Record<string, unknown>[]);
      setLoading(false);
    }
    fetch();
  }, [reportDate]);

  return { rates, loading };
}
