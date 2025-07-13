
import { supabase } from '@/integrations/supabase/client';
import type { Order, CarrierType } from '@/types/database';
import { sendWhatsAppMessage, type WatiMessageTemplate } from './watiApiClient';
import { generateTrackingLink, getCourierDisplayName } from './carrierUtils';

// Send order shipped notification with tracking ID and link
export const sendOrderShippedNotification = async (order: Order, trackingNumber: string, carrier: CarrierType): Promise<boolean> => {
  try {
    console.log('=== Starting WhatsApp Notification Process ===');
    console.log('Order:', order.order_number);
    console.log('Customer phone:', order.customer?.phone);
    console.log('Tracking number:', trackingNumber);
    console.log('Carrier:', carrier);

    // Check if customer has phone number first
    if (!order.customer?.phone) {
      console.error('Customer phone number not available for order:', order.order_number);
      return false;
    }

    // Get WATI configuration
    const { data: configData, error: configError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'api_configs')
      .single();

    if (configError) {
      console.error('Error fetching API configurations:', configError);
      return false;
    }

    if (!configData?.value) {
      console.error('No API configurations found');
      return false;
    }

    const apiConfigs = configData.value as any;
    const watiConfig = apiConfigs.wati;

    if (!watiConfig) {
      console.error('WATI configuration not found in API configs');
      return false;
    }

    if (!watiConfig.enabled) {
      console.error('WATI is disabled in configuration');
      return false;
    }

    if (!watiConfig.api_key) {
      console.error('WATI API key not configured');
      return false;
    }

    if (!watiConfig.base_url) {
      console.error('WATI base URL not configured');
      return false;
    }

    console.log('WATI configuration validation passed');

    // Generate tracking link and courier name
    const trackingLink = generateTrackingLink(trackingNumber, carrier);
    const courierName = getCourierDisplayName(carrier);

    console.log('Message details:', {
      courierName,
      trackingLink,
      orderNumber: order.order_number
    });

    // Prepare message template
    const template: WatiMessageTemplate = {
      templateName: 'order_shipped_template',
      parameters: [
        {
          name: 'courier_name',
          value: courierName
        },
        {
          name: 'order_id',
          value: order.order_number
        },
        {
          name: 'tracking_number',
          value: trackingNumber
        },
        {
          name: 'tracking_link',
          value: trackingLink
        }
      ]
    };

    console.log('Sending WhatsApp message with template:', JSON.stringify(template, null, 2));

    const success = await sendWhatsAppMessage(
      order.customer.phone,
      template,
      watiConfig.api_key,
      watiConfig.base_url
    );

    if (success) {
      console.log(`✅ Shipped notification sent successfully for order ${order.order_number}`);
    } else {
      console.error(`❌ Failed to send shipped notification for order ${order.order_number}`);
    }

    return success;
  } catch (error) {
    console.error('Error in sendOrderShippedNotification:', error);
    return false;
  }
};
