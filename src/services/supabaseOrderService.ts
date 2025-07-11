
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

  // Sync Shopify order to Supabase database
  syncShopifyOrderToSupabase: async (shopifyOrder: any): Promise<string> => {
    try {
      console.log('Syncing Shopify order to Supabase:', shopifyOrder.id);

      // Check if order already exists
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('shopify_order_id', parseInt(shopifyOrder.id))
        .single();

      if (existingOrder) {
        console.log('Order already exists in Supabase:', existingOrder.id);
        return existingOrder.id;
      }

      // Create customer if needed
      let customerId = null;
      if (shopifyOrder.customer) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('shopify_customer_id', shopifyOrder.customer.id)
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              shopify_customer_id: shopifyOrder.customer.id,
              first_name: shopifyOrder.customer.first_name || '',
              last_name: shopifyOrder.customer.last_name || '',
              email: shopifyOrder.customer.email || null,
              phone: shopifyOrder.customer.phone || null
            })
            .select('id')
            .single();

          if (customerError) {
            console.error('Error creating customer:', customerError);
          } else {
            customerId = newCustomer.id;
          }
        }
      }

      // Create shipping address if needed
      let shippingAddressId = null;
      if (shopifyOrder.shipping_address && customerId) {
        const { data: newAddress, error: addressError } = await supabase
          .from('addresses')
          .insert({
            customer_id: customerId,
            address_line_1: shopifyOrder.shipping_address.address1 || 'Address not provided',
            address_line_2: shopifyOrder.shipping_address.address2 || null,
            city: shopifyOrder.shipping_address.city || 'Unknown',
            state: shopifyOrder.shipping_address.province || null,
            postal_code: shopifyOrder.shipping_address.zip || null,
            country: shopifyOrder.shipping_address.country || 'India'
          })
          .select('id')
          .single();

        if (addressError) {
          console.error('Error creating address:', addressError);
        } else {
          shippingAddressId = newAddress.id;
        }
      }

      // Create order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          shopify_order_id: parseInt(shopifyOrder.id),
          order_number: shopifyOrder.order_number || shopifyOrder.name,
          customer_id: customerId,
          shipping_address_id: shippingAddressId,
          stage: 'pending',
          total_amount: parseFloat(shopifyOrder.total_amount || shopifyOrder.current_total_price || '0'),
          currency: shopifyOrder.currency || 'INR'
        })
        .select('id')
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw orderError;
      }

      // Create order items
      if (shopifyOrder.line_items && shopifyOrder.line_items.length > 0) {
        const orderItems = shopifyOrder.line_items.map((item: any) => ({
          order_id: newOrder.id,
          shopify_variant_id: item.variant_id || null,
          title: item.title || item.name || 'Unknown Product',
          sku: item.sku || null,
          quantity: item.quantity || 1,
          price: parseFloat(item.price || '0'),
          total: parseFloat(item.price || '0') * (item.quantity || 1)
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('Error creating order items:', itemsError);
        }
      }

      console.log('Successfully synced order to Supabase:', newOrder.id);
      return newOrder.id;

    } catch (error) {
      console.error('Error syncing Shopify order to Supabase:', error);
      throw error;
    }
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

    // Send WhatsApp notification when order is moved to tracking (ready for dispatch)
    if (stage === 'tracking') {
      try {
        const { watiService } = await import('./watiService');
        await watiService.sendOrderDispatchedNotification(data);
      } catch (error) {
        console.error('Error sending WhatsApp notification:', error);
        // Don't throw error as order update was successful
      }
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
