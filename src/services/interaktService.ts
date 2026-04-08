
// Main Interakt BSP service - re-export all functionality for backward compatibility
export { formatPhoneForInterakt } from './interakt/phoneUtils';
export { 
  detectCourierPartner, 
  generateTrackingLink, 
  getCourierDisplayName 
} from './interakt/carrierUtils';
export { 
  sendWhatsAppMessage, 
  type InteraktMessageTemplate 
} from './interakt/interaktApiClient';
export { sendOrderShippedNotification } from './interakt/orderNotificationService';

// Backward compatibility - main service object
export const interaktService = {
  sendWhatsAppMessage: async (
    phoneNumber: string, 
    template: import('./interakt/interaktApiClient').InteraktMessageTemplate,
    apiKey: string,
    baseUrl: string
  ) => {
    const { sendWhatsAppMessage } = await import('./interakt/interaktApiClient');
    return sendWhatsAppMessage(phoneNumber, template, apiKey, baseUrl);
  },
  
  sendOrderShippedNotification: async (
    order: import('@/types/database').Order, 
    trackingNumber: string, 
    carrier: string,
    trackingUrl: string = ''
  ) => {
    const { sendOrderShippedNotification } = await import('./interakt/orderNotificationService');
    return sendOrderShippedNotification(order, trackingNumber, carrier, trackingUrl);
  }
};
