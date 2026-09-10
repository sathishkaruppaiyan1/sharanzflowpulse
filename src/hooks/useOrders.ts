
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStage } from '@/types/database';
import { toast } from 'sonner';
import { supabaseOrderService } from '@/services/supabaseOrderService';

export const useOrdersByStage = (stages: string | string[]) => {
  const stageArray = Array.isArray(stages) ? stages : [stages];
  
  return useQuery({
    queryKey: ['orders', 'by-stage', stageArray],
    queryFn: async () => {
      console.log('Fetching orders for stages:', stageArray);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          shipping_address:addresses!orders_shipping_address_id_fkey(*),
          order_items(*)
        `)
        .in('stage', stageArray as OrderStage[])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders by stage:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} orders for stage ${stageArray.join(', ')}`);
      return (data as Order[]) || [];
    },
  });
};

// NOTE: the old `useOrders()` hook was removed. It selected the entire orders
// table with customer, address and order_items embedded and no limit, which
// PostgREST silently truncated at 1000 rows — so it was both the single
// largest source of egress on this project and quietly wrong. Use
// `useOrdersInRange` (analytics/shipping), `useShopifyOrderRefs` (id/stage
// lookups), `useOrdersByStage` (queues) or `useStageCounts` (totals) instead.

// Lightweight hook for the always-mounted Sidebar: it only needs the id /
// stage / shopify_order_id of orders in the "hold" stage to compute the hold
// badge count. Fetching the full orders table with all relations here (as
// useOrders does) was a major source of egress, so keep this query minimal.
export const useHoldOrderRefs = () => {
  return useQuery({
    queryKey: ['orders', 'hold-refs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, stage, shopify_order_id')
        .eq('stage', 'hold');

      if (error) {
        console.error('Error fetching hold order refs:', error);
        throw error;
      }

      return data || [];
    },
  });
};

export const useUpdateOrderStage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, stage }: { orderId: string; stage: string }) => {
      console.log(`Updating order ${orderId} to stage ${stage}`);
      
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          stage: stage as OrderStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating order stage:', error);
        throw error;
      }

      console.log(`Successfully updated order ${orderId} to stage ${stage}`);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all order queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Order ${data.order_number} moved to ${data.stage} stage`);
    },
    onError: (error) => {
      console.error('Error updating order stage:', error);
      toast.error('Failed to update order stage');
    },
  });
};

export const useUpdateTracking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      trackingNumber,
      carrierName,
      trackingUrl = '',
    }: {
      orderId: string;
      trackingNumber: string;
      carrierName: string;   // display name from courier_partners
      trackingUrl?: string;  // full resolved URL
    }) => {
      console.log(`🚀 Starting tracking update for order ${orderId}: ${trackingNumber} via ${carrierName}`);

      const result = await supabaseOrderService.updateTracking(orderId, trackingNumber, carrierName, trackingUrl);

      console.log(`✅ Successfully updated tracking for order ${orderId}`);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      const msgs: string[] = [];
      if (!result.whatsappSuccess) msgs.push(`WhatsApp: ${result.whatsappError || 'failed'}`);
      if (!result.shopifySuccess) msgs.push(`Shopify: ${result.shopifyError || 'failed'}`);

      if (msgs.length === 0) {
        toast.success(`Tracking added for order ${result.order.order_number} — WhatsApp & Shopify synced!`);
      } else {
        toast.success(`Tracking added for order ${result.order.order_number}`);
        msgs.forEach(msg => toast.warning(msg));
      }
    },
    onError: (error) => {
      console.error('❌ Error updating tracking:', error);
      toast.error('Failed to add tracking information');
    },
  });
};

export const useBulkUpdateOrderStage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderIds, stage }: { orderIds: string[]; stage: string }) => {
      console.log(`Bulk updating ${orderIds.length} orders to stage ${stage}`);
      
      const updateData: Record<string, unknown> = { 
        stage: stage as OrderStage,
        updated_at: new Date().toISOString()
      };

      // Add timestamp fields based on stage
      if (stage === 'packing') {
        updateData.printed_at = new Date().toISOString();
      } else if (stage === 'tracking') {
        updateData.packed_at = new Date().toISOString();
        // The enforce_printed_before_tracking DB trigger blocks rows whose
        // printed_at is NULL. Stamp it for the subset that's missing it so
        // bulk transitions don't fail partway through a batch.
        const { data: missing } = await supabase
          .from('orders')
          .select('id')
          .in('id', orderIds)
          .is('printed_at', null);
        if (missing && missing.length > 0) {
          await supabase
            .from('orders')
            .update({ printed_at: new Date().toISOString() })
            .in('id', missing.map((r) => r.id));
        }
      } else if (stage === 'shipped') {
        updateData.shipped_at = new Date().toISOString();
      } else if (stage === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .in('id', orderIds)
        .select(`
          *,
          customer:customers(*),
          shipping_address:addresses(*),
          order_items(
            *,
            product:products(*)
          )
        `);

      if (error) {
        console.error('Error bulk updating order stages:', error);
        throw error;
      }

      console.log(`Successfully bulk updated ${orderIds.length} orders to stage ${stage}`);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all order queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Successfully moved ${data.length} orders to ${data[0]?.stage} stage`);
    },
    onError: (error) => {
      console.error('Error bulk updating order stages:', error);
      toast.error('Failed to bulk update order stages');
    },
  });
};

// ---------------------------------------------------------------------------
// Analytics / Shipping: a bounded window instead of the whole table.
//
// Those pages used to call useOrders() — every order, with customer, address
// and order_items embedded — and then filter by date and search string in the
// browser. That was ~2 MB per page visit and, because PostgREST caps rows at
// 1000, it silently discarded most of the table so the numbers were wrong too.
//
// This pushes the date window to the server and selects only the columns the
// two screens actually render. Search stays client-side, which is fine now
// that the window it searches is bounded.
// ---------------------------------------------------------------------------

/** Columns actually rendered by CompletedOrdersList and PerformanceMetrics. */
const ANALYTICS_COLUMNS =
  'id, order_number, created_at, shipped_at, stage, carrier, tracking_number, total_amount, shopify_order_id, customer:customers(first_name, last_name, phone)';

const DEFAULT_WINDOW_DAYS = 90;
const MAX_ROWS = 1000;

export interface OrdersRange {
  from?: Date;
  to?: Date;
}

export const useOrdersInRange = (range: OrdersRange) => {
  const to = range.to ?? new Date();
  const from =
    range.from ?? new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  return useQuery({
    queryKey: ['orders', 'range', fromIso, toIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(ANALYTICS_COLUMNS)
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS);

      if (error) {
        console.error('Error fetching orders in range:', error);
        throw error;
      }

      return (data as unknown as Order[]) || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Lightweight lookup used by the Orders page to decide which Shopify orders
 * already exist internally and what stage they're in.
 *
 * This replaces a useOrders() call that pulled the entire orders table with
 * customer, address and order_items embedded — the page only ever read four
 * scalar columns off each row.
 */
export const useShopifyOrderRefs = () => {
  return useQuery({
    queryKey: ['orders', 'shopify-refs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, stage, shopify_order_id')
        .not('shopify_order_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) {
        console.error('Error fetching shopify order refs:', error);
        throw error;
      }

      return (data as unknown as Order[]) || [];
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
