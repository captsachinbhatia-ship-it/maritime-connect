/**
 * Duplicate Detection Utilities
 * Provides phone normalization and similarity matching for contact deduplication
 */

// Normalize phone to digits only
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Get last N digits from a phone number
export function getLastNDigits(phone: string, n: number): string | null {
  const digits = normalizePhone(phone);
  if (digits.length < n) return null;
  return digits.slice(-n);
}

// Generate all 4-digit substrings from a phone number (sliding window)
export function getAll4Substrings(phone: string): string[] {
  const digits = normalizePhone(phone);
  if (digits.length < 4) return [];
  
  const substrings: string[] = [];
  for (let i = 0; i <= digits.length - 4; i++) {
    substrings.push(digits.slice(i, i + 4));
  }
  return substrings;
}

// Check if two phone numbers have a high-confidence match (last 6 digits)
export function isHighPhoneMatch(inputPhone: string, existingPhone: string): boolean {
  const inputDigits = normalizePhone(inputPhone);
  const existingDigits = normalizePhone(existingPhone);
  
  const inputLast6 = getLastNDigits(inputPhone, 6);
  const existingLast6 = getLastNDigits(existingPhone, 6);
  
  if (!inputLast6 || !existingLast6) return false;
  
  // High match: input's last 6 in existing OR existing's last 6 in input
  return existingDigits.includes(inputLast6) || inputDigits.includes(existingLast6);
}

// Check if two phone numbers have a low-confidence match (ANY 4 digits)
export function isLowPhoneMatch(inputPhone: string, existingPhone: string): boolean {
  const inputSubstrings = getAll4Substrings(inputPhone);
  const existingDigits = normalizePhone(existingPhone);
  
  if (inputSubstrings.length === 0 || existingDigits.length < 4) return false;
  
  // Check if ANY 4-digit substring from input exists in existing phone
  return inputSubstrings.some(sub => existingDigits.includes(sub));
}

// Check name similarity (case-insensitive contains + token overlap)
export function isNameSimilar(inputName: string, existingName: string): boolean {
  const inputLower = inputName.toLowerCase().trim();
  const existingLower = existingName.toLowerCase().trim();
  
  if (!inputLower || !existingLower) return false;
  
  // Direct contains match
  if (existingLower.includes(inputLower) || inputLower.includes(existingLower)) {
    return true;
  }
  
  // Token overlap - split by spaces and check for matching parts
  const inputTokens = inputLower.split(/\s+/).filter(t => t.length > 2);
  const existingTokens = existingLower.split(/\s+/).filter(t => t.length > 2);
  
  if (inputTokens.length === 0 || existingTokens.length === 0) return false;
  
  // Check if any significant token matches
  const matchingTokens = inputTokens.filter(token => 
    existingTokens.some(et => et === token || et.includes(token) || token.includes(et))
  );
  
  // Consider similar if at least one token matches and it's significant
  return matchingTokens.length > 0;
}

// Check email similarity (same domain + similar local part)
export function isEmailSimilar(inputEmail: string, existingEmail: string): boolean {
  const inputLower = inputEmail.toLowerCase().trim();
  const existingLower = existingEmail.toLowerCase().trim();
  
  if (!inputLower || !existingLower) return false;
  
  // Exact match
  if (inputLower === existingLower) return true;
  
  const [inputLocal, inputDomain] = inputLower.split('@');
  const [existingLocal, existingDomain] = existingLower.split('@');
  
  if (!inputDomain || !existingDomain) return false;
  
  // Same domain check
  if (inputDomain !== existingDomain) return false;
  
  // Similar local part (contains/starts-with)
  if (inputLocal && existingLocal) {
    return (
      existingLocal.startsWith(inputLocal) ||
      inputLocal.startsWith(existingLocal) ||
      existingLocal.includes(inputLocal) ||
      inputLocal.includes(existingLocal)
    );
  }
  
  return false;
}

// Mask sensitive data for display
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '****';
  return `****${phone.slice(-4)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '****@****';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}
