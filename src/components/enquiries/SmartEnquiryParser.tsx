import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, RotateCcw, Check } from 'lucide-react';

export interface ParsedEnquiry {
  cargo?: string;
  quantity?: string;
  loadingPort?: string;
  dischargePort?: string;
  laycanFrom?: string;
  laycanTo?: string;
  vesselType?: string;
  vesselName?: string;
  subject?: string;
  other: string[];
}

// Common tanker cargo terms
const CARGO_PATTERNS = [
  'NAPHTHA', 'CRUDE', 'FUEL OIL', 'GASOIL', 'JET', 'MOGAS', 'BITUMEN',
  'CONDENSATE', 'LPG', 'LNG', 'METHANOL', 'ETHANOL', 'BENZENE', 'TOLUENE',
  'XYLENE', 'VGO', 'HSFO', 'VLSFO', 'MGO', 'ULSD', 'CPP', 'DPP',
  'COAL', 'IRON ORE', 'GRAIN', 'FERTILIZER', 'STEEL', 'CEMENT',
  'PALM OIL', 'VEGETABLE OIL', 'CHEMICALS', 'CAUSTIC SODA',
];

const VESSEL_TYPES = [
  'VLCC', 'ULCC', 'SUEZMAX', 'AFRAMAX', 'PANAMAX', 'LR2', 'LR1', 'MR',
  'HANDYSIZE', 'HANDYMAX', 'SUPRAMAX', 'KAMSARMAX', 'CAPESIZE', 'GP',
  'HANDY', 'COASTER', 'MINI CAPE', 'POST PANAMAX', 'BABY CAPE',
];

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parseEnquiryText(text: string): ParsedEnquiry {
  const result: ParsedEnquiry = { other: [] };
  const upperText = text.toUpperCase();

  // Parse cargo type
  for (const cargo of CARGO_PATTERNS) {
    if (upperText.includes(cargo)) {
      result.cargo = cargo;
      break;
    }
  }

  // Parse quantity (numbers with K, KT, MT, BBL, CBM patterns)
  const qtyMatch = text.match(/(\d+(?:[.,]\d+)?)\s*[-–]?\s*(\d+(?:[.,]\d+)?)?\s*(K\b|KT|MT|BBL|CBM|TONS?)/i);
  if (qtyMatch) {
    result.quantity = qtyMatch[0].trim();
  }

  // Parse vessel type
  for (const vt of VESSEL_TYPES) {
    if (upperText.includes(vt)) {
      result.vesselType = vt;
      break;
    }
  }

  // Parse vessel name (MT or MV followed by name)
  const vesselNameMatch = text.match(/(?:M[TV]|MV\/)\s+([A-Z][A-Za-z\s]+?)(?:\s*[-–,]|\s+\d|$)/);
  if (vesselNameMatch) {
    result.vesselName = vesselNameMatch[1].trim();
  }

  // Parse ports - look for LOAD/DISCHARGE or PORT1-PORT2 pattern
  const portMatch = text.match(/([A-Z]{3,}(?:\/[A-Z]{3,})*)\s*[-–]\s*([A-Z]{3,}(?:\/[A-Z]{3,})*)/);
  if (portMatch) {
    result.loadingPort = portMatch[1];
    result.dischargePort = portMatch[2];
  }

  // Parse laycan/dates (various patterns)
  // Pattern: 12-17 FEB or 12/17 FEB or 12 FEB - 17 FEB
  const monthPattern = MONTHS.join('|');
  const laycanRegex = new RegExp(
    `(\\d{1,2})\\s*[-–/]\\s*(\\d{1,2})\\s*(${monthPattern})(?:\\s*(\\d{2,4}))?`,
    'i'
  );
  const laycanMatch = text.match(laycanRegex);
  if (laycanMatch) {
    const day1 = laycanMatch[1];
    const day2 = laycanMatch[2];
    const month = laycanMatch[3].toUpperCase();
    const year = laycanMatch[4] || new Date().getFullYear().toString();
    const monthIdx = MONTHS.indexOf(month);
    if (monthIdx >= 0) {
      const fullYear = year.length === 2 ? `20${year}` : year;
      const m = String(monthIdx + 1).padStart(2, '0');
      result.laycanFrom = `${fullYear}-${m}-${day1.padStart(2, '0')}`;
      result.laycanTo = `${fullYear}-${m}-${day2.padStart(2, '0')}`;
    }
  }

  // Build a subject from extracted data
  const subjectParts: string[] = [];
  if (result.quantity) subjectParts.push(result.quantity);
  if (result.cargo) subjectParts.push(result.cargo);
  if (result.loadingPort && result.dischargePort) subjectParts.push(`${result.loadingPort}-${result.dischargePort}`);
  if (subjectParts.length > 0) result.subject = subjectParts.join(' ');

  // Capture unmatched lines as "other"
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const matched = [result.cargo, result.quantity, result.loadingPort, result.dischargePort, result.vesselType, result.vesselName].filter(Boolean);
  lines.forEach(line => {
    const isMatched = matched.some(m => m && line.toUpperCase().includes(m.toUpperCase()));
    if (!isMatched) {
      result.other.push(line);
    }
  });

  return result;
}

