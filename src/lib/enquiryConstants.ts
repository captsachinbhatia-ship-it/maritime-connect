// ─── Tanker Enquiry Constants ─────────────────────────────────────────

export const TANKER_STATUSES = [
  { value: 'RECEIVED', label: 'Received' },
  { value: 'SCREENING', label: 'Screening' },
  { value: 'IN_MARKET', label: 'In Market' },
  { value: 'OFFER_OUT', label: 'Offer Out' },
  { value: 'COUNTERING', label: 'Countering' },
  { value: 'SUBJECTS', label: 'Subjects' },
  { value: 'FIXED', label: 'Fixed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  // Legacy statuses for backwards compatibility
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'QUOTED', label: 'Quoted' },
  { value: 'NEGOTIATING', label: 'Negotiating' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
  { value: 'ON_HOLD', label: 'On Hold' },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  SCREENING: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
  IN_MARKET: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  OFFER_OUT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  COUNTERING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  SUBJECTS: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  FIXED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CANCELLED: 'bg-muted text-muted-foreground',
  WITHDRAWN: 'bg-muted text-muted-foreground',
  // Legacy
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  QUOTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  NEGOTIATING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  WON: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  LOST: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  ON_HOLD: 'bg-muted text-muted-foreground',
};

export const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  LOW: 'bg-muted text-muted-foreground',
};

export const MODE_COLORS: Record<string, string> = {
  CARGO: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  VESSEL: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  CARGO_OPEN: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  VESSEL_OPEN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  GENERAL: 'bg-muted text-muted-foreground',
};

export const MODE_LABELS: Record<string, string> = {
  CARGO: 'Cargo',
  VESSEL: 'Vessel',
  CARGO_OPEN: 'Cargo',
  VESSEL_OPEN: 'Vessel',
  GENERAL: 'General',
};

export const QUOTE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  EXPIRED: 'bg-muted text-muted-foreground',
  REVISED: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
};

/** Derive display mode from enquiry fields */
export function deriveDisplayMode(row: {
  enquiry_mode?: string | null;
  cargo_type?: string | null;
  quantity?: number | null;
  loading_port?: string | null;
  discharge_port?: string | null;
  laycan_from?: string | null;
  laycan_to?: string | null;
  vessel_name?: string | null;
  vessel_type?: string | null;
}): 'CARGO' | 'VESSEL' | 'GENERAL' {
  // If the DB has enquiry_mode, use it
  if ((row as Record<string, unknown>).enquiry_mode === 'CARGO' || (row as Record<string, unknown>).enquiry_mode === 'CARGO_OPEN') return 'CARGO';
  if ((row as Record<string, unknown>).enquiry_mode === 'VESSEL' || (row as Record<string, unknown>).enquiry_mode === 'VESSEL_OPEN') return 'VESSEL';
  if ((row as Record<string, unknown>).enquiry_mode === 'GENERAL') return 'GENERAL';

  // Derive from field presence
  const hasCargoFields = !!(row.cargo_type || row.quantity || row.loading_port || row.discharge_port || row.laycan_from || row.laycan_to);
  const hasVesselFields = !!(row.vessel_name || row.vessel_type);

  if (hasCargoFields) return 'CARGO';
  if (hasVesselFields) return 'VESSEL';
  return 'GENERAL';
}

/** Format laycan range */
export function formatLaycan(from?: string | null, to?: string | null): string {
  if (!from && !to) return '—';
  const fmt = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); }
    catch { return d; }
  };
  if (from && to) return `${fmt(from)}–${fmt(to)}`;
  if (from) return `${fmt(from)}–`;
  return `–${fmt(to!)}`;
}

/** Format budget range */
export function formatBudget(min?: number | null, max?: number | null, currency?: string | null): string {
  if (min == null && max == null) return '—';
  const c = currency || 'USD';
  if (min != null && max != null) return `${c} ${min.toLocaleString()}–${max.toLocaleString()}`;
  if (min != null) return `${c} ${min.toLocaleString()}+`;
  return `${c} ≤${max!.toLocaleString()}`;
}

/** Compute days open from created_at */
export function computeDaysOpen(createdAt?: string | null): number | null {
  if (!createdAt) return null;
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
