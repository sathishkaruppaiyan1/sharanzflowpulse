
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderStage, CarrierType } from '@/types/database';
import { sendOrderShippedNotification } from '@/services/interakt/orderNotificationService';

export const supabaseOrderService = {
  async fetchOrders(): Promise<Order[]> {
    console.log('Fetching all orders with order items and variation details...');
    
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
    console.log(`Fetching orders for stage: ${stage} with variation details`);
    
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
    
    // Debug phone numbers and variation data for each order
    data?.forEach(order => {
      console.log(`Order ${order.order_number} debug:`, {
        customerPhone: order.customer?.phone,
        hasCustomer: !!order.customer,
        customerId: order.customer_id,
        itemsWithVariations: order.order_items?.map(item => ({
          id: item.id,
          title: item.title,
          sku: item.sku,
          variant_title: item.variant_title,
          variant_options: item.variant_options,
          shopify_variant_id: item.shopify_variant_id
        }))
      });
    });
    
    return data as Order[] || [];
  },

  async updateOrderStage(orderId: string, stage: OrderStage): Promise<Order> {
    console.log(`Updating order ${orderId} to stage ${stage}`);
    
    const updateData: any = { stage };
    
    // Add timestamp fields based on stage
    if (stage === 'packing') {
      updateData.printed_at = new Date().toISOString();
    } else if (stage === 'tracking') {
      updateData.packed_at = new Date().toISOString();
    } else if (stage === 'shipped') {
      updateData.shipped_at = new Date().toISOString();
    } else if (stage === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
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
    console.log(`Updating tracking for order ${orderId}: ${trackingNumber} via ${carrier}`);
    
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        tracking_number: trackingNumber,
        carrier,
        stage: 'shipped' as OrderStage,
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

    const order = data as Order;
    console.log(`Successfully updated tracking for order ${order.order_number}`);

    // Send WhatsApp notification via Interakt
    try {
      console.log('Attempting to send WhatsApp notification...');
      const whatsappSuccess = await sendOrderShippedNotification(order, trackingNumber, carrier);
      if (whatsappSuccess) {
        console.log('✅ WhatsApp notification sent successfully');
      } else {
        console.log('❌ WhatsApp notification failed');
      }
    } catch (whatsappError) {
      console.error('WhatsApp notification error:', whatsappError);
    }

    // Update Shopify order status to fulfilled
    try {
      console.log('Attempting to update Shopify order status...');
      if (order.shopify_order_id) {
        await this.updateShopifyOrderFulfillment(order.shopify_order_id.toString(), trackingNumber, carrier);
        console.log('✅ Shopify order status updated successfully');
      } else {
        console.log('⚠️ No Shopify order ID found, skipping Shopify update');
      }
    } catch (shopifyError) {
      console.error('Shopify update error:', shopifyError);
    }

    return order;
  },

  async updateShopifyOrderFulfillment(shopifyOrderId: string, trackingNumber: string, carrier: CarrierType): Promise<void> {
    console.log(`Updating Shopify order ${shopifyOrderId} fulfillment`);
    
    try {
      const { data, error } = await supabase.functions.invoke('update-shopify-fulfillment', {
        body: {
          shopify_order_id: shopifyOrderId,
          tracking_number: trackingNumber,
          carrier: carrier
        }
      });

      if (error) {
        console.error('Error calling update-shopify-fulfillment function:', error);
        throw error;
      }

      console.log('Shopify fulfillment update response:', data);
    } catch (error) {
      console.error('Failed to update Shopify fulfillment:', error);
      throw error;
    }
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

  async createOrderFromShopify(shopifyOrder: any): Promise<string> {
    console.log('Creating order in Supabase from Shopify order:', shopifyOrder.id);
    
    try {
      // Determine the best phone number from Shopify data
      const phoneNumber = shopifyOrder.shipping_address?.phone || 
                         shopifyOrder.customer?.phone || 
                         null;
      
      console.log('Phone number priority for order:', shopifyOrder.id, {
        shippingPhone: shopifyOrder.shipping_address?.phone,
        customerPhone: shopifyOrder.customer?.phone,
        finalPhone: phoneNumber
      });

      // First, create or get customer with proper phone number handling
      let customerId = null;
      if (shopifyOrder.customer) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('shopify_customer_id', shopifyOrder.customer.id)
          .single();

        if (existingCustomer) {
          // Update existing customer with phone number if we have a better one
          if (phoneNumber) {
            await supabase
              .from('customers')
              .update({ phone: phoneNumber })
              .eq('id', existingCustomer.id);
          }
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              shopify_customer_id: shopifyOrder.customer.id,
              email: shopifyOrder.customer.email,
              first_name: shopifyOrder.customer.first_name,
              last_name: shopifyOrder.customer.last_name,
              phone: phoneNumber // Use the prioritized phone number
            })
            .select('id')
            .single();

          if (customerError) throw customerError;
          customerId = newCustomer.id;
        }
      }

      // Create shipping address
      let shippingAddressId = null;
      if (shopifyOrder.shipping_address) {
        const { data: newAddress, error: addressError } = await supabase
          .from('addresses')
          .insert({
            customer_id: customerId,
            address_line_1: shopifyOrder.shipping_address.address1,
            address_line_2: shopifyOrder.shipping_address.address2,
            city: shopifyOrder.shipping_address.city,
            state: shopifyOrder.shipping_address.province,
            postal_code: shopifyOrder.shipping_address.zip,
            country: shopifyOrder.shipping_address.country
          })
          .select('id')
          .single();

        if (addressError) throw addressError;
        shippingAddressId = newAddress.id;
      }

      // Create order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          shopify_order_id: Number(shopifyOrder.id),
          order_number: shopifyOrder.order_number || shopifyOrder.name,
          customer_id: customerId,
          shipping_address_id: shippingAddressId,
          stage: 'packing',
          total_amount: parseFloat(shopifyOrder.current_total_price || shopifyOrder.total_amount || '0'),
          currency: shopifyOrder.currency || 'INR',
          printed_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      // Create order items with enhanced variation details
      if (shopifyOrder.line_items) {
        const orderItems = shopifyOrder.line_items.map((item: any) => ({
          order_id: newOrder.id,
          shopify_variant_id: item.variant_id,
          title: item.title || item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: parseFloat(item.price || '0'),
          total: parseFloat(item.price || '0') * item.quantity,
          variant_title: item.variant_title || null,
          variant_options: item.properties || item.variant_options || {}
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      console.log('Successfully created order in Supabase with variation details:', newOrder.id);
      console.log('Customer phone number stored:', phoneNumber);
      return newOrder.id;
      
    } catch (error) {
      console.error('Error creating order from Shopify:', error);
      throw error;
    }
  },

  async syncShopifyOrderToSupabase(shopifyOrder: any): Promise<string> {
    console.log('Syncing Shopify order to Supabase:', shopifyOrder.id);
    
    // Check if order already exists
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('shopify_order_id', shopifyOrder.id)
      .single();

    if (existingOrder) {
      // Update existing order to packing stage
      await this.updateOrderStage(existingOrder.id, 'packing');
      return existingOrder.id;
    } else {
      // Create new order
      return await this.createOrderFromShopify(shopifyOrder);
    }
  },

  async updateOrderItemPacked(itemId: string, packed: boolean): Promise<void> {
    console.log(`Updating order item ${itemId} packed status to ${packed}`);
    
    const { error } = await supabase
      .from('order_items')
      .update({ packed })
      .eq('id', itemId);

    if (error) {
      console.error('Error updating order item packed status:', error);
      throw error;
    }

    console.log(`Successfully updated order item ${itemId} packed status`);
  },

  async createSampleOrders(): Promise<void> {
    console.log('Sample order creation not implemented yet');
  }
};
