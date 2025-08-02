
import { useApiConfigs } from '@/hooks/useApiConfigs';
import { supabase } from '@/integrations/supabase/client';

export interface ParcelPanelTrackingEvent {
  time: string;
  description: string;
  location?: string;
  status?: string;
}

export interface ParcelPanelTrackingInfo {
  tracking_number: string;
  courier_code: string;
  courier_name: string;
  status: string;
  sub_status?: string;
  origin_country?: string;
  destination_country?: string;
  tracking_events: ParcelPanelTrackingEvent[];
  estimated_delivery_date?: string;
  delivered_at?: string;
  shipped_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ParcelPanelOrderInfo {
  id: string;
  order_number: string;
  tracking_number?: string;
  courier_code?: string;
  courier_name?: string;
  status: string;
  sub_status?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: {
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
  total_amount?: number;
  currency?: string;
  created_at: string;
  updated_at: string;
  shipped_at?: string;
  delivered_at?: string;
  tracking_info?: ParcelPanelTrackingInfo;
}

export interface ParcelPanelResponse {
  code: number;
  message: string;
  data: ParcelPanelTrackingInfo | null;
}

export interface ParcelPanelOrdersResponse {
  code: number;
  message: string;
  data: {
    orders: ParcelPanelOrderInfo[];
    total: number;
    page: number;
    limit: number;
  } | null;
}

export class ParcelPanelService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://open.parcelpanel.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    console.log('ParcelPanelService initialized with:', { baseUrl, apiKeyExists: Boolean(apiKey) });
  }

