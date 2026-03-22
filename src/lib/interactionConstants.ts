import type { InteractionType } from '@/services/interactions';

/** Canonical list – the `value` matches the DB CHECK constraint exactly. */
export const INTERACTION_TYPE_OPTIONS: { value: InteractionType; label: string; icon: string }[] = [
  { value: 'COLD_CALL', label: 'Cold Call', icon: '📱' },
  { value: 'CALL', label: 'Call', icon: '📞' },
  { value: 'EMAIL_SENT', label: 'Email Sent', icon: '✉️' },
  { value: 'WHATSAPP_SENT', label: 'WhatsApp Sent', icon: '💬' },
  { value: 'WHATSAPP_REPLY', label: 'WhatsApp Reply', icon: '💬' },
  { value: 'MEETING', label: 'Meeting', icon: '🤝' },
  { value: 'NOTE', label: 'Note', icon: '📝' },
];

/** Set for O(1) validation before insert. */
export const ALLOWED_INTERACTION_TYPES = new Set<string>(
  INTERACTION_TYPE_OPTIONS.map((t) => t.value),
);

// ---------------------------------------------------------------------------
// Type-specific outcome options (Upgrade 4 — standardised dispositions)
// ---------------------------------------------------------------------------

export interface OutcomeOption {
  value: string;
  label: string;
}

/** Outcomes grouped by interaction type. */
const CALL_OUTCOMES: OutcomeOption[] = [
  { value: 'Not Answered', label: 'Not Answered' },
  { value: 'Busy / Call Back Later', label: 'Busy / Call Back Later' },
  { value: 'Spoke — Not Interested', label: 'Spoke — Not Interested' },
  { value: 'Spoke — Follow Up Needed', label: 'Spoke — Follow Up Needed' },
  { value: 'Spoke — Cargo Enquiry Raised', label: 'Spoke — Cargo Enquiry Raised' },
  { value: 'Spoke — Rate / Fixture Discussion', label: 'Spoke — Rate / Fixture Discussion' },
];

const WHATSAPP_OUTCOMES: OutcomeOption[] = [
  { value: 'No Response', label: 'No Response' },
  { value: 'Acknowledged — No Action', label: 'Acknowledged — No Action' },
  { value: 'Responded — Follow Up Needed', label: 'Responded — Follow Up Needed' },
  { value: 'Responded — Cargo Enquiry Raised', label: 'Responded — Cargo Enquiry Raised' },
];

const EMAIL_OUTCOMES: OutcomeOption[] = [
  { value: 'Sent — Awaiting Reply', label: 'Sent — Awaiting Reply' },
  { value: 'Replied — Follow Up Needed', label: 'Replied — Follow Up Needed' },
  { value: 'Replied — Enquiry Raised', label: 'Replied — Enquiry Raised' },
  { value: 'Bounced / No Delivery', label: 'Bounced / No Delivery' },
];

const MEETING_OUTCOMES: OutcomeOption[] = [
  { value: 'Introductory — No Immediate Business', label: 'Introductory — No Immediate Business' },
  { value: 'Discussion — Rates / Routes', label: 'Discussion — Rates / Routes' },
  { value: 'Enquiry Generated', label: 'Enquiry Generated' },
  { value: 'Deal Progressing', label: 'Deal Progressing' },
  { value: 'Relationship Maintenance', label: 'Relationship Maintenance' },
];

const NOTE_OUTCOMES: OutcomeOption[] = [
  { value: 'Internal Note', label: 'Internal Note' },
  { value: 'Market Intelligence', label: 'Market Intelligence' },
  { value: 'Contact Preference Recorded', label: 'Contact Preference Recorded' },
];

const OUTCOME_OPTIONS_BY_TYPE: Record<string, OutcomeOption[]> = {
  COLD_CALL: CALL_OUTCOMES,
  CALL: CALL_OUTCOMES,
  EMAIL_SENT: EMAIL_OUTCOMES,
  WHATSAPP_SENT: WHATSAPP_OUTCOMES,
  WHATSAPP_REPLY: WHATSAPP_OUTCOMES,
  MEETING: MEETING_OUTCOMES,
  NOTE: NOTE_OUTCOMES,
};

