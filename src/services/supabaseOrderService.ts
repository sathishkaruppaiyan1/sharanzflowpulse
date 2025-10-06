import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderStage, CarrierType } from '@/types/database';
import { sendOrderShippedNotification } from '@/services/interakt/orderNotificationService';
import { ParcelPanelService } from '@/services/parcelPanelService';

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

  // UPDATED METHOD - Replace your existing updateTracking method with this
  async updateTracking(orderId: string, trackingNumber: string, carrier: CarrierType): Promise<Order> {
    console.log(`🚀 Starting tracking update for order ${orderId}: ${trackingNumber} via ${carrier}`);
    
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
      console.error('❌ Error updating tracking in database:', error);
      throw error;
    }

    const order = data as Order;
    console.log(`✅ Successfully updated tracking for order ${order.order_number}`);

    // Auto-fetch tracking details from Parcel Panel (will be handled by the tracking update hook)
    console.log('🔄 Tracking details auto-fetch will be handled by the tracking update hook');

    // Send WhatsApp notification via Interakt
    try {
      console.log('📱 Attempting to send WhatsApp notification...');
      const whatsappSuccess = await sendOrderShippedNotification(order, trackingNumber, carrier);
      if (whatsappSuccess) {
        console.log('✅ WhatsApp notification sent successfully');
      } else {
        console.log('❌ WhatsApp notification failed');
      }
    } catch (whatsappError) {
      console.error('📱 WhatsApp notification error:', whatsappError);
    }

    // Update Shopify order status to fulfilled
    if (order.shopify_order_id) {
      try {
        console.log('🛍️ Attempting to update Shopify order status...');
        console.log(`🔗 Shopify Order ID: ${order.shopify_order_id}`);
        console.log(`📦 Tracking Details: ${trackingNumber} via ${carrier}`);
        
        await this.updateShopifyOrderFulfillment(order.shopify_order_id.toString(), trackingNumber, carrier);
        console.log('✅ Shopify order status updated successfully');
      } catch (shopifyError) {
        console.error('❌ Shopify update failed:', shopifyError);
        console.error('🔍 Shopify error details:', shopifyError.message);
        
        // Don't throw here - we want the order to be updated even if Shopify fails
        console.warn('⚠️ Order tracking updated locally but Shopify sync failed.');
      }
    } else {
      console.log('⚠️ No Shopify order ID found, skipping Shopify update');
    }

    return order;
  },

  // FIXED METHOD - Use current user session token instead of hardcoded values
  async updateShopifyOrderFulfillment(shopifyOrderId: string, trackingNumber: string, carrier: CarrierType): Promise<void> {
    console.log(`🔄 STARTING Shopify fulfillment update`);
    console.log(`📋 Order ID: ${shopifyOrderId}`);
    console.log(`📦 Tracking: ${trackingNumber}`);
    console.log(`🚚 Carrier: ${carrier}`);
    
    try {
      // Get current session to use valid JWT token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const requestPayload = {
        shopify_order_id: shopifyOrderId,
        tracking_number: trackingNumber,
        carrier: carrier
      };

      console.log('📤 Sending request to edge function:', JSON.stringify(requestPayload, null, 2));

      // Use current user's session token for authentication
      const response = await fetch(`https://jmqpqgxqhfctyfjtlbbm.supabase.co/functions/v1/update-shopify-fulfillment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcXBxZ3hxaGZjdHlmanRsYmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4Nzk5MzksImV4cCI6MjA2NzQ1NTkzOX0.-yFmt-q8qrob0h_nUFt_aYRaU6cw0XSAkyjXVx4bgHE',
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('📥 Raw response status:', response.status);
      console.log('📥 Raw response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📋 Response data:', JSON.stringify(data, null, 2));

      // Check for application errors in the response
      if (data.error) {
        console.error('❌ Shopify API error:', data.error);
        if (data.details) console.error('📋 Error details:', data.details);
        if (data.shopifyError) console.error('🔍 Shopify error data:', data.shopifyError);
        throw new Error(`Shopify fulfillment failed: ${data.error}`);
      }

      // Success case
      if (data.success) {
        console.log('✅ Shopify fulfillment updated successfully');
        if (data.action) console.log('🎯 Action taken:', data.action);
        if (data.fulfillment) {
          console.log('📊 Fulfillment details:', {
            id: data.fulfillment?.fulfillment?.id,
            status: data.fulfillment?.fulfillment?.status,
            tracking_number: data.fulfillment?.fulfillment?.tracking_number
          });
        }
        return;
      }

      // If we get here, the response format is unexpected
      console.warn('⚠️ Unexpected response format:', data);
      throw new Error('Unexpected response format from Shopify fulfillment service');

    } catch (error) {
      console.error('💥 FAILED to update Shopify fulfillment:', error);
      console.error('🔍 Error type:', error.constructor.name);
      console.error('📝 Error message:', error.message);
      
      // Re-throw with more context
      throw new Error(`Shopify fulfillment update failed: ${error.message}`);
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

  async createOrderFromShopify(shopifyOrder: any, targetStage: OrderStage = 'packing'): Promise<string> {
    console.log('Creating/Upserting order in Supabase via RPC from Shopify order:', shopifyOrder.id);

    try {
      // Use idempotent RPC that upserts orders and items server-side to avoid duplicates
      const { data: orderId, error } = await (supabase as any).rpc('sync_shopify_order_to_db', {
        shopify_order_data: shopifyOrder
      });

      if (error) throw error;

      // Ensure stage is set appropriately for printing when requested.
      // On insert the RPC sets stage='printing', but on conflict it doesn't change stage.
      // We only promote to 'printing' if it's currently 'pending'.
      if (targetStage === 'printing' && orderId) {
        await supabase
          .from('orders')
          .update({ stage: 'printing' as OrderStage, printed_at: new Date().toISOString() })
          .eq('id', orderId)
          .eq('stage', 'pending');
      }

      console.log('Successfully synced (idempotent) order in Supabase:', orderId);
      return orderId as string;
    } catch (error) {
      console.error('Error creating/upserting order from Shopify via RPC:', error);
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
