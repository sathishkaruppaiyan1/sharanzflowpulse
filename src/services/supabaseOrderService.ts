
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderStage, OrderItem, Customer, Address } from '@/types/database';

class SupabaseOrderService {
  async fetchOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        shipping_address:addresses(*),
        order_items(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  async fetchOrdersByStage(stage: OrderStage): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        shipping_address:addresses(*),
        order_items(*)
      `)
      .eq('stage', stage)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders by stage:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  async updateOrderStage(orderId: string, stage: OrderStage): Promise<void> {
    const updates: any = { stage, updated_at: new Date().toISOString() };
    
    // Set appropriate timestamps based on stage
    switch (stage) {
      case 'packing':
        updates.printed_at = new Date().toISOString();
        break;
      case 'tracking':
        updates.packed_at = new Date().toISOString();
        break;
      case 'shipped':
        updates.shipped_at = new Date().toISOString();
        break;
      case 'delivered':
        updates.delivered_at = new Date().toISOString();
        break;
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order stage:', error);
      throw new Error(error.message);
    }
  }

  async updateOrderTracking(orderId: string, trackingNumber: string, carrier?: string): Promise<void> {
    const updates: any = { 
      tracking_number: trackingNumber,
      updated_at: new Date().toISOString()
    };
    
    if (carrier) {
      updates.carrier = carrier;
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order tracking:', error);
      throw new Error(error.message);
    }
  }

  async fetchOrderById(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        shipping_address:addresses(*),
        order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('Error fetching order by id:', error);
      throw new Error(error.message);
    }

    return data;
  }

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      throw new Error(error.message);
    }

    return data;
  }
}

export const supabaseOrderService = new SupabaseOrderService();
