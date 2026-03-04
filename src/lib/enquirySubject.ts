// ─── Shared subject generators & WhatsApp copy ─────────────────────

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function generateCargoSubject({
  quantity,
  quantityUnit,
  cargoType,
  loadingPort,
  dischargePort,
  laycanFrom,
  laycanTo,
}: {
  quantity?: number | string;
  quantityUnit?: string;
  cargoType?: string;
  loadingPort?: string;
  dischargePort?: string;
  laycanFrom?: string;
  laycanTo?: string;
}): string {
  const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  const qty = num && num >= 1000 ? `${Math.round(num / 1000)}K` : String(num || '?');
  const unit = quantityUnit ? ` ${quantityUnit}` : '';
  const cargo = (cargoType || '?').toUpperCase();
  const lp = (loadingPort || '?').toUpperCase();
  const dp = (dischargePort || '?').toUpperCase();

  let laycan = '?';
  if (laycanFrom) {
    const f = new Date(laycanFrom);
    const fDay = f.getDate(), fMon = MONTHS[f.getMonth()];
    if (laycanTo) {
      const t = new Date(laycanTo);
      const tDay = t.getDate(), tMon = MONTHS[t.getMonth()];
      laycan = fMon === tMon ? `${fDay}-${tDay} ${fMon}` : `${fDay} ${fMon}-${tDay} ${tMon}`;
    } else {
      laycan = `${fDay} ${fMon}`;
    }
  }
  return `${qty}${unit} ${cargo} EX ${lp} TO ${dp}\nLAYCAN ${laycan}`;
}

export function generateVesselSubject({
  vesselName,
  vesselType,
  openPort,
  laycanFrom,
}: {
  vesselName?: string;
  vesselType?: string;
  openPort?: string;
  laycanFrom?: string;
}): string {
  const name = (vesselName || 'TBN').toUpperCase();
  const type = (vesselType || '').toUpperCase();
  const port = (openPort || '?').toUpperCase();
  let date = '?';
  if (laycanFrom) {
    const d = new Date(laycanFrom);
    date = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  return `${name}${type ? ' / ' + type : ''}\nOPEN ${port} ${date}`;
}

export function buildWhatsAppText(enq: {
  enquiry_number?: string;
  subject?: string | null;
  vessel_type?: string | null;
  notes?: string | null;
}): string {
  const lines: string[] = [];
  if (enq.enquiry_number) lines.push(enq.enquiry_number);
  if (enq.subject) lines.push(enq.subject);
  if (enq.vessel_type) lines.push(`REQ ${enq.vessel_type.toUpperCase()}`);
  if (enq.notes) {
    const firstLine = enq.notes.split('\n')[0];
    if (firstLine.length < 80) lines.push(firstLine.toUpperCase());
  }
  lines.push('PLS OFFER');
  return lines.join('\n');
}
