
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParcelPanelService } from '@/services/parcelPanelService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnalyticsData {
  date: string;
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

export const useParcelPanelAnalytics = () => {
  const { isConfigured } = useParcelPanelService();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncAnalytics = async (startDate?: string, endDate?: string) => {
    if (!isConfigured) {
      toast({
        title: "Error",
        description: "Parcel Panel API is not configured",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    console.log('📊 Analytics sync is not available - tracking only functionality is implemented');

    try {
      // Since we only have tracking functionality, we'll generate basic analytics from stored data
      const { data: trackingData, error } = await supabase
        .from('delivery_tracking_details')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Generate basic analytics from existing tracking data
      const analyticsData = {
        total_orders: trackingData?.length || 0,
        delivered_orders: trackingData?.filter(item => item.status?.toLowerCase().includes('delivered')).length || 0,
        in_transit_orders: trackingData?.filter(item => item.status?.toLowerCase().includes('transit')).length || 0,
        out_for_delivery_orders: trackingData?.filter(item => item.status?.toLowerCase().includes('out_for_delivery')).length || 0,
        exception_orders: trackingData?.filter(item => item.status?.toLowerCase().includes('exception')).length || 0,
        delivery_rate: 0,
        avg_delivery_time_days: 0,
        top_carriers: [],
        top_destinations: [],
        status_breakdown: {}
      };

      // Store basic analytics data in database
      await supabase
        .from('parcel_panel_analytics')
        .upsert({
          date: new Date().toISOString().split('T')[0],
          ...analyticsData,
          raw_data: JSON.parse(JSON.stringify(analyticsData))
        }, {
          onConflict: 'date'
        });

      toast({
        title: "Success",
        description: "Basic analytics data generated from tracking data",
      });
    } catch (error) {
      console.error('❌ Analytics sync failed:', error);
      toast({
        title: "Sync Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Query to fetch stored analytics data with proper type handling
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['parcel-panel-analytics'],
    queryFn: async (): Promise<AnalyticsData[]> => {
      const { data, error } = await supabase
        .from('parcel_panel_analytics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (error) {
        throw error;
      }

      // Transform the database data to match our TypeScript interface
      const transformedData: AnalyticsData[] = (data || []).map(row => ({
        date: row.date,
        total_orders: row.total_orders || 0,
        delivered_orders: row.delivered_orders || 0,
        in_transit_orders: row.in_transit_orders || 0,
        out_for_delivery_orders: row.out_for_delivery_orders || 0,
        exception_orders: row.exception_orders || 0,
        delivery_rate: row.delivery_rate || 0,
        avg_delivery_time_days: row.avg_delivery_time_days || 0,
        top_carriers: Array.isArray(row.top_carriers) ? row.top_carriers as Array<{ name: string; count: number }> : [],
        top_destinations: Array.isArray(row.top_destinations) ? row.top_destinations as Array<{ country: string; count: number }> : [],
        status_breakdown: typeof row.status_breakdown === 'object' && row.status_breakdown !== null ? row.status_breakdown as Record<string, number> : {},
      }));

      return transformedData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    analyticsData,
    isLoading,
    isSyncing,
    syncAnalytics,
    refetch,
    isConfigured
  };
};
