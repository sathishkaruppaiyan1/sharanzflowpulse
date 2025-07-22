
import { formatPhoneForInterakt } from './phoneUtils';

export interface InteraktMessageTemplate {
  templateName: string;
  parameters: Array<{
    name: string;
    value: string;
  }>;
}

// Send WhatsApp message via Interakt BSP API
export const sendWhatsAppMessage = async (
  phoneNumber: string, 
  template: InteraktMessageTemplate,
  apiKey: string,
  baseUrl: string
): Promise<boolean> => {
  try {
    console.log('=== Interakt BSP API Call Debug ===');
    
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
    
    // Format phone number for Interakt
    const formattedPhone = formatPhoneForInterakt(phoneNumber);
    
    if (!formattedPhone) {
      console.error('Failed to format phone number');
      return false;
    }
    
    console.log('Interakt BSP API Request Debug:', {
      url: `${baseUrl}/api/v1/public/message/`,
      originalPhone: phoneNumber,
      formattedPhone: formattedPhone,
      templateName: template.templateName,
      parameterCount: template.parameters.length,
      parameters: template.parameters,
      hasApiKey: !!cleanApiKey,
      apiKeyLength: cleanApiKey.length
    });

    // Interakt BSP API request body format with proper parameter mapping
    const requestBody = {
      fullPhoneNumber: formattedPhone,
      callbackData: template.templateName,
      type: "Template",
      template: {
        name: template.templateName,
        languageCode: "en",
        headerValues: [],
        bodyValues: template.parameters.map(param => param.value), // Map parameter values in order
        buttonValues: {}
      }
    };

    console.log('Interakt BSP Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('Template Parameters Mapping:', template.parameters.map((param, index) => ({
      position: index + 1,
      placeholder: `{{${param.name}}}`,
      value: param.value
    })));

    const response = await fetch(`${baseUrl}/api/v1/public/message/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${cleanApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('Interakt BSP API Response Status:', response.status);
    console.log('Interakt BSP API Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Interakt BSP API Response Text:', responseText);

    if (!response.ok) {
      console.error('Interakt BSP API HTTP Error:', {
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
      console.error('Failed to parse Interakt BSP response as JSON:', parseError);
      console.log('Raw response that failed to parse:', responseText);
      
      // Sometimes API returns success without JSON
      if (response.status === 200 || response.status === 201) {
        console.log('HTTP 200/201 received, treating as success despite parse error');
        return true;
      }
      return false;
    }

    console.log('Interakt BSP API Response Parsed:', result);

    // Check various success indicators
    if (result.result === false || result.success === false) {
      console.error('Interakt BSP API returned failure:', result.message || result.error || 'Unknown error');
      return false;
    }

    // Consider it successful if no explicit failure
    console.log('✅ Interakt BSP message sent successfully');
    console.log('📋 Template used: order_shipped_template');
    console.log('🎯 Campaign ID: 990ca66f-9714-4a97-9dda-c4d9d9bbe148');
    return true;
    
  } catch (error) {
    console.error('Error sending Interakt BSP message:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
};
