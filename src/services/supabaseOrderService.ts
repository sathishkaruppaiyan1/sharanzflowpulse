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

  // UPDATED METHOD - carrier is now a free-text display name from courier_partners
  async updateTracking(
    orderId: string,
    trackingNumber: string,
    carrierName: string,       // display name, e.g. "Delhivery"
    trackingUrl: string = ''   // full URL with {number} already replaced
  ): Promise<Order> {
    console.log(`🚀 Starting tracking update for order ${orderId}: ${trackingNumber} via ${carrierName}`);

    const { data, error } = await supabase
      .from('orders')
      .update({
        tracking_number: trackingNumber,
        carrier: carrierName,
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
      const whatsappSuccess = await sendOrderShippedNotification(order, trackingNumber, carrierName, trackingUrl);
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
        await this.updateShopifyOrderFulfillment(order.shopify_order_id.toString(), trackingNumber, carrierName, trackingUrl);
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

  async updateShopifyOrderFulfillment(shopifyOrderId: string, trackingNumber: string, carrierName: string, trackingUrl: string = ''): Promise<void> {
    console.log(`🔄 Shopify fulfillment update — Order: ${shopifyOrderId}, Tracking: ${trackingNumber}, Carrier: ${carrierName}`);

    const { data, error } = await supabase.functions.invoke('update-shopify-fulfillment', {
      body: {
        shopify_order_id: shopifyOrderId,
        tracking_number: trackingNumber,
        carrier: carrierName,
        tracking_url: trackingUrl
      }
    });

    if (error) {
      console.error('❌ Edge function invocation error:', error);
      throw new Error(error.message || 'Edge function failed');
    }

    console.log('📋 Edge function response:', data);

    if (data?.error) {
      console.error('❌ Shopify fulfillment error:', data.error, data.details);
      throw new Error(`Shopify fulfillment failed: ${data.error}`);
    }

    if (data?.success || data?.action === 'order_already_fulfilled') {
      console.log('✅ Shopify fulfillment updated successfully');
      return;
    }

    console.warn('⚠️ Unexpected response:', data);
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
