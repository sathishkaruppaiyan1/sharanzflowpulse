
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
        order_items!inner(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    console.log('Raw orders data:', data?.length || 0, 'orders fetched');
    return data || [];
  },

  async fetchOrdersByStage(stage: OrderStage): Promise<Order[]> {
    console.log(`Fetching orders for stage: ${stage}`);
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        shipping_address:addresses(*),
        order_items!inner(*)
      `)
      .eq('stage', stage)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching orders for stage ${stage}:`, error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} orders for stage ${stage}`);
    return data || [];
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
        order_items(*)
      `)
      .single();

    if (error) {
      console.error('Error updating order stage:', error);
      throw error;
    }

    console.log(`Successfully updated order ${orderId} to stage ${stage}`);
    return data;
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
        order_items(*)
      `)
      .single();

    if (error) {
      console.error('Error updating tracking:', error);
      throw error;
    }

    return data;
  },

  async searchOrders(query: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        shipping_address:addresses(*),
        order_items(*)
      `)
      .or(`order_number.ilike.%${query}%,tracking_number.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching orders:', error);
      throw error;
    }

    return data || [];
  },

  async createSampleOrders(): Promise<void> {
    // Sample order creation logic would go here
    console.log('Sample order creation not implemented yet');
  }
};
