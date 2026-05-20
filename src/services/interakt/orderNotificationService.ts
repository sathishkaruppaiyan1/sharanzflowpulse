
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/types/database';
import { sendWhatsAppMessage, type InteraktMessageTemplate } from './interaktApiClient';

/**
 * Send WhatsApp shipped notification.
 * @param courierName  Display name of the courier (e.g. "Delhivery")
 * @param trackingUrl  Full tracking URL (already built with tracking number substituted)
 */
export const sendOrderShippedNotification = async (
  order: Order,
  trackingNumber: string,
  courierName: string,
  trackingUrl: string
): Promise<boolean> => {
  try {
    console.log('🚀 === Starting WhatsApp Notification Process ===');
    console.log('📦 Order:', order.order_number);
    console.log('👤 Customer phone:', order.customer?.phone);
    console.log('🏷️ Tracking number:', trackingNumber);
    console.log('🚚 Carrier:', courierName);

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

    const trackingTemplateName = (interaktConfig.tracking_template_name || '').trim();
    if (!trackingTemplateName) {
      console.error('❌ No tracking notification template configured. Set it in Settings → API Configuration → Interakt → Tracking Notification Template.');
      return false;
    }

    const languageCode = (interaktConfig.language_code || 'en').trim();

    console.log('✅ Interakt BSP configuration validation passed');
    console.log('🔗 Base URL:', interaktConfig.base_url);
    console.log('🔑 API Key length:', interaktConfig.api_key.length);
    console.log('📝 Configured tracking template:', trackingTemplateName, 'language:', languageCode);

    // trackingUrl and courierName are passed in directly from caller
    const trackingLink = trackingUrl || '';

    // Get customer name
    const customerName = order.customer?.first_name && order.customer?.last_name
      ? `${order.customer.first_name} ${order.customer.last_name}`
      : order.customer?.first_name || order.customer?.last_name || 'Customer';

    console.log('📋 Message preparation details:', {
      customerName,
      courierName,
      trackingLink,
      orderNumber: order.order_number,
      templateName: trackingTemplateName,
      languageCode
    });

    // Placeholders sent to Interakt (positional):
    // {{1}} Customer name (greeting), {{2}} Order ID, {{3}} Tracking ID, {{4}} Courier name
    const template: InteraktMessageTemplate = {
      templateName: trackingTemplateName,
      languageCode,
      parameters: [
        {
          name: '1', // {{1}} - Customer name (greeting)
          value: customerName
        },
        {
          name: '2', // {{2}} - Order ID
          value: order.order_number
        },
        {
          name: '3', // {{3}} - Tracking ID
          value: trackingNumber
        },
        {
          name: '4', // {{4}} - Courier name
          value: courierName
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
      console.log('📋 Template: order_tracking_information');
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