interface SmartEnquiryParserProps {
  onParsed: (data: ParsedEnquiry) => void;
}

export function SmartEnquiryParser({ onParsed }: SmartEnquiryParserProps) {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedEnquiry | null>(null);

  function handleParse() {
    if (!rawText.trim()) return;
    setParsed(parseEnquiryText(rawText));
  }

  function handleConfirm() {
    if (parsed) {
      onParsed(parsed);
      setRawText('');
      setParsed(null);
    }
  }

  const fieldCount = parsed
    ? [parsed.cargo, parsed.quantity, parsed.loadingPort, parsed.dischargePort, parsed.vesselType, parsed.vesselName, parsed.laycanFrom].filter(Boolean).length
    : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={rawText}
          onChange={(e) => { setRawText(e.target.value); setParsed(null); }}
          placeholder={`Paste enquiry text, e.g.:\n\nA/C HPCL - NAPHTHA - 30KT - RAS TANURA-CHIBA\n12-17 FEB - MR TANKER REQD\nOFFERS DUE 1430 HRS IST`}
          rows={5}
          className="font-mono text-sm"
        />
      </div>

      <Button onClick={handleParse} disabled={!rawText.trim()} className="w-full">
        <Zap className="mr-2 h-4 w-4" />
        Parse & Extract Fields
      </Button>

      {parsed && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Extracted Fields</h4>
              <Badge variant="secondary" className="text-xs">
                {fieldCount} field{fieldCount !== 1 ? 's' : ''} found
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {parsed.cargo && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cargo</span>
                  <span className="font-medium">{parsed.cargo}</span>
                </div>
              )}
              {parsed.quantity && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium">{parsed.quantity}</span>
                </div>
              )}
              {parsed.loadingPort && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Load Port</span>
                  <span className="font-medium">{parsed.loadingPort}</span>
                </div>
              )}
              {parsed.dischargePort && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Disch Port</span>
                  <span className="font-medium">{parsed.dischargePort}</span>
                </div>
              )}
              {parsed.vesselType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vessel Type</span>
                  <span className="font-medium">{parsed.vesselType}</span>
                </div>
              )}
              {parsed.vesselName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vessel Name</span>
                  <span className="font-medium">{parsed.vesselName}</span>
                </div>
              )}
              {parsed.laycanFrom && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Laycan</span>
                  <span className="font-medium">{parsed.laycanFrom}{parsed.laycanTo ? ` – ${parsed.laycanTo}` : ''}</span>
                </div>
              )}
              {parsed.subject && (
                <div className="col-span-2 flex justify-between">
                  <span className="text-muted-foreground">Subject</span>
                  <span className="font-medium">{parsed.subject}</span>
                </div>
              )}
            </div>

            {parsed.other.length > 0 && (
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground">Other info (→ Notes):</span>
                <div className="mt-1 text-xs text-muted-foreground">
                  {parsed.other.map((item, i) => (
                    <div key={i}>• {item}</div>
                  ))}
                </div>
              </div>
            )}

            {fieldCount === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No fields could be extracted. Try a different format.
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleConfirm} disabled={fieldCount === 0} className="flex-1">
                <Check className="mr-2 h-4 w-4" />
                Use These Fields
              </Button>
              <Button variant="outline" onClick={() => setParsed(null)} className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" />
                Re-parse
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
