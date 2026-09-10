
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

const normaliseEvents = (raw: unknown) =>
  Array.isArray(raw)
    ? raw.map((event: any) => ({
        time: event?.time || '',
        description: event?.description || '',
        location: event?.location,
        status: event?.status,
      }))
    : [];

export const useDeliveryTracking = () => {
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails | null>(null);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setDeliveryHistory(
          data.map(item => ({
            ...item,
            tracking_events: normaliseEvents(item.tracking_events),
          }))
        );
      }
    } catch (err) {
      console.error('Error loading delivery history:', err);
    }
  };

  // Read stored delivery details for an order number.
  const checkExistingDeliveryDetails = async (
    orderNumber: string
  ): Promise<DeliveryDetails | null> => {
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
          tracking_events: normaliseEvents(data.tracking_events),
        };
      }

      return null;
    } catch (err) {
      console.error('Error checking existing delivery details:', err);
      return null;
    }
  };

  // Look up delivery details for an order. This reads only what is already
  // stored in the database — the Parcel Panel API integration that used to
  // fetch live tracking has been removed.
  const fetchDeliveryDetails = async (orderNumber: string) => {
    setIsLoading(true);
    setError(null);
    setDeliveryDetails(null);

    try {
      const existingData = await checkExistingDeliveryDetails(orderNumber);

      if (existingData) {
        setDeliveryDetails(existingData);
        return;
      }

      setError(
        `No stored tracking information for order ${orderNumber}. Tracking details are recorded when an order is shipped.`
      );
    } catch (err: any) {
      console.error('Error fetching delivery details:', err);
      setError('Unable to load delivery details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveryHistory();
  }, []);

  return {
    deliveryDetails,
    deliveryHistory,
    isLoading,
    error,
    fetchDeliveryDetails,
    loadDeliveryHistory,
  };
};
