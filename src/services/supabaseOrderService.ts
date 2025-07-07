
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderStage, CarrierType } from '@/types/database';

export const supabaseOrderService = {
  // Fetch all orders with related data
  fetchOrders: async (): Promise<Order[]> => {
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    return data || [];
  },

  // Fetch orders by stage
  fetchOrdersByStage: async (stage: OrderStage): Promise<Order[]> => {
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
      .eq('stage', stage)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders by stage:', error);
      throw error;
    }

    return data || [];
  },

  // Update order stage
  updateOrderStage: async (orderId: string, stage: OrderStage): Promise<Order> => {
    const updates: any = { stage };
    
    // Set timestamps based on stage
    const now = new Date().toISOString();
    switch (stage) {
      case 'printing':
        updates.printed_at = now;
        break;
      case 'packing':
        updates.packed_at = now;
        break;
      case 'shipped':
        updates.shipped_at = now;
        break;
      case 'delivered':
        updates.delivered_at = now;
        break;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
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

    return data;
  },

  // Update tracking information
  updateTracking: async (orderId: string, trackingNumber: string, carrier: CarrierType): Promise<Order> => {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        tracking_number: trackingNumber, 
        carrier,
        stage: 'tracking'
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

    return data;
  },

  // Search orders
  searchOrders: async (query: string): Promise<Order[]> => {
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
      .or(`order_number.ilike.%${query}%,customer.first_name.ilike.%${query}%,customer.last_name.ilike.%${query}%,customer.email.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching orders:', error);
      throw error;
    }

    return data || [];
  },

  // Create sample orders for testing
  createSampleOrders: async (): Promise<void> => {
    // Create sample customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+91-9876543210'
      })
      .select()
      .single();

    if (customerError) {
      console.error('Error creating customer:', customerError);
      return;
    }

    // Create sample address
    const { data: address, error: addressError } = await supabase
      .from('addresses')
      .insert({
        customer_id: customer.id,
        address_line_1: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        country: 'India',
        is_default: true
      })
      .select()
      .single();

    if (addressError) {
      console.error('Error creating address:', addressError);
      return;
    }

    // Create sample product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        title: 'Wireless Headphones',
        sku: 'WH-001',
        price: 89.99
      })
      .select()
      .single();

    if (productError) {
      console.error('Error creating product:', productError);
      return;
    }

    // Create sample order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: `#${Date.now()}`,
        customer_id: customer.id,
        shipping_address_id: address.id,
        total_amount: 89.99,
        stage: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return;
    }

    // Create sample order item
    const { error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: product.id,
        title: product.title,
        sku: product.sku,
        quantity: 1,
        price: product.price,
        total: product.price
      });

    if (itemError) {
      console.error('Error creating order item:', itemError);
    }
  }
};
