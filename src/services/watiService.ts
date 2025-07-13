
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

// Function to format phone number for WATI
const formatPhoneForWati = (phoneNumber: string): string => {
  // Remove all non-digits
  const digits = phoneNumber.replace(/[^\d]/g, '');
  
  console.log('Phone formatting debug:', {
    original: phoneNumber,
    digitsOnly: digits,
    length: digits.length
  });
  
  // For WATI API, we need the format: 919994901826 (without + sign)
  // If it's an Indian number without country code, add 91
  if (digits.length === 10 && digits.match(/^[6-9]/)) {
    const formatted = `91${digits}`;
    console.log('Formatted 10-digit Indian number:', formatted);
    return formatted;
  }
  
  // If it already has 91 prefix and is 12 digits, use as is
  if (digits.length === 12 && digits.startsWith('91')) {
    console.log('Already has 91 prefix:', digits);
    return digits;
  }
  
  // If it has 13 digits and starts with 91, remove the leading digit
  if (digits.length === 13 && digits.startsWith('91')) {
    const formatted = digits.substring(1);
    console.log('Removed leading digit from 13-digit number:', formatted);
    return formatted;
  }
  
  // If original has + sign, remove it
  if (phoneNumber.startsWith('+')) {
    const cleanNumber = phoneNumber.substring(1);
    console.log('Removed + sign:', cleanNumber);
    return cleanNumber;
  }
  
  // Otherwise return digits only
  console.log('Returning digits as is:', digits);
  return digits;
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
      // Clean the API key - remove 'Bearer ' prefix if it exists
      const cleanApiKey = apiKey.replace(/^Bearer\s+/i, '');
      
      // Format phone number for WATI
      const formattedPhone = formatPhoneForWati(phoneNumber);
      
      console.log('WATI API Request:', {
        url: `${baseUrl}/api/v1/sendTemplateMessage`,
        originalPhone: phoneNumber,
        formattedPhone: formattedPhone,
        templateName: template.templateName,
        parameters: template.parameters,
        hasApiKey: !!cleanApiKey,
        apiKeyPrefix: cleanApiKey.substring(0, 10) + '...'
      });

      // WATI API expects specific format for template messages
      const requestBody = {
        whatsappNumber: formattedPhone,
        templateName: template.templateName,
        bodyParameters: template.parameters.map(param => param.value)
      };

      console.log('WATI Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${baseUrl}/api/v1/sendTemplateMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('WATI API Response Status:', response.status);
      console.log('WATI API Response Text:', responseText);

      if (!response.ok) {
        console.error('WATI API error:', {
          status: response.status,
          statusText: response.statusText,
          response: responseText
        });
        return false;
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse WATI response as JSON:', parseError);
        console.log('Raw response:', responseText);
        return false;
      }

      console.log('WATI API Response Parsed:', result);

      // Check if the message was actually sent successfully
      if (result.result === false) {
        console.error('WATI API returned failure:', result.info || 'Unknown error');
        return false;
      }

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
      console.log('Starting WhatsApp notification process for order:', order.order_number);

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

      console.log('API configurations retrieved:', configData.value);

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

      console.log('WATI configuration valid:', {
        enabled: watiConfig.enabled,
        hasApiKey: !!watiConfig.api_key,
        baseUrl: watiConfig.base_url
      });

      // Check if customer has phone number
      if (!order.customer?.phone) {
        console.error('Customer phone number not available for order:', order.order_number);
        return false;
      }

      console.log('Customer phone number found:', order.customer.phone);

      // Generate tracking link
      const trackingLink = generateTrackingLink(trackingNumber, carrier);
      const courierName = getCourierDisplayName(carrier);

      console.log('Tracking details:', {
        trackingNumber,
        carrier,
        courierName,
        trackingLink
      });

      // Prepare message template for shipped notification with individual parameters
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

      console.log('Sending WhatsApp message with template:', template);

      const success = await watiService.sendWhatsAppMessage(
        order.customer.phone,
        template,
        watiConfig.api_key,
        watiConfig.base_url
      );

      if (success) {
        console.log(`Shipped notification sent successfully for order ${order.order_number} via ${courierName}`);
        console.log(`Tracking link: ${trackingLink}`);
      } else {
        console.error(`Failed to send shipped notification for order ${order.order_number}`);
      }

      return success;
    } catch (error) {
      console.error('Error in sendOrderShippedNotification:', error);
      return false;
    }
  }
};
