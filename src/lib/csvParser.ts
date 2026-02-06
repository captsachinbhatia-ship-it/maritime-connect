import type { ParsedCsvRow } from '@/services/bulkImport';

const EXPECTED_HEADERS = [
  'full_name',
  'designation',
  'company_name',
  'country_code',
  'phone',
  'phone_type',
  'email',
  'ice_handle',
  'preferred_channel',
  'notes',
] as const;

function normalizePhoneType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('whatsapp') || lower.includes('wa')) return 'WhatsApp';
  return 'Mobile';
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function parseCsvContent(
  content: string
): { rows: ParsedCsvRow[]; error: string | null } {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 1) {
    return { rows: [], error: 'CSV file is empty.' };
  }

  // Parse header row
  const rawHeaders = parseCsvLine(lines[0]).map((h) =>
    h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
  );

  // Check for required column
  if (!rawHeaders.includes('full_name')) {
    return { rows: [], error: 'Missing required column: full_name' };
  }

  // Map header indices
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, i) => {
    if ((EXPECTED_HEADERS as readonly string[]).includes(h)) {
      headerMap[h] = i;
    }
  });

  const rows: ParsedCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const getValue = (key: string): string => {
      const idx = headerMap[key];
      if (idx === undefined || idx >= values.length) return '';
      return (values[idx] || '').trim();
    };

    const fullName = getValue('full_name');
    if (!fullName) continue; // skip blank rows

    const email = getValue('email').toLowerCase();
    const phoneTypeRaw = getValue('phone_type');
    const phoneType = phoneTypeRaw ? normalizePhoneType(phoneTypeRaw) : 'Mobile';

    rows.push({
      full_name: fullName,
      designation: getValue('designation'),
      company_name: getValue('company_name'),
      country_code: getValue('country_code'),
      phone: getValue('phone'),
      phone_type: phoneType,
      email,
      ice_handle: getValue('ice_handle'),
      preferred_channel: getValue('preferred_channel'),
      notes: getValue('notes'),
    });
  }

  return { rows, error: null };
}

export function generateCsvTemplate(): string {
  return EXPECTED_HEADERS.join(',') + '\n';
}
