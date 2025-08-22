
import { useApiConfigs } from '@/hooks/useApiConfigs';
import { supabase } from '@/integrations/supabase/client';

export interface ParcelPanelApiConfig {
  api_key: string;
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


export class ParcelPanelService {
  constructor() {}


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
