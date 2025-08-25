
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
  constructor() {}

  async fetchOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ParcelPanelApiResponse<ParcelPanelOrdersResponse>> {
    try {
      const { data, error } = await supabase.functions.invoke('parcel-panel-api', {
        body: {
          action: 'fetchOrders',
          ...params
        }
      });

      if (error) {
        console.error('Error calling edge function:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  async trackPackage(trackingNumber: string): Promise<ParcelPanelApiResponse<ParcelPanelTrackingInfo[]>> {
    try {
      const { data, error } = await supabase.functions.invoke('parcel-panel-api', {
        body: {
          action: 'trackPackage',
          trackingNumber
        }
      });

      if (error) {
        console.error('Error calling edge function:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error tracking package:', error);
      throw error;
    }
  }

  async fetchTrackingByOrderNumber(orderNumber: string): Promise<ParcelPanelApiResponse<{ trackings: ParcelPanelTrackingInfo[] }>> {
    try {
      const { data, error } = await supabase.functions.invoke('parcel-panel-api', {
        body: {
          action: 'fetchTrackingByOrderNumber',
          orderNumber
        }
      });

      if (error) {
        console.error('Error calling edge function:', error);
        throw error;
      }

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
      const { data, error } = await supabase.functions.invoke('parcel-panel-api', {
        body: {
          action: 'getAnalytics',
          ...params
        }
      });

      if (error) {
        console.error('Error calling edge function:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  async getSupportedCouriers(): Promise<ParcelPanelApiResponse<ParcelPanelCouriersResponse>> {
    try {
      const { data, error } = await supabase.functions.invoke('parcel-panel-api', {
        body: {
          action: 'getSupportedCouriers'
        }
      });

      if (error) {
        console.error('Error calling edge function:', error);
        throw error;
      }

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
      
      const { data, error } = await supabase.functions.invoke('parcel-panel-api', {
        body: {
          action: 'fetchTrackingByOrderNumber',
          orderNumber,
          orderId // Pass order ID so the edge function can store the data
        }
      });

      if (error) {
        console.error('❌ Error calling edge function:', error);
        throw error;
      }

      if (data.code === 200 && data.data?.trackings && data.data.trackings.length > 0) {
        console.log(`✅ Successfully fetched and stored tracking details for order ${orderNumber}`);
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
  const isConfigured = Boolean(apiConfigs?.parcel_panel?.api_key);
  const service = new ParcelPanelService(); // No longer needs API key as it's handled by edge function

  return {
    service,
    isConfigured,
  };
};