  private getHeaders() {
    return {
      'x-parcelpanel-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Testing Parcel Panel API connection...');
      console.log('API Key exists:', Boolean(this.apiKey));
      console.log('Base URL:', this.baseUrl);
      
      if (!this.apiKey) {
        return {
          success: false,
          message: 'API key is missing'
        };
      }

      // Test with the tracking order endpoint using GET method
      const response = await fetch(`${this.baseUrl}/api/v2/tracking/order`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        return {
          success: false,
          message: `API Error: ${response.status} - ${response.statusText}`
        };
      }

      console.log('Parcel Panel API connection successful');
      
      return {
        success: true,
        message: 'API connection successful'
      };
    } catch (error) {
      console.error('Error testing Parcel Panel API connection:', error);
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // New method to fetch tracking details by order number
  async fetchTrackingByOrderNumber(orderNumber: string): Promise<ParcelPanelResponse> {
    try {
      console.log(`Fetching tracking details for order: ${orderNumber}`);
      
      const requestBody = {
        order_number: orderNumber
      };

      const response = await fetch(`${this.baseUrl}/api/v2/tracking/order`, {
        method: 'GET',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      console.log('Fetch tracking response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch tracking error response:', errorText);
        throw new Error(`Parcel Panel API Error: ${response.status} - ${response.statusText}`);
      }

      const data: ParcelPanelResponse = await response.json();
      console.log('Parcel Panel tracking response:', data);

      return data;
    } catch (error) {
      console.error('Error fetching tracking by order number:', error);
      throw error;
    }
  }

  async fetchOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ParcelPanelOrdersResponse> {
    try {
      console.log('Fetching orders from Parcel Panel API...');
      
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.status) queryParams.append('status', params.status);

      // Use the orders endpoint for fetching orders (not tracking list)
      const url = `${this.baseUrl}/api/v2/orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      console.log('Full URL being called:', url);
      console.log('Query parameters:', queryParams.toString());
      
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      console.log('Fetch orders response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch orders error response:', errorText);
        throw new Error(`Parcel Panel API Error: ${response.status} - ${response.statusText}`);
      }

      const data: ParcelPanelOrdersResponse = await response.json();
      console.log('Parcel Panel orders response:', data);
      console.log('Response structure check:', {
        hasCode: 'code' in data,
        hasMessage: 'message' in data,
        hasData: 'data' in data,
        dataType: typeof data.data,
        hasOrders: data.data && 'orders' in data.data,
        ordersLength: data.data?.orders?.length
      });

      return data;
    } catch (error) {
      console.error('Error fetching orders from Parcel Panel:', error);
      throw error;
    }
  }

  async trackPackage(trackingNumber: string, courierCode?: string): Promise<ParcelPanelResponse> {
    try {
      console.log(`Tracking package: ${trackingNumber} with courier: ${courierCode || 'auto-detect'}`);
      
      const requestBody: any = {
        tracking_number: trackingNumber.trim(),
      };

      if (courierCode) {
        requestBody.courier_code = courierCode;
      }

      const response = await fetch(`${this.baseUrl}/api/v2/tracking/track`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Parcel Panel API Error: ${response.status} - ${response.statusText}`);
      }

      const data: ParcelPanelResponse = await response.json();
      console.log('Parcel Panel response:', data);

      return data;
    } catch (error) {
      console.error('Error tracking package with Parcel Panel:', error);
      throw error;
    }
  }

  async trackMultiplePackages(trackingNumbers: string[]): Promise<ParcelPanelResponse[]> {
    try {
      console.log(`Tracking multiple packages: ${trackingNumbers.join(', ')}`);
      
      const requests = trackingNumbers.map(trackingNumber => 
        this.trackPackage(trackingNumber)
      );

      const results = await Promise.allSettled(requests);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Failed to track ${trackingNumbers[index]}:`, result.reason);
          return {
            code: 500,
            message: `Failed to track ${trackingNumbers[index]}: ${result.reason.message}`,
            data: null
          };
        }
      });
    } catch (error) {
      console.error('Error tracking multiple packages:', error);
      throw error;
    }
  }

  async getSupportedCouriers(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/couriers`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Parcel Panel API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching supported couriers:', error);
      throw error;
    }
  }

  // Add the missing fetchAndStoreTrackingDetails method
  async fetchAndStoreTrackingDetails(trackingNumber: string, orderId: string): Promise<void> {
    try {
      console.log(`🔄 Auto-fetching tracking details for tracking number: ${trackingNumber} (Order ID: ${orderId})`);
      
      if (!this.baseUrl) {
        console.warn('⚠️ Parcel Panel base URL not configured, skipping auto-fetch');
        return;
      }

      const response = await this.trackPackage(trackingNumber);
      
      if (response.code === 200 && response.data) {
        console.log('✅ Successfully fetched tracking details from Parcel Panel');
        
        // Store tracking details in the database
        await this.storeTrackingDetails(orderId, response.data);
        
        console.log('✅ Tracking details stored in database');
      } else {
        console.warn('⚠️ No tracking details found or API error:', response.message);
      }
    } catch (error) {
      console.error('❌ Error auto-fetching tracking details:', error);
      // Don't throw - this should not block the main tracking update process
    }
  }

  // Updated method to fetch and store tracking details by order number
  async fetchAndStoreTrackingDetailsByOrderNumber(orderNumber: string, orderId: string): Promise<void> {
    try {
      console.log(`🔄 Auto-fetching tracking details for order: ${orderNumber} (Order ID: ${orderId})`);
      
      if (!this.baseUrl) {
        console.warn('⚠️ Parcel Panel base URL not configured, skipping auto-fetch');
        return;
      }

      const response = await this.fetchTrackingByOrderNumber(orderNumber);
      
      if (response.code === 200 && response.data) {
        console.log('✅ Successfully fetched tracking details from Parcel Panel');
        
        // Store tracking details in the database
        await this.storeTrackingDetails(orderId, response.data);
        
        console.log('✅ Tracking details stored in database');
      } else {
        console.warn('⚠️ No tracking details found or API error:', response.message);
      }
    } catch (error) {
      console.error('❌ Error auto-fetching tracking details:', error);
      // Don't throw - this should not block the main tracking update process
    }
  }

  // Helper method to store tracking details in database
  private async storeTrackingDetails(orderId: string, trackingInfo: ParcelPanelTrackingInfo): Promise<void> {
    try {
      const { error } = await supabase
        .from('order_tracking_details')
        .upsert({
          order_id: orderId,
          tracking_number: trackingInfo.tracking_number,
          courier_code: trackingInfo.courier_code,
          courier_name: trackingInfo.courier_name,
          status: trackingInfo.status,
          sub_status: trackingInfo.sub_status,
          origin_country: trackingInfo.origin_country,
          destination_country: trackingInfo.destination_country,
          estimated_delivery_date: trackingInfo.estimated_delivery_date,
          delivered_at: trackingInfo.delivered_at,
          shipped_at: trackingInfo.shipped_at,
          tracking_events: trackingInfo.tracking_events as any, // Cast to any to handle Json type
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'order_id'
        });

      if (error) {
        console.error('❌ Error storing tracking details:', error);
      }
    } catch (error) {
      console.error('❌ Error storing tracking details:', error);
    }
  }

  // Helper method to determine package status category
  static getStatusCategory(status: string): 'in-transit' | 'out-for-delivery' | 'delivered' | 'undelivered' {
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus.includes('delivered')) {
      return 'delivered';
    } else if (normalizedStatus.includes('out_for_delivery') || normalizedStatus.includes('out for delivery')) {
      return 'out-for-delivery';
    } else if (normalizedStatus.includes('exception') || normalizedStatus.includes('returned') || normalizedStatus.includes('failed')) {
      return 'undelivered';
    } else {
      return 'in-transit';
    }
  }
}

// Hook to use Parcel Panel service with API configs
export const useParcelPanelService = () => {
  const { apiConfigs, loading } = useApiConfigs();
  
  console.log('useParcelPanelService - API configs:', apiConfigs);
  console.log('useParcelPanelService - Loading:', loading);
  
  const isConfigured = Boolean(
    apiConfigs?.parcel_panel?.enabled && 
    apiConfigs?.parcel_panel?.api_key?.trim()
  );

  console.log('useParcelPanelService - Is configured:', isConfigured);
  console.log('useParcelPanelService - Parcel panel config:', apiConfigs?.parcel_panel);

  const service = isConfigured ? new ParcelPanelService(
    apiConfigs.parcel_panel.api_key,
    apiConfigs.parcel_panel.base_url || 'https://open.parcelpanel.com'
  ) : null;

  return {
    service,
    isConfigured,
    loading
  };
};
