import type { MemberCountry } from '../types';

const INTERNAL_AUTH_DOMAIN = '@plc-members.invalid';

/** Normalize Oman/Pakistan mobile input to E.164; explicit international numbers are preserved. */
export function normalizeMemberMobile(value: string, country: MemberCountry): string | null {
  const raw = value.trim();
  const hasInternationalPrefix = raw.startsWith('+') || raw.startsWith('00');
  let digits = raw.replace(/\D/g, '');

  if (raw.startsWith('00')) digits = digits.slice(2);
  if (hasInternationalPrefix) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  // Recognize these project countries even when the user omitted the plus sign.
  if (digits.startsWith('968') && digits.length === 11) return `+${digits}`;
  if (digits.startsWith('92') && digits.length === 12) return `+${digits}`;

  if (digits.startsWith('0')) digits = digits.slice(1);
  if (country === 'Oman' && digits.length === 8) return `+968${digits}`;
  if (country === 'Pakistan' && digits.length === 10) return `+92${digits}`;
  return null;
}

/** Firebase email/password is the auth provider; this private alias keeps the UI phone-only. */
export function memberAuthEmailFromMobile(value: string, country: MemberCountry): string | null {
  const normalized = normalizeMemberMobile(value, country);
  return normalized ? memberAuthEmailFromE164(normalized) : null;
}

export function memberAuthEmailFromE164(value: string): string {
  const digits = value.replace(/\D/g, '');
  return `m${digits}${INTERNAL_AUTH_DOMAIN}`;
}

export function isInternalMemberAuthEmail(value: string | null | undefined): boolean {
  return Boolean(value?.toLowerCase().endsWith(INTERNAL_AUTH_DOMAIN));
}
