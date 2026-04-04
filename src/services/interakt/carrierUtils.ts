/**
 * carrierUtils.ts
 *
 * Courier helpers — no longer contain hardcoded carrier list.
 * Couriers are managed dynamically via the courier_partners table.
 * Use useCourierPartners() hook + detectCourierByPrefix() / buildTrackingUrl()
 * from src/hooks/useCourierPartners.ts for dynamic lookups.
 */

/**
 * Build a tracking URL from a template.
 * Template uses {number} as the placeholder, e.g.:
 *   "https://delhivery.com/track/{number}"
 */
export const generateTrackingLink = (
  trackingNumber: string,
  trackingUrl: string | null | undefined
): string => {
  if (!trackingUrl) return '';
  return trackingUrl.replace('{number}', trackingNumber);
};

/**
 * Return the courier display name from orders.carrier.
 * Since orders.carrier now stores the display name directly, this is a
 * passthrough — kept for backward-compat call sites.
 */
export const getCourierDisplayName = (carrier: string | null | undefined): string => {
  return carrier || 'Unknown';
};

/**
 * @deprecated — prefix detection is now done via detectCourierByPrefix()
 * in useCourierPartners.ts against the user-managed courier_partners table.
 * This stub returns 'other' so legacy call sites don't crash.
 */
export const detectCourierPartner = (_trackingNumber: string): string => {
  return 'other';
};