/**
 * Returns outcome options for a given interaction type.
 * Falls back to an empty array when no type is selected.
 */
export function getOutcomeOptionsForType(type: string | undefined): OutcomeOption[] {
  if (!type) return [];
  return OUTCOME_OPTIONS_BY_TYPE[type] ?? [];
}

/**
 * Flat list of every new outcome across all types — useful for filters.
 */
export const ALL_OUTCOME_OPTIONS: OutcomeOption[] = (() => {
  const seen = new Set<string>();
  const result: OutcomeOption[] = [];
  for (const opts of Object.values(OUTCOME_OPTIONS_BY_TYPE)) {
    for (const o of opts) {
      if (!seen.has(o.value)) {
        seen.add(o.value);
        result.push(o);
      }
    }
  }
  return result;
})();

// ---------------------------------------------------------------------------
// Legacy outcome options (for backward compat with existing DB records)
// ---------------------------------------------------------------------------

export const LEGACY_OUTCOME_OPTIONS = [
  { value: 'INTERESTED', label: 'Positive', icon: '✅' },
  { value: 'NO_RESPONSE', label: 'No Response', icon: '🔇' },
  { value: 'NOT_INTERESTED', label: 'Not Interested', icon: '❌' },
  { value: 'FOLLOW_UP', label: 'Follow-up Needed', icon: '🔔' },
  { value: 'MEETING_SCHEDULED', label: 'Meeting Scheduled', icon: '📅' },
  { value: 'DEAL_PROGRESS', label: 'Deal Progress', icon: '📈' },
  { value: 'CLOSED_WON', label: 'Closed Won', icon: '🎉' },
  { value: 'CLOSED_LOST', label: 'Closed Lost', icon: '📉' },
];

/** @deprecated Use getOutcomeOptionsForType() for modals, ALL_OUTCOME_OPTIONS for filters */
export const OUTCOME_OPTIONS = LEGACY_OUTCOME_OPTIONS;

// ---------------------------------------------------------------------------
// Outcome badge color classification (works for both legacy and new values)
// ---------------------------------------------------------------------------

export type OutcomeBadgeColor = 'green' | 'amber' | 'red' | 'gray';

const GREEN_PATTERNS = [
  'Enquiry Raised', 'Enquiry Generated', 'Deal Progressing',
  'Fixture', 'INTERESTED', 'DEAL_PROGRESS', 'CLOSED_WON',
];
const AMBER_PATTERNS = [
  'Follow Up Needed', 'Discussion', 'FOLLOW_UP', 'MEETING_SCHEDULED',
  'Busy / Call Back Later', 'Awaiting Reply', 'Relationship Maintenance',
  'Market Intelligence',
];
const RED_PATTERNS = [
  'Not Interested', 'Not Answered', 'Bounced', 'No Response',
  'NOT_INTERESTED', 'CLOSED_LOST', 'NO_RESPONSE',
];

/**
 * Returns a semantic color for any outcome string (legacy or new).
 */
export function getOutcomeBadgeColor(outcome: string | null | undefined): OutcomeBadgeColor {
  if (!outcome) return 'gray';
  for (const pattern of GREEN_PATTERNS) {
    if (outcome.includes(pattern)) return 'green';
  }
  for (const pattern of AMBER_PATTERNS) {
    if (outcome.includes(pattern)) return 'amber';
  }
  for (const pattern of RED_PATTERNS) {
    if (outcome.includes(pattern)) return 'red';
  }
  return 'gray';
}

/** Tailwind classes for outcome badge colors. */
export const OUTCOME_BADGE_STYLES: Record<OutcomeBadgeColor, string> = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
  gray: 'bg-muted text-muted-foreground',
};
