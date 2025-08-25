
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParcelPanelService } from '@/services/parcelPanelService';

export interface DeliveryDetails {
  id: string;
  order_number: string;
  tracking_number?: string;
  courier_code?: string;
  courier_name?: string;
  status: string;
  sub_status?: string;
  origin_country?: string;
  destination_country?: string;
  estimated_delivery_date?: string;
  delivered_at?: string;
  shipped_at?: string;
  tracking_events: Array<{
    time: string;
    description: string;
    location?: string;
    status?: string;
  }>;
  last_updated: string;
}

export const useDeliveryTracking = () => {
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails | null>(null);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { service, isConfigured } = useParcelPanelService();

  // Load delivery history from database
  const loadDeliveryHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_tracking_details')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data) {
        const formattedHistory = data.map(item => ({
          ...item,
          tracking_events: Array.isArray(item.tracking_events) 
            ? item.tracking_events.map((event: any) => ({
                time: event.time || '',
                description: event.description || '',
                location: event.location,
                status: event.status
              }))
            : []
        }));
        setDeliveryHistory(formattedHistory);
      }
    } catch (err) {
      console.error('Error loading delivery history:', err);
    }
  };

  // Check if delivery details exist in database
  const checkExistingDeliveryDetails = async (orderNumber: string): Promise<DeliveryDetails | null> => {
    try {
      const { data, error } = await supabase
        .from('delivery_tracking_details')
        .select('*')
        .eq('order_number', orderNumber)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }

      if (data) {
        return {
          ...data,
          tracking_events: Array.isArray(data.tracking_events) 
            ? data.tracking_events.map((event: any) => ({
                time: event.time || '',
                description: event.description || '',
                location: event.location,
                status: event.status
              }))
            : []
        };
      }

      return null;
    } catch (err) {
      console.error('Error checking existing delivery details:', err);
      return null;
    }
  };

  // Parse API response to extract tracking data
  const parseApiResponse = (response: any): DeliveryDetails | null => {
    if (!response.data?.order?.shipments || response.data.order.shipments.length === 0) {
      return null;
    }

    const order = response.data.order;
    const shipment = order.shipments[0]; // Take the first shipment

    // Convert checkpoints to tracking events
    const tracking_events = shipment.checkpoints?.map((checkpoint: any) => ({
      time: checkpoint.checkpoint_time,
      description: checkpoint.detail,
      location: checkpoint.detail.split(',').slice(-2).join(',').trim(), // Extract location from detail
      status: checkpoint.status
    })) || [];

    return {
      id: `delivery_${order.order_number}_${Date.now()}`,
      order_number: order.order_number,
      tracking_number: shipment.tracking_number,
      courier_code: shipment.carrier?.code,
      courier_name: shipment.carrier?.name,
      status: shipment.status,
      sub_status: shipment.substatus_label || shipment.substatus,
      origin_country: 'India', // Default based on API response
      destination_country: order.shipping_address?.country,
      estimated_delivery_date: shipment.estimated_delivery_date,
      delivered_at: shipment.delivery_date,
      shipped_at: shipment.pickup_date,
      tracking_events,
      last_updated: new Date().toISOString()
    };
  };

  // Fetch delivery details from Parcel Panel API
  const fetchDeliveryDetails = async (orderNumber: string) => {
    setIsLoading(true);
    setError(null);
    setDeliveryDetails(null);

    try {
      console.log(`🔄 Checking for existing delivery details for order: ${orderNumber}`);
      
      // First check if data already exists in database
      const existingData = await checkExistingDeliveryDetails(orderNumber);
      
      if (existingData) {
        console.log(`✅ Found existing delivery details for order ${orderNumber}`);
        setDeliveryDetails(existingData);
        return;
      }

      // If no existing data, fetch from API
      if (!service || !isConfigured) {
        setError('Parcel Panel API is not configured. Please check your API settings.');
        return;
      }

      console.log(`🔄 Fetching delivery details from API for order: ${orderNumber}`);
      
      const response = await service.fetchTrackingByOrderNumber(orderNumber);
      console.log('📥 API Response received:', JSON.stringify(response, null, 2));
      
      if (response.code !== 200 || !response.data) {
        // Handle specific API errors
        if (response.code === 401) {
          setError('Invalid API key. Please check your Parcel Panel API configuration in settings.');
        } else if (response.code === 404) {
          setError('No tracking information found for this order number.');
        } else {
          setError(response.message || 'Failed to fetch tracking details from Parcel Panel API.');
        }
        return;
      }

      // Parse the response using the new structure
      const deliveryData = parseApiResponse(response);
      
      if (!deliveryData) {
        setError('No tracking information found for this order');
        return;
      }

      setDeliveryDetails(deliveryData);

      // Store in database
      await storeDeliveryDetails(deliveryData);
      
      // Reload history to include the new entry
      await loadDeliveryHistory();

      console.log(`✅ Successfully fetched and stored delivery details for order ${orderNumber}`);
    } catch (err: any) {
      console.error('❌ Error fetching delivery details:', err);
      
      // Handle specific error types
      if (err.message?.includes('Invalid API key') || err.message?.includes('401')) {
        setError('Invalid API key. Please check your Parcel Panel API configuration in settings.');
      } else if (err.message?.includes('not configured')) {
        setError('Parcel Panel API is not configured. Please check your API settings.');
      } else {
        setError('Unable to fetch delivery details. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Store delivery details in database
  const storeDeliveryDetails = async (deliveryData: DeliveryDetails) => {
    try {
      const { error } = await supabase
        .from('delivery_tracking_details')
        .upsert({
          order_number: deliveryData.order_number,
          tracking_number: deliveryData.tracking_number,
          courier_code: deliveryData.courier_code,
          courier_name: deliveryData.courier_name,
          status: deliveryData.status,
          sub_status: deliveryData.sub_status,
          origin_country: deliveryData.origin_country,
          destination_country: deliveryData.destination_country,
          estimated_delivery_date: deliveryData.estimated_delivery_date,
          delivered_at: deliveryData.delivered_at,
          shipped_at: deliveryData.shipped_at,
          tracking_events: deliveryData.tracking_events,
          last_updated: deliveryData.last_updated
        }, {
          onConflict: 'order_number'
        });

      if (error) {
        console.error('Error storing delivery details:', error);
      } else {
        console.log('✅ Successfully stored delivery details in database');
      }
    } catch (err) {
      console.error('❌ Error storing delivery details:', err);
    }
  };

  // Load delivery history on component mount
  useEffect(() => {
    loadDeliveryHistory();
  }, []);

  return {
    deliveryDetails,
    deliveryHistory,
    isLoading,
    error,
    fetchDeliveryDetails,
    loadDeliveryHistory
  };
};
