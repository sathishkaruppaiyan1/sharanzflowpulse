import { supabase } from '@/integrations/supabase/client';

interface WooCommerceConfig {
  enabled: boolean;
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
}

interface WooCommerceUpdateParams {
  woocommerce_order_id: string;
  tracking_number: string;
  carrier: string;
}

export class WooCommerceService {
  private async getWooCommerceConfig(): Promise<WooCommerceConfig | null> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'api_configs')
        .single();

      if (error || !data?.value) {
        console.error('Error fetching API configurations:', error);
        return null;
      }

      const apiConfigs = data.value as any;
      return apiConfigs.woocommerce || null;
    } catch (error) {
      console.error('Error getting WooCommerce config:', error);
      return null;
    }
  }

  private getCarrierDisplayName(carrier: string): string {
    switch (carrier.toLowerCase()) {
      case 'frenchexpress':
        return 'Franch express';
      case 'delhivery':
        return 'Delhivery';
      default:
        return 'Other';
    }
  }

  private generateTrackingUrl(carrier: string, trackingNumber: string): string {
    switch (carrier.toLowerCase()) {
      case 'frenchexpress':
        return `https://franchexpress.com/courier-tracking/${trackingNumber}`;
      case 'delhivery':
        return `https://www.delhivery.com/track-v2/package/${trackingNumber}`;
      default:
        return '';
    }
  }

  async updateOrderStatus(params: WooCommerceUpdateParams): Promise<boolean> {
    try {
      const config = await this.getWooCommerceConfig();
      
      if (!config?.enabled) {
        throw new Error('WooCommerce API is not enabled');
      }

      if (!config.store_url || !config.consumer_key || !config.consumer_secret) {
        throw new Error('WooCommerce API not properly configured');
      }

      // Clean store URL
      const storeUrl = config.store_url.replace(/\/$/, '');
      
      // Prepare update data
      const updateData = {
        status: 'completed',
        meta_data: [
          {
            key: '_tracking_number',
            value: params.tracking_number
          },
          {
            key: '_tracking_provider',
            value: this.getCarrierDisplayName(params.carrier)
          },
          {
            key: '_tracking_url',
            value: this.generateTrackingUrl(params.carrier, params.tracking_number)
          }
        ]
      };

      // Create credentials for Basic Auth
      const credentials = btoa(`${config.consumer_key}:${config.consumer_secret}`);
      
      const response = await fetch(
        `${storeUrl}/wp-json/wc/v3/orders/${params.woocommerce_order_id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${credentials}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WooCommerce API error:', errorText);
        throw new Error(`Failed to update WooCommerce order: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('WooCommerce order updated successfully:', result);
      
      return true;
    } catch (error) {
      console.error('Error updating WooCommerce order:', error);
      throw error;
    }
  }
}

export const woocommerceService = new WooCommerceService();