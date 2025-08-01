
import type { CarrierType } from '@/types/database';

// Function to detect courier partner based on tracking number
export const detectCourierPartner = (trackingNumber: string): CarrierType => {
  if (trackingNumber.startsWith('48')) {
    return 'frenchexpress';
  } else if (trackingNumber.startsWith('2158')) {
    return 'delhivery';
  }
  return 'other';
};

// Function to generate tracking link based on courier partner
export const generateTrackingLink = (trackingNumber: string, carrier: CarrierType): string => {
  switch (carrier) {
    case 'frenchexpress':
      return `https://franchexpress.com/courier-tracking/${trackingNumber}`;
    case 'delhivery':
      return `https://www.delhivery.com/track/package/${trackingNumber}`;
    default:
      return '';
  }
};

// Function to get courier display name
export const getCourierDisplayName = (carrier: CarrierType): string => {
  switch (carrier) {
    case 'frenchexpress':
      return 'FRANCH EXPRESS';
    case 'delhivery':
      return 'DELHIVERY';
    default:
      return 'OTHER';
  }
};
