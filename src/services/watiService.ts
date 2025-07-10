
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/types/database';

export interface WatiMessageTemplate {
  templateName: string;
  parameters: Array<{
    name: string;
    value: string;
  }>;
}

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

  // Send order packed notification
  sendOrderPackedNotification: async (order: Order): Promise<boolean> => {
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

      // Prepare message template
      const template: WatiMessageTemplate = {
        templateName: 'order_packed', // You need to create this template in WATI
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
            name: 'total_amount',
            value: `₹${order.total_amount}`
          }
        ]
      };

      return await watiService.sendWhatsAppMessage(
        order.customer.phone,
        template,
        watiConfig.api_key,
        watiConfig.base_url
      );
    } catch (error) {
      console.error('Error in sendOrderPackedNotification:', error);
      return false;
    }
  }
};
