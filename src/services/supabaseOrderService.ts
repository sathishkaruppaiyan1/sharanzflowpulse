
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderStage, CarrierType } from '@/types/database';

export const supabaseOrderService = {
  async fetchOrders(): Promise<Order[]> {
    console.log('Fetching all orders with order items...');
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        shipping_address:addresses(*),
        order_items!inner(
          *,
          product:products(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    console.log('Raw orders data:', data?.length || 0, 'orders fetched');
    return data as Order[] || [];
  },

  async fetchOrdersByStage(stage: OrderStage): Promise<Order[]> {
    console.log(`Fetching orders for stage: ${stage}`);
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        shipping_address:addresses(*),
        order_items!inner(
          *,
          product:products(*)
        )
      `)
      .eq('stage', stage)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching orders for stage ${stage}:`, error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} orders for stage ${stage}`);
    return data as Order[] || [];
  },

  async updateOrderStage(orderId: string, stage: OrderStage): Promise<Order> {
    console.log(`Updating order ${orderId} to stage ${stage}`);
    
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        stage: stage as any,
        ...(stage === 'tracking' && { packed_at: new Date().toISOString() }),
        ...(stage === 'shipped' && { shipped_at: new Date().toISOString() }),
        ...(stage === 'delivered' && { delivered_at: new Date().toISOString() })
      })
      .eq('id', orderId)
      .select(`
        *,
        customer:customers(*),
        shipping_address:addresses(*),
        order_items(
          *,
          product:products(*)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating order stage:', error);
      throw error;
    }

    console.log(`Successfully updated order ${orderId} to stage ${stage}`);
    return data as Order;
  },

  async updateTracking(orderId: string, trackingNumber: string, carrier: CarrierType): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        tracking_number: trackingNumber,
        carrier: carrier as any,
        stage: 'shipped' as any,
        shipped_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select(`
        *,
        customer:customers(*),
        shipping_address:addresses(*),
        order_items(
          *,
          product:products(*)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating tracking:', error);
      throw error;
    }

    return data as Order;
  },

  async searchOrders(query: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        shipping_address:addresses(*),
        order_items(
          *,
          product:products(*)
        )
      `)
      .or(`order_number.ilike.%${query}%,tracking_number.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching orders:', error);
      throw error;
    }

    return data as Order[] || [];
  },

  async syncShopifyOrderToSupabase(shopifyOrder: any): Promise<string> {
    console.log('Syncing Shopify order to Supabase:', shopifyOrder.id);
    
    // For now, just update the order stage to 'tracking' since we're in the printing context
    // In a real implementation, this would sync the full Shopify order data
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        stage: 'tracking' as any,
        packed_at: new Date().toISOString()
      })
      .eq('shopify_order_id', shopifyOrder.id)
      .select('id')
      .single();

    if (error) {
      console.error('Error syncing Shopify order:', error);
      throw error;
    }

    return data?.id || shopifyOrder.id;
  },

  async createSampleOrders(): Promise<void> {
    // Sample order creation logic would go here
    console.log('Sample order creation not implemented yet');
  }
};
