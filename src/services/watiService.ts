
import { supabase } from '@/integrations/supabase/client';
import type { Order, CarrierType } from '@/types/database';

export interface WatiMessageTemplate {
  templateName: string;
  parameters: Array<{
    name: string;
    value: string;
  }>;
}

// Function to detect courier partner based on tracking number
export const detectCourierPartner = (trackingNumber: string): CarrierType => {
  if (trackingNumber.startsWith('4804')) {
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
      return `https://frenchexpress.in/track/${trackingNumber}`;
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
      return 'FRENCH EXPRESS';
    case 'delhivery':
      return 'DELHIVERY';
    default:
      return 'OTHER';
  }
};

export const watiService = {
  // Send WhatsApp message via WATI API
  sendWhatsAppMessage: async (
    phoneNumber: string, 
    template: WatiMessageTemplate,
    apiKey: string,
    baseUrl: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${baseUrl}/api/v1/sendTemplateMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whatsappNumber: phoneNumber.replace(/[^\d]/g, ''), // Remove non-digits
          templateName: template.templateName,
          parameters: template.parameters
        }),
      });

      if (!response.ok) {
        console.error('WATI API error:', await response.text());
        return false;
      }

      const result = await response.json();
      console.log('WATI message sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending WATI message:', error);
      return false;
    }
  },

  // Send order shipped notification with tracking ID and link
  sendOrderShippedNotification: async (order: Order, trackingNumber: string, carrier: CarrierType): Promise<boolean> => {
    try {
      // Get WATI configuration
      const { data: configData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'api_configs')
        .single();

      if (!configData?.value) {
        console.error('No API configurations found');
        return false;
      }

      const apiConfigs = configData.value as any;
      const watiConfig = apiConfigs.wati;

      if (!watiConfig?.enabled || !watiConfig.api_key) {
        console.error('WATI not configured or disabled');
        return false;
      }

      // Check if customer has phone number
      if (!order.customer?.phone) {
        console.error('Customer phone number not available');
        return false;
      }

      // Generate tracking link
      const trackingLink = generateTrackingLink(trackingNumber, carrier);
      const courierName = getCourierDisplayName(carrier);

      // Create the message text matching your template
      const messageText = `Your order 📦 has been shipped with ${courierName} Courier.

Your order ID : ${order.order_number}
Tracking Number: ${trackingNumber}
Courier name : ${courierName}

Tracking link: ${trackingLink}

Please track your order status regularly using this link ☝

Delivery in 5-7 working days

If you don't receive your parcel within 7 working days, kindly inform us immediately.`;

      // Prepare message template for shipped notification
      const template: WatiMessageTemplate = {
        templateName: 'order_shipped_template', // You need to create this template in WATI
        parameters: [
          {
            name: 'message_text',
            value: messageText
          }
        ]
      };

      const success = await watiService.sendWhatsAppMessage(
        order.customer.phone,
        template,
        watiConfig.api_key,
        watiConfig.base_url
      );

      if (success) {
        console.log(`Shipped notification sent successfully for order ${order.order_number} via ${courierName}`);
        console.log(`Message: ${messageText}`);
      }

      return success;
    } catch (error) {
      console.error('Error in sendOrderShippedNotification:', error);
      return false;
    }
  }
};
