
import { useApiConfigs } from '@/hooks/useApiConfigs';
import { supabase } from '@/integrations/supabase/client';

export interface ParcelPanelApiConfig {
  api_key: string;
}

export interface ParcelPanelOrderInfo {
  id: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  status: string;
  sub_status?: string;
  tracking_number?: string;
  courier_code?: string;
  courier_name?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
  shipping_address?: {
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface ParcelPanelTrackingEvent {
  time: string;
  location: string;
  description: string;
}

export interface ParcelPanelTrackingInfo {
  tracking_number: string;
  courier_code: string;
  courier_name: string;
  status: string;
  sub_status: string;
  origin_country: string;
  destination_country: string;
  estimated_delivery_date: string;
  delivered_at: string;
  shipped_at: string;
  tracking_events: ParcelPanelTrackingEvent[];
}

export interface ParcelPanelApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface ParcelPanelOrdersResponse {
  orders: ParcelPanelOrderInfo[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface ParcelPanelAnalyticsResponse {
  total_orders: number;
  delivered_orders: number;
  in_transit_orders: number;
  out_for_delivery_orders: number;
  exception_orders: number;
  delivery_rate: number;
  avg_delivery_time_days: number;
  top_carriers: Array<{ name: string; count: number }>;
  top_destinations: Array<{ country: string; count: number }>;
  status_breakdown: Record<string, number>;
}

export interface ParcelPanelCouriersResponse {
  couriers: Array<{ code: string; name: string }>;
}

export class ParcelPanelService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ParcelPanelApiResponse<ParcelPanelOrdersResponse>> {
    try {
      const url = new URL('https://api.parcelpanel.com/api/v1/orders');
      if (params?.page) url.searchParams.append('page', params.page.toString());
      if (params?.limit) url.searchParams.append('limit', params.limit.toString());
      if (params?.status) url.searchParams.append('status', params.status);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });

      const data = await response.json() as ParcelPanelApiResponse<ParcelPanelOrdersResponse>;
      return data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  async trackPackage(trackingNumber: string): Promise<ParcelPanelApiResponse<ParcelPanelTrackingInfo[]>> {
    try {
      const url = `https://api.parcelpanel.com/api/v1/trackings/${trackingNumber}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error tracking package:', errorData);
        throw new Error(errorData.message || 'Failed to track package');
      }

      const data = await response.json() as ParcelPanelApiResponse<ParcelPanelTrackingInfo[]>;
      return data;
    } catch (error) {
      console.error('Error tracking package:', error);
      throw error;
    }
  }

  async fetchTrackingByOrderNumber(orderNumber: string): Promise<ParcelPanelApiResponse<{ trackings: ParcelPanelTrackingInfo[] }>> {
    try {
      const url = `https://api.parcelpanel.com/api/v1/trackings?order_number=${orderNumber}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching tracking by order number:', errorData);
        throw new Error(errorData.message || 'Failed to fetch tracking by order number');
      }

      const data = await response.json() as ParcelPanelApiResponse<{ trackings: ParcelPanelTrackingInfo[] }>;
      return data;
    } catch (error) {
      console.error('Error fetching tracking by order number:', error);
      throw error;
    }
  }

  async getAnalytics(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ParcelPanelApiResponse<ParcelPanelAnalyticsResponse>> {
    try {
      const url = new URL('https://api.parcelpanel.com/api/v1/analytics/orders');
      if (params?.start_date) url.searchParams.append('start_date', params.start_date);
      if (params?.end_date) url.searchParams.append('end_date', params.end_date);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching analytics:', errorData);
        throw new Error(errorData.message || 'Failed to fetch analytics');
      }

      const data = await response.json() as ParcelPanelApiResponse<ParcelPanelAnalyticsResponse>;
      return data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  async getSupportedCouriers(): Promise<ParcelPanelApiResponse<ParcelPanelCouriersResponse>> {
    try {
      const url = 'https://api.parcelpanel.com/api/v1/couriers';
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching couriers:', errorData);
        throw new Error(errorData.message || 'Failed to fetch couriers');
      }

      const data = await response.json() as ParcelPanelApiResponse<ParcelPanelCouriersResponse>;
      return data;
    } catch (error) {
      console.error('Error fetching couriers:', error);
      throw error;
    }
  }

  static getStatusCategory(status: string): string {
    status = status.toLowerCase();

    if (status.includes('delivered')) {
      return 'delivered';
    } else if (status.includes('out_for_delivery')) {
      return 'out_for_delivery';
    } else if (status.includes('transit') || status.includes('shipped')) {
      return 'in_transit';
    } else if (status.includes('exception') || status.includes('undelivered') || status.includes('alert')) {
      return 'exception';
    } else {
      return 'unknown';
    }
  }

  async fetchAndStoreTrackingDetails(orderNumber: string, orderId: string): Promise<void> {
    try {
      console.log(`🔄 Auto-fetching tracking details for order: ${orderNumber} (Order ID: ${orderId})`);
      
      const response = await this.fetchTrackingByOrderNumber(orderNumber);
      
      if (response.code === 200 && response.data?.trackings && response.data.trackings.length > 0) {
        const tracking = response.data.trackings[0]; // Get the first tracking result
        
        console.log(`📦 Storing tracking details for order ${orderNumber}:`, {
          tracking_number: tracking.tracking_number,
          status: tracking.status,
          courier: tracking.courier_name
        });

        // Store in database
        const { error } = await supabase
          .from('order_tracking_details')
          .upsert({
            order_id: orderId,
            tracking_number: tracking.tracking_number,
            courier_code: tracking.courier_code,
            courier_name: tracking.courier_name,
            status: tracking.status,
            sub_status: tracking.sub_status,
            origin_country: tracking.origin_country,
            destination_country: tracking.destination_country,
            estimated_delivery_date: tracking.estimated_delivery_date,
            delivered_at: tracking.delivered_at,
            shipped_at: tracking.shipped_at,
            tracking_events: JSON.parse(JSON.stringify(tracking.tracking_events || [])),
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'order_id'
          });

        if (error) {
          console.error('❌ Error storing tracking details:', error);
          throw error;
        }

        console.log(`✅ Successfully stored tracking details for order ${orderNumber}`);
      } else {
        console.log(`⚠️ No tracking information found for order ${orderNumber}`);
        
        // Store a "no tracking" status
        await supabase
          .from('order_tracking_details')
          .upsert({
            order_id: orderId,
            status: 'no_tracking',
            sub_status: 'No tracking information available',
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'order_id'
          });
      }
    } catch (error) {
      console.error('❌ Error auto-fetching tracking details:', error);
      
      // Store error status
      await supabase
        .from('order_tracking_details')
        .upsert({
          order_id: orderId,
          status: 'error',
          sub_status: 'Failed to fetch tracking information',
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'order_id'
        });
      
      throw error;
    }
  }
}

export const useParcelPanelService = () => {
  const { apiConfigs } = useApiConfigs();
  const apiKey = apiConfigs?.parcel_panel?.api_key || '';
  const isConfigured = Boolean(apiKey);
  const service = apiKey ? new ParcelPanelService(apiKey) : null;

  return {
    service,
    isConfigured,
  };
};
