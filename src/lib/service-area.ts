// Where FastGet delivers, and the promise shown for it. Shared by the location
// picker, checkout and the order APIs so they can never disagree.

/** Delivery promise in minutes - every "Delivered in …" string uses this. */
export const DELIVERY_ETA_MINUTES = 60;

/** Mumbai city + suburbs pincodes: 400001–400104. */
export function isServiceablePincode(pincode: unknown): boolean {
  if (typeof pincode !== 'string' || !/^\d{6}$/.test(pincode)) return false;
  const n = Number(pincode);
  return n >= 400001 && n <= 400104;
}

// 15-char GSTIN: 2-digit state code, 10-char PAN, entity number, 'Z', checksum.
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function isValidGstin(gstin: unknown): boolean {
  return typeof gstin === 'string' && GSTIN_REGEX.test(gstin);
}

/** A 6-digit pincode from a request body, or undefined if absent/malformed. */
export function optionalPincode(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{6}$/.test(value.trim()) ? value.trim() : undefined;
}

export interface SiteDetails {
  sitePincode: string;
  siteLat?: number;
  siteLng?: number;
  gstin?: string;
  businessName?: string;
}

function coord(value: unknown, limit: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit ? value : undefined;
}

/**
 * Pulls the delivery-site extras (pincode, map pin, GST details) out of an
 * order request body. Call after validateOrderForm, which has already
 * rejected a missing/out-of-area pincode and a malformed GSTIN.
 */
export function readSiteDetails(body: Record<string, unknown>): SiteDetails {
  const lat = coord(body.siteLat, 90);
  const lng = coord(body.siteLng, 180);
  const gstin = typeof body.gstin === 'string' ? body.gstin.trim().toUpperCase() : '';
  const businessName = typeof body.businessName === 'string' ? body.businessName.trim().slice(0, 200) : '';
  return {
    sitePincode: String(body.sitePincode),
    // A pin is only kept as a pair.
    ...(lat !== undefined && lng !== undefined ? { siteLat: lat, siteLng: lng } : {}),
    ...(gstin ? { gstin, businessName: businessName || undefined } : {}),
  };
}
