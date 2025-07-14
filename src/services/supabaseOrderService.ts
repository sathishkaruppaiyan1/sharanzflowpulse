
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderStage, CarrierType } from '@/types/database';
import { ShopifyOrder } from '@/hooks/useShopifyOrders';
import { watiService } from '@/services/watiService';

export const supabaseOrderService = {
  fetchOrders: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customer_id (
          first_name,
          last_name,
          phone
        ),
        shipping_address:shipping_address_id (
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country
        ),
        order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    return data as Order[];
  },

  fetchOrdersByStage: async (stage: OrderStage): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customer_id (
          first_name,
          last_name,
          phone
        ),
        shipping_address:shipping_address_id (
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country
        ),
        order_items (*)
      `)
      .eq('stage', stage)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching orders in ${stage} stage:`, error);
      throw error;
    }

    return data as Order[];
  },

  updateOrderStage: async (orderId: string, stage: OrderStage): Promise<Order> => {
    const { data, error } = await supabase
      .from('orders')
      .update({ stage })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order stage:', error);
      throw error;
    }

    return data as Order;
  },

  updateItemPacked: async (itemId: string, packed: boolean): Promise<void> => {
    const { error } = await supabase
      .from('order_items')
      .update({ packed })
      .eq('id', itemId);

    if (error) {
      console.error('Error updating item packed status:', error);
      throw error;
    }
  },

  updateTracking: async (orderId: string, trackingNumber: string, carrier: CarrierType): Promise<Order> => {
    const { data, error } = await supabase
      .from('orders')
      .update({ tracking_number: trackingNumber, carrier: carrier })
      .eq('id', orderId)
      .select(`
        *,
        customer:customer_id (
          first_name,
          last_name,
          phone
        ),
        shipping_address:shipping_address_id (
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country
        ),
        order_items (*)
      `)
      .single();

    if (error) {
      console.error('Error updating tracking information:', error);
      throw error;
    }

    // Send WhatsApp notification
    if (data && data.customer?.phone) {
      try {
        await watiService.sendOrderShippedNotification(data as Order, trackingNumber, carrier);
        console.log(`WhatsApp notification sent to ${data.customer.phone}`);
      } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
      }
    } else {
      console.log('No customer phone number available, skipping WhatsApp notification.');
    }

    return data as Order;
  },

  searchOrders: async (query: string): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customer_id (
          first_name,
          last_name,
          phone
        ),
        shipping_address:shipping_address_id (
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country
        ),
        order_items (*)
      `)
      .ilike('order_number', `%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching orders:', error);
      throw error;
    }

    return data as Order[];
  },

  deleteOrder: async (orderId: string): Promise<void> => {
    // First delete order items
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error deleting order items:', itemsError);
      throw itemsError;
    }

    // Then delete the order
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (orderError) {
      console.error('Error deleting order:', orderError);
      throw orderError;
    }

    console.log('Order deleted successfully:', orderId);
  },

  createSampleOrders: async (): Promise<void> => {
    // Dummy data for sample orders
    const sampleOrders = [
      {
        order_number: '23070001',
        customer_id: 'f5c14996-699e-495b-b999-3f827a246989',
        shipping_address_id: 'a7a94e96-a923-4499-a944-598c4499e989',
        total_amount: 1299,
        currency: 'INR',
        stage: 'pending' as OrderStage,
      },
      {
        order_number: '23070002',
        customer_id: 'f5c14996-699e-495b-b999-3f827a246989',
        shipping_address_id: 'a7a94e96-a923-4499-a944-598c4499e989',
        total_amount: 2199,
        currency: 'INR',
        stage: 'pending' as OrderStage,
      },
    ];

    const { error } = await supabase
      .from('orders')
      .insert(sampleOrders);

    if (error) {
      console.error('Error creating sample orders:', error);
      throw error;
    }
  },

  // Add the missing syncShopifyOrderToSupabase method
  syncShopifyOrderToSupabase: async (shopifyOrder: ShopifyOrder): Promise<string> => {
    console.log(`Syncing single Shopify order to Supabase:`, shopifyOrder.id);
    
    try {
      // Check if order already exists
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('shopify_order_id', parseInt(shopifyOrder.id))
        .single();

      if (existingOrder) {
        console.log(`Order ${shopifyOrder.order_number} already exists, returning existing ID`);
        return existingOrder.id;
      }

      // Prioritize phone number: shipping_address.phone first, then customer.phone
      const phoneNumber = shopifyOrder.shipping_address?.phone || shopifyOrder.customer?.phone || null;
      console.log(`Order ${shopifyOrder.order_number}: using phone = ${phoneNumber} (shipping: ${shopifyOrder.shipping_address?.phone}, customer: ${shopifyOrder.customer?.phone})`);

      // Create or get customer
      let customerId = null;
      if (shopifyOrder.customer) {
        const customerData = {
          first_name: shopifyOrder.customer.first_name || null,
          last_name: shopifyOrder.customer.last_name || null,
          phone: phoneNumber, // Use the prioritized phone number
          email: shopifyOrder.customer.email || null,
          shopify_customer_id: shopifyOrder.customer.id ? parseInt(shopifyOrder.customer.id.toString()) : null,
        };

        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .upsert(customerData, { 
            onConflict: 'shopify_customer_id',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (customerError) {
          console.error('Error creating/updating customer:', customerError);
          throw customerError;
        }
        customerId = customer.id;
      }

      // Create shipping address
      let shippingAddressId = null;
      if (shopifyOrder.shipping_address) {
        const { data: address, error: addressError } = await supabase
          .from('addresses')
          .insert({
            customer_id: customerId,
            address_line_1: shopifyOrder.shipping_address.address1 || '',
            address_line_2: shopifyOrder.shipping_address.address2 || null,
            city: shopifyOrder.shipping_address.city || '',
            state: shopifyOrder.shipping_address.province || null,
            postal_code: shopifyOrder.shipping_address.zip || null,
            country: shopifyOrder.shipping_address.country || 'India',
          })
          .select()
          .single();

        if (addressError) {
          console.error('Error creating address:', addressError);
          throw addressError;
        }
        shippingAddressId = address.id;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: shopifyOrder.order_number,
          customer_id: customerId,
          shipping_address_id: shippingAddressId,
          total_amount: parseFloat(shopifyOrder.total_amount || '0'),
          currency: shopifyOrder.currency || 'INR',
          shopify_order_id: parseInt(shopifyOrder.id),
          stage: 'packing' as OrderStage,
          printed_at: new Date().toISOString(),
          created_at: shopifyOrder.created_at,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw orderError;
      }

      // Create order items
      if (shopifyOrder.line_items && shopifyOrder.line_items.length > 0) {
        const orderItems = shopifyOrder.line_items.map(item => ({
          order_id: order.id,
          title: item.title || item.name || 'Unknown Item',
          quantity: item.quantity || 1,
          price: parseFloat(item.price?.toString() || '0'),
          total: parseFloat(item.price?.toString() || '0') * (item.quantity || 1),
          sku: item.sku || null,
          shopify_variant_id: item.variant_id ? parseInt(item.variant_id.toString()) : null,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('Error creating order items:', itemsError);
          throw itemsError;
        }
      }

      console.log(`Successfully synced single order ${shopifyOrder.order_number} with phone: ${phoneNumber}`);
      return order.id;

    } catch (error) {
      console.error(`Error syncing single order ${shopifyOrder.order_number}:`, error);
      throw error;
    }
  },

  syncShopifyOrders: async (shopifyOrders: ShopifyOrder[]) => {
    console.log(`Starting sync of ${shopifyOrders.length} Shopify orders`);
    
    for (const shopifyOrder of shopifyOrders) {
      try {
        // Check if order already exists
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('shopify_order_id', parseInt(shopifyOrder.id))
          .single();

        if (existingOrder) {
          console.log(`Order ${shopifyOrder.order_number} already exists, skipping`);
          continue;
        }

        // Prioritize phone number: shipping_address.phone first, then customer.phone
        const phoneNumber = shopifyOrder.shipping_address?.phone || shopifyOrder.customer?.phone || null;
        console.log(`Order ${shopifyOrder.order_number}: using phone = ${phoneNumber} (shipping: ${shopifyOrder.shipping_address?.phone}, customer: ${shopifyOrder.customer?.phone})`);

        // Create or get customer
        let customerId = null;
        if (shopifyOrder.customer) {
          const customerData = {
            first_name: shopifyOrder.customer.first_name || null,
            last_name: shopifyOrder.customer.last_name || null,
            phone: phoneNumber, // Use the prioritized phone number
            email: shopifyOrder.customer.email || null,
            shopify_customer_id: shopifyOrder.customer.id ? parseInt(shopifyOrder.customer.id.toString()) : null,
          };

          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .upsert(customerData, { 
              onConflict: 'shopify_customer_id',
              ignoreDuplicates: false 
            })
            .select()
            .single();

          if (customerError) {
            console.error('Error creating/updating customer:', customerError);
            continue;
          }
          customerId = customer.id;
        }

        // Create shipping address
        let shippingAddressId = null;
        if (shopifyOrder.shipping_address) {
          const { data: address, error: addressError } = await supabase
            .from('addresses')
            .insert({
              customer_id: customerId,
              address_line_1: shopifyOrder.shipping_address.address1 || '',
              address_line_2: shopifyOrder.shipping_address.address2 || null,
              city: shopifyOrder.shipping_address.city || '',
              state: shopifyOrder.shipping_address.province || null,
              postal_code: shopifyOrder.shipping_address.zip || null,
              country: shopifyOrder.shipping_address.country || 'India',
            })
            .select()
            .single();

          if (addressError) {
            console.error('Error creating address:', addressError);
          } else {
            shippingAddressId = address.id;
          }
        }

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: shopifyOrder.order_number,
            customer_id: customerId,
            shipping_address_id: shippingAddressId,
            total_amount: parseFloat(shopifyOrder.total_amount || '0'),
            currency: shopifyOrder.currency || 'INR',
            shopify_order_id: parseInt(shopifyOrder.id),
            stage: 'pending',
            created_at: shopifyOrder.created_at,
          })
          .select()
          .single();

        if (orderError) {
          console.error('Error creating order:', orderError);
          continue;
        }

        // Create order items
        if (shopifyOrder.line_items && shopifyOrder.line_items.length > 0) {
          const orderItems = shopifyOrder.line_items.map(item => ({
            order_id: order.id,
            title: item.title || item.name || 'Unknown Item',
            quantity: item.quantity || 1,
            price: parseFloat(item.price?.toString() || '0'),
            total: parseFloat(item.price?.toString() || '0') * (item.quantity || 1),
            sku: item.sku || null,
            shopify_variant_id: item.variant_id ? parseInt(item.variant_id.toString()) : null,
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

          if (itemsError) {
            console.error('Error creating order items:', itemsError);
          }
        }

        console.log(`Successfully synced order ${shopifyOrder.order_number} with phone: ${phoneNumber}`);

      } catch (error) {
        console.error(`Error syncing order ${shopifyOrder.order_number}:`, error);
      }
    }

    console.log('Shopify orders sync completed');
  },
};
