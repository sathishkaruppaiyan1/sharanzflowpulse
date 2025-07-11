
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

      // Get courier partner display name
      const courierName = carrier === 'frenchexpress' ? 'French Express' : 
                         carrier === 'delhivery' ? 'Delhivery' : 
                         'Other';

      // Prepare message template for shipped notification
      const template: WatiMessageTemplate = {
        templateName: 'order_shipped', // You need to create this template in WATI
        parameters: [
          {
            name: 'customer_name',
            value: `${order.customer.first_name} ${order.customer.last_name}`.trim()
          },
          {
            name: 'order_number',
            value: order.order_number
          },
          {
            name: 'tracking_number',
            value: trackingNumber
          },
          {
            name: 'courier_name',
            value: courierName
          },
          {
            name: 'tracking_link',
            value: trackingLink
          },
          {
            name: 'total_amount',
            value: `₹${order.total_amount}`
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
        console.log(`Tracking link: ${trackingLink}`);
      }

      return success;
    } catch (error) {
      console.error('Error in sendOrderShippedNotification:', error);
      return false;
    }
  }
};
