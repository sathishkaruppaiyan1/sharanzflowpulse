
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ShopifyOrderSyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

export const useShopifyOrderSync = () => {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const syncShopifyOrders = useCallback(async (): Promise<ShopifyOrderSyncResult> => {
    setSyncing(true);
    const result: ShopifyOrderSyncResult = {
      synced: 0,
      skipped: 0,
      errors: []
    };

    try {
      console.log('🔄 Starting Shopify order sync...');
      
      // Fetch Shopify orders via edge function
      const { data: shopifyData, error: fetchError } = await supabase.functions.invoke('fetch-shopify-orders');

      if (fetchError) {
        throw new Error(`Failed to fetch Shopify orders: ${fetchError.message}`);
      }

      if (!shopifyData?.orders) {
        console.log('ℹ️ No Shopify orders found');
        return result;
      }

      const shopifyOrders = shopifyData.orders;
      console.log(`📦 Processing ${shopifyOrders.length} Shopify orders...`);

      // Get existing orders to avoid duplicates
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('shopify_order_id')
        .not('shopify_order_id', 'is', null);

      const existingOrderIds = new Set(existingOrders?.map(o => o.shopify_order_id?.toString()) || []);

      // Process each Shopify order
      for (const shopifyOrder of shopifyOrders) {
        try {
          // Skip if already synced and not unfulfilled
          if (existingOrderIds.has(shopifyOrder.id) && shopifyOrder.fulfillment_status !== 'unfulfilled') {
            result.skipped++;
            continue;
          }

          // Only sync unfulfilled orders or update existing ones
          if (shopifyOrder.fulfillment_status === 'unfulfilled' || existingOrderIds.has(shopifyOrder.id)) {
            // Call the database function to sync the order
            const { data: syncResult, error: syncError } = await supabase.rpc(
              'sync_shopify_order_to_db',
              { shopify_order_data: shopifyOrder }
            );

            if (syncError) {
              console.error(`❌ Error syncing order ${shopifyOrder.id}:`, syncError);
              result.errors.push(`Order ${shopifyOrder.order_number}: ${syncError.message}`);
            } else {
              console.log(`✅ Synced order ${shopifyOrder.order_number} (${shopifyOrder.id})`);
              result.synced++;
            }
          } else {
            result.skipped++;
          }
        } catch (error) {
          console.error(`💥 Error processing order ${shopifyOrder.id}:`, error);
          result.errors.push(`Order ${shopifyOrder.order_number}: ${error.message}`);
        }
      }

      console.log(`🎉 Sync completed: ${result.synced} synced, ${result.skipped} skipped, ${result.errors.length} errors`);

      if (result.synced > 0) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${result.synced} orders from Shopify`,
        });
      }

      return result;

    } catch (error) {
      console.error('💥 Shopify sync failed:', error);
      result.errors.push(error.message);
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
      return result;
    } finally {
      setSyncing(false);
    }
  }, [toast]);

  return {
    syncShopifyOrders,
    syncing
  };
};
