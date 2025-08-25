
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
  const { service, isConfigured } = useParcelPanelService();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncAnalytics = async (startDate?: string, endDate?: string) => {
    if (!service || !isConfigured) {
      toast({
        title: "Error",
        description: "Parcel Panel API is not configured",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    console.log('📊 Starting analytics sync...');

    try {
      // Fetch analytics data from Parcel Panel
      const response = await service.getAnalytics({
        start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: endDate || new Date().toISOString().split('T')[0]
      });

      if (response.code === 200 && response.data) {
        const analyticsData = response.data;
        
        // Store analytics data in database
        await supabase
          .from('parcel_panel_analytics')
          .upsert({
            date: new Date().toISOString().split('T')[0],
            total_orders: analyticsData.total_orders || 0,
            delivered_orders: analyticsData.delivered_orders || 0,
            in_transit_orders: analyticsData.in_transit_orders || 0,
            out_for_delivery_orders: analyticsData.out_for_delivery_orders || 0,
            exception_orders: analyticsData.exception_orders || 0,
            delivery_rate: analyticsData.delivery_rate || 0,
            avg_delivery_time_days: analyticsData.avg_delivery_time_days || 0,
            top_carriers: JSON.parse(JSON.stringify(analyticsData.top_carriers || [])),
            top_destinations: JSON.parse(JSON.stringify(analyticsData.top_destinations || [])),
            status_breakdown: JSON.parse(JSON.stringify(analyticsData.status_breakdown || {})),
            raw_data: JSON.parse(JSON.stringify(analyticsData))
          }, {
            onConflict: 'date'
          });

        toast({
          title: "Success",
          description: "Analytics data synced successfully",
        });
      }
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
