// Keyword detection for interaction subject/notes
// Matches keywords and returns corresponding display chips

const KEYWORD_MAP: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(on\s+subs?|subs)\b/i, label: 'Subs' },
  { pattern: /\brates?\b/i, label: 'Rate' },
  { pattern: /\bfreight\b/i, label: 'Freight' },
  { pattern: /\blaycan\b/i, label: 'Laycan' },
  { pattern: /\bcargo\b/i, label: 'Cargo' },
  { pattern: /\bvessel\b/i, label: 'Vessel' },
  { pattern: /\b(ws|worldscale)\b/i, label: 'WS' },
  { pattern: /\bdemurrage\b/i, label: 'Demurrage' },
  { pattern: /\bcharter\b/i, label: 'Charter' },
  { pattern: /\bnomination\b/i, label: 'Nomination' },
];

export function extractKeywordChips(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  KEYWORD_MAP.forEach(({ pattern, label }) => {
    if (pattern.test(text)) {
      found.add(label);
    }
  });
  return Array.from(found);
}
