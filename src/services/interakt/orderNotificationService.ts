
import { supabase } from '@/integrations/supabase/client';
import type { Order, CarrierType } from '@/types/database';
import { sendWhatsAppMessage, type InteraktMessageTemplate } from './interaktApiClient';
import { generateTrackingLink, getCourierDisplayName } from './carrierUtils';

// Send order shipped notification with tracking ID and link
export const sendOrderShippedNotification = async (order: Order, trackingNumber: string, carrier: CarrierType): Promise<boolean> => {
  try {
    console.log('🚀 === Starting WhatsApp Notification Process ===');
    console.log('📦 Order:', order.order_number);
    console.log('👤 Customer phone:', order.customer?.phone);
    console.log('🏷️ Tracking number:', trackingNumber);
    console.log('🚚 Carrier:', carrier);

    // Check if customer has phone number first
    if (!order.customer?.phone) {
      console.error('❌ Customer phone number not available for order:', order.order_number);
      return false;
    }

    // Get Interakt BSP configuration
    console.log('🔧 Fetching Interakt configuration...');
    const { data: configData, error: configError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'api_configs')
      .single();

    if (configError) {
      console.error('❌ Error fetching API configurations:', configError);
      return false;
    }

    if (!configData?.value) {
      console.error('❌ No API configurations found');
      return false;
    }

    const apiConfigs = configData.value as any;
    const interaktConfig = apiConfigs.interakt;

    if (!interaktConfig) {
      console.error('❌ Interakt BSP configuration not found in API configs');
      return false;
    }

    if (!interaktConfig.enabled) {
      console.error('❌ Interakt BSP is disabled in configuration');
      return false;
    }

    if (!interaktConfig.api_key) {
      console.error('❌ Interakt BSP API key not configured');
      return false;
    }

    if (!interaktConfig.base_url) {
      console.error('❌ Interakt BSP base URL not configured');
      return false;
    }

    console.log('✅ Interakt BSP configuration validation passed');
    console.log('🔗 Base URL:', interaktConfig.base_url);
    console.log('🔑 API Key length:', interaktConfig.api_key.length);

    // Generate tracking link and courier name
    const trackingLink = generateTrackingLink(trackingNumber, carrier);
    const courierName = getCourierDisplayName(carrier);

    // Get customer name
    const customerName = order.customer?.first_name && order.customer?.last_name 
      ? `${order.customer.first_name} ${order.customer.last_name}`
      : order.customer?.first_name || order.customer?.last_name || 'Customer';

    console.log('📋 Message preparation details:', {
      customerName,
      courierName,
      trackingLink,
      orderNumber: order.order_number,
      templateName: 'order_shipped_template',
      campaignId: '990ca66f-9714-4a97-9dda-c4d9d9bbe148'
    });

    // Prepare message template with exact parameter mapping
    // Template: "Dear {{1}} This is Black Lovers Your order 📦 has been shipped with {{2}} Courier..."
    const template: InteraktMessageTemplate = {
      templateName: 'order_shipped_template',
      parameters: [
        {
          name: '1', // {{1}} - customer name
          value: customerName
        },
        {
          name: '2', // {{2}} - courier name  
          value: courierName
        },
        {
          name: '3', // {{3}} - order number
          value: order.order_number
        },
        {
          name: '4', // {{4}} - tracking number
          value: trackingNumber
        },
        {
          name: '5', // {{5}} - courier name again
          value: courierName
        },
        {
          name: '6', // {{6}} - tracking link
          value: trackingLink
        }
      ]
    };

    console.log('🎯 Sending WhatsApp message with template:', JSON.stringify(template, null, 2));
    console.log('📱 Target phone number:', order.customer.phone);

    const success = await sendWhatsAppMessage(
      order.customer.phone,
      template,
      interaktConfig.api_key,
      interaktConfig.base_url
    );

    if (success) {
      console.log('🎉 ✅ Shipped notification sent successfully for order', order.order_number);
      console.log('📱 WhatsApp sent to:', order.customer.phone);
      console.log('👤 Customer:', customerName);
      console.log('📦 Order:', order.order_number);
      console.log('🚚 Courier:', courierName);
      console.log('🏷️ Tracking:', trackingNumber);
      console.log('🔗 Campaign ID: 990ca66f-9714-4a97-9dda-c4d9d9bbe148');
    } else {
      console.error('💥 ❌ Failed to send shipped notification for order', order.order_number);
      console.error('🔍 Check above logs for detailed error information');
    }

    return success;
  } catch (error) {
    console.error('💥 Error in sendOrderShippedNotification:', error);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
};
