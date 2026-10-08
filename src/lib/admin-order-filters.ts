// Shared parsing of the admin order filters (?status=&payment=&q=&dateFrom=&dateTo=)
// so the Orders page and the CSV export always select exactly the same orders.

import type { OrderStatus, PaymentMethod } from '@/types';
import type { AdminOrderFilters } from '@/lib/db';

export const ADMIN_ORDER_STATUSES: OrderStatus[] = [
  'received',
  'eta_assigned',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  return DATE_PATTERN.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function read(params: ParamSource, key: string): string {
  if (params instanceof URLSearchParams) return params.get(key) ?? '';
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/**
 * Parse filters from the URL. Unknown status/payment values are rejected with
 * an error message rather than silently ignored, so an export never quietly
 * contains different orders than the admin asked for.
 */
export function parseAdminOrderFilters(
  params: ParamSource,
): { filters: AdminOrderFilters; error?: undefined } | { filters?: undefined; error: string } {
  const filters: AdminOrderFilters = {};

  const status = read(params, 'status');
  if (status && status !== 'all') {
    if (!ADMIN_ORDER_STATUSES.includes(status as OrderStatus)) {
      return { error: `status must be "all" or one of: ${ADMIN_ORDER_STATUSES.join(', ')}.` };
    }
    filters.status = status as OrderStatus;
  }

  const payment = read(params, 'payment');
  if (payment && payment !== 'all') {
    if (payment !== 'cod' && payment !== 'razorpay') {
      return { error: 'payment must be "all", "cod", or "razorpay".' };
    }
    filters.payment = payment as PaymentMethod;
  }

  const q = read(params, 'q').trim().slice(0, 100);
  if (q) filters.q = q;

  const dateFrom = read(params, 'dateFrom');
  if (dateFrom) {
    if (!isValidDate(dateFrom)) return { error: 'dateFrom must be a date in YYYY-MM-DD format.' };
    filters.dateFrom = dateFrom;
  }

  const dateTo = read(params, 'dateTo');
  if (dateTo) {
    if (!isValidDate(dateTo)) return { error: 'dateTo must be a date in YYYY-MM-DD format.' };
    filters.dateTo = dateTo;
  }

  return { filters };
}

/** Build the query string for a set of filters (empty values omitted). */
export function adminOrderFiltersToQuery(filters: AdminOrderFilters & { page?: number }): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.payment) params.set('payment', filters.payment);
  if (filters.q) params.set('q', filters.q);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  return params.toString();
}

/** Today's date (YYYY-MM-DD) in India time. */
export function todayInIndia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** The date `days` days before today (YYYY-MM-DD), India time. */
export function daysAgoInIndia(days: number): string {
  const d = new Date(`${todayInIndia()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
