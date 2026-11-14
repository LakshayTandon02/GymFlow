import {
  Member,
  MembershipRecord,
  MemberStatus,
  PaymentRecord,
} from '../types/gym';

/**
 * Returns today's date as YYYY-MM-DD in local time.
 */
export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns YYYY-MM for the current month.
 */
export function getCurrentMonthKey(): string {
  return getTodayISO().slice(0, 7);
}

/**
 * Returns an ISO date offset by `days` from today (or from a base date).
 */
export function offsetDaysISO(days: number, baseIso?: string): string {
  const date = baseIso ? parseISODate(baseIso) : new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD safely at local midnight without UTC off-by-one drift.
 */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

/**
 * Calculates end_date from startDate + durationMonths.
 */
export function calculateExpiryDate(startDateIso: string, durationMonths: number): string {
  if (!startDateIso) return getTodayISO();
  const date = parseISODate(startDateIso);
  date.setMonth(date.getMonth() + durationMonths);
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes signed days remaining from today until endDate.
 */
export function getDaysRemaining(endDateIso: string): number {
  const today = parseISODate(getTodayISO());
  const expiry = parseISODate(endDateIso);
  const diffMs = expiry.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Finds the most recent membership record for a given member.
 */
export function getLatestMembership(
  memberId: string,
  memberships: MembershipRecord[]
): MembershipRecord | null {
  const list = memberships.filter((ms) => ms.memberId === memberId);
  if (list.length === 0) return null;
  return [...list].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
}

/**
 * Computes effective membership status based on dates, stored status, and pending payments.
 */
export function computeMemberStatus(
  member: Member,
  memberships: MembershipRecord[],
  payments: PaymentRecord[]
): MemberStatus {
  if (member.storedStatus === 'Inactive') {
    return 'Inactive';
  }

  const latest = member.latestMembership ?? getLatestMembership(member.id, memberships);
  const todayIso = getTodayISO();
  const hasPendingPayment = payments.some(
    (p) => p.memberId === member.id && p.status === 'Pending'
  );

  if (!latest) {
    return member.storedStatus === 'Pending' || hasPendingPayment ? 'Pending' : 'Inactive';
  }

  if (latest.endDate < todayIso) {
    return 'Expired';
  }

  if (hasPendingPayment || latest.startDate > todayIso) {
    return 'Pending';
  }

  return 'Active';
}

/**
 * Computes effective status of a single membership row from start_date and end_date.
 */
export function computeMembershipRowStatus(
  membership: Pick<MembershipRecord, 'startDate' | 'endDate' | 'status'>
): 'Active' | 'Expired' | 'Pending' | 'Cancelled' {
  if (membership.status === 'Cancelled') return 'Cancelled';
  const today = getTodayISO();
  if (membership.endDate < today) return 'Expired';
  if (membership.startDate > today) return 'Pending';
  return 'Active';
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateIN(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = parseISODate(iso);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTimeIN(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return '—';
  const d = new Date(isoTimestamp);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDurationMinutes(startIso: string, endIso: string | null): string {
  if (!endIso) return 'In gym';
  const mins = Math.max(
    1,
    Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  );
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function isSameLocalDay(isoTimestamp: string, targetDayIso: string): boolean {
  const d = new Date(isoTimestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}` === targetDayIso;
}

export function normalizeIndianPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  const local10 =
    digits.length > 10 && digits.startsWith('91') ? digits.slice(2, 12) : digits.slice(0, 10);
  if (local10.length !== 10) return input.trim();
  return `+91 ${local10.slice(0, 5)} ${local10.slice(5)}`;
}

export function isValidIndianPhone(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  const local10 = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local10);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'GF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
