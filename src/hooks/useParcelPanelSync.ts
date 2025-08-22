
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParcelPanelService } from '@/services/parcelPanelService';
import { useToast } from '@/hooks/use-toast';

export interface SyncProgress {
  total: number;
  processed: number;
  current?: string;
  stage: 'orders' | 'tracking' | 'completed' | 'error';
}

export const useParcelPanelSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    total: 0,
    processed: 0,
    stage: 'completed'
  });
  
  const { service, isConfigured } = useParcelPanelService();
  const { toast } = useToast();

  const syncOrders = async () => {
    if (!service || !isConfigured) {
      toast({
        title: "Configuration Error",
        description: "Parcel Panel API is not configured. Please check your settings.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ total: 0, processed: 0, stage: 'orders' });

    try {
      console.log('🔄 Starting Parcel Panel sync...');
      
      // Get existing orders from our database that might need tracking updates
      const { data: existingOrders, error } = await supabase
        .from('orders')
        .select('id, order_number')
        .limit(50); // Limit to avoid overwhelming the API

      if (error) {
        throw new Error(`Failed to fetch existing orders: ${error.message}`);
      }

      if (!existingOrders || existingOrders.length === 0) {
        toast({
          title: "No Orders Found",
          description: "No orders found to sync tracking information for.",
          variant: "default",
        });
        setSyncProgress({ total: 0, processed: 0, stage: 'completed' });
        setIsSyncing(false);
        return;
      }

      setSyncProgress({
        total: existingOrders.length,
        processed: 0,
        stage: 'tracking'
      });

      // Sync tracking details for existing orders
      let processed = 0;
      for (const order of existingOrders) {
        try {
          setSyncProgress(prev => ({
            ...prev,
            processed,
            current: order.order_number
          }));

          console.log(`🔄 Syncing tracking for order: ${order.order_number}`);
          await service.fetchTrackingDetails(order.order_number);
          
          processed++;
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Error syncing order ${order.order_number}:`, error);
          processed++;
        }
      }

      setSyncProgress({
        total: existingOrders.length,
        processed,
        stage: 'completed'
      });

      toast({
        title: "Sync Completed",
        description: `Successfully processed ${processed} orders for tracking updates.`,
      });

      console.log(`✅ Parcel Panel sync completed: ${processed}/${existingOrders.length} orders processed`);

    } catch (error: any) {
      console.error('❌ Parcel Panel sync failed:', error);
      setSyncProgress(prev => ({ ...prev, stage: 'error' }));
      
      toast({
        title: "Sync Failed",
        description: error.message || "An unexpected error occurred during sync",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync tracking details every hour for recent orders
  useEffect(() => {
    if (!service || !isConfigured) return;

    const interval = setInterval(async () => {
      console.log('🔄 Auto-syncing recent order tracking...');
      
      try {
        // Get recent orders (last 24 hours) that might need tracking updates
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('id, order_number')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(10);

        if (recentOrders && recentOrders.length > 0) {
          for (const order of recentOrders) {
            try {
              await service.fetchTrackingDetails(order.order_number);
              // Small delay between requests
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
              console.error(`Error auto-syncing order ${order.order_number}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Error during auto-sync:', error);
      }
    }, 60 * 60 * 1000); // Every hour

    return () => clearInterval(interval);
  }, [service, isConfigured]);

  return {
    isSyncing,
    syncProgress,
    syncOrders,
    isConfigured
  };
};
