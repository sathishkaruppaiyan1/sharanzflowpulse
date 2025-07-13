
import { formatPhoneForWati } from './phoneUtils';

export interface WatiMessageTemplate {
  templateName: string;
  parameters: Array<{
    name: string;
    value: string;
  }>;
}

// Send WhatsApp message via WATI API
export const sendWhatsAppMessage = async (
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
};
