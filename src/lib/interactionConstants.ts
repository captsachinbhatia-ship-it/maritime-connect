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

export const OUTCOME_OPTIONS = [
  { value: 'INTERESTED', label: 'Positive', icon: '✅' },
  { value: 'NO_RESPONSE', label: 'No Response', icon: '🔇' },
  { value: 'NOT_INTERESTED', label: 'Not Interested', icon: '❌' },
  { value: 'FOLLOW_UP', label: 'Follow-up Needed', icon: '🔔' },
  { value: 'MEETING_SCHEDULED', label: 'Meeting Scheduled', icon: '📅' },
  { value: 'DEAL_PROGRESS', label: 'Deal Progress', icon: '📈' },
  { value: 'CLOSED_WON', label: 'Closed Won', icon: '🎉' },
  { value: 'CLOSED_LOST', label: 'Closed Lost', icon: '📉' },
];
