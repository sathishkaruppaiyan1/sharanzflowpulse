
import { useApiConfigs } from '@/hooks/useApiConfigs';

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

export interface ParcelPanelResponse {
  code: number;
  message: string;
  data: ParcelPanelTrackingInfo | null;
}

export class ParcelPanelService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.parcelpanel.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async trackPackage(trackingNumber: string, courierCode?: string): Promise<ParcelPanelResponse> {
    try {
      console.log(`Tracking package: ${trackingNumber} with courier: ${courierCode || 'auto-detect'}`);
      
      const requestBody: any = {
        tracking_number: trackingNumber.trim(),
      };

      // Add courier code if provided for better accuracy
      if (courierCode) {
        requestBody.courier_code = courierCode;
      }

      const response = await fetch(`${this.baseUrl}/v2/tracking/track`, {
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
      const response = await fetch(`${this.baseUrl}/v2/couriers`, {
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
  const { apiConfigs } = useApiConfigs();
  
  const isConfigured = Boolean(
    apiConfigs?.parcel_panel?.enabled && 
    apiConfigs?.parcel_panel?.api_key
  );

  const service = isConfigured ? new ParcelPanelService(
    apiConfigs.parcel_panel.api_key,
    apiConfigs.parcel_panel.base_url
  ) : null;

  return {
    service,
    isConfigured
  };
};
