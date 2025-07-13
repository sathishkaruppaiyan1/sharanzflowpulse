
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
  
  // For Indian numbers starting with 6-9 and having 10 digits, add 91 prefix
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    const formatted = `91${digits}`;
    console.log('Formatted 10-digit Indian number:', formatted);
    return formatted;
  }
  
  // If it already has 91 prefix and is 12 digits, use as is
  if (digits.length === 12 && digits.startsWith('91')) {
    console.log('Already has 91 prefix:', digits);
    return digits;
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
      console.log('=== WATI API Call Debug ===');
      
      // Validate inputs
      if (!phoneNumber || phoneNumber.trim() === '') {
        console.error('Phone number is empty or null');
        return false;
      }
      
      if (!template.templateName) {
        console.error('Template name is empty');
        return false;
      }
      
      // Clean the API key - remove 'Bearer ' prefix if it exists
      const cleanApiKey = apiKey.replace(/^Bearer\s+/i, '');
      
      // Format phone number for WATI
      const formattedPhone = formatPhoneForWati(phoneNumber);
      
      if (!formattedPhone) {
        console.error('Failed to format phone number');
        return false;
      }
      
      console.log('WATI API Request Debug:', {
        url: `${baseUrl}/api/v1/sendTemplateMessage`,
        originalPhone: phoneNumber,
        formattedPhone: formattedPhone,
        templateName: template.templateName,
        parameterCount: template.parameters.length,
        hasApiKey: !!cleanApiKey,
        apiKeyLength: cleanApiKey.length
      });

      // WATI API request body - try different format based on WATI docs
      const requestBody = {
        whatsappNumber: formattedPhone,
        templateName: template.templateName,
        bodyParameters: template.parameters.map(param => ({
          name: param.name,
          value: param.value
        }))
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
      console.log('WATI API Response Headers:', Object.fromEntries(response.headers.entries()));
      console.log('WATI API Response Text:', responseText);

      if (!response.ok) {
        console.error('WATI API HTTP Error:', {
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
        console.log('Raw response that failed to parse:', responseText);
        
        // Sometimes WATI returns success without JSON
        if (response.status === 200 || response.status === 201) {
          console.log('HTTP 200/201 received, treating as success despite parse error');
          return true;
        }
        return false;
      }

      console.log('WATI API Response Parsed:', result);

      // Check various success indicators
      if (result.result === false) {
        console.error('WATI API returned failure:', result.info || result.message || 'Unknown error');
        return false;
      }

      // Consider it successful if no explicit failure
      console.log('WATI message sent successfully');
      return true;
      
    } catch (error) {
      console.error('Error sending WATI message:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return false;
    }
  },

  // Send order shipped notification with tracking ID and link
  sendOrderShippedNotification: async (order: Order, trackingNumber: string, carrier: CarrierType): Promise<boolean> => {
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

      const success = await watiService.sendWhatsAppMessage(
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
  }
};
