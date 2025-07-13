
// Main WATI service - re-export all functionality for backward compatibility
export { formatPhoneForWati } from './wati/phoneUtils';
export { 
  detectCourierPartner, 
  generateTrackingLink, 
  getCourierDisplayName 
} from './wati/carrierUtils';
export { 
  sendWhatsAppMessage, 
  type WatiMessageTemplate 
} from './wati/watiApiClient';
export { sendOrderShippedNotification } from './wati/orderNotificationService';

// Backward compatibility - main service object
export const watiService = {
  sendWhatsAppMessage: async (
    phoneNumber: string, 
    template: import('./wati/watiApiClient').WatiMessageTemplate,
    apiKey: string,
    baseUrl: string
  ) => {
    const { sendWhatsAppMessage } = await import('./wati/watiApiClient');
    return sendWhatsAppMessage(phoneNumber, template, apiKey, baseUrl);
  },
  
  sendOrderShippedNotification: async (
    order: import('@/types/database').Order, 
    trackingNumber: string, 
    carrier: import('@/types/database').CarrierType
  ) => {
    const { sendOrderShippedNotification } = await import('./wati/orderNotificationService');
    return sendOrderShippedNotification(order, trackingNumber, carrier);
  }
};
