
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== PARCEL PANEL WEBHOOK STARTED ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)
  
  // Add headers logging for debugging
  console.log('Request headers:', Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET requests for testing webhook URL
  if (req.method === 'GET') {
    console.log('=== WEBHOOK URL TEST ===')
    return new Response(
      JSON.stringify({ 
        message: 'Parcel Panel webhook endpoint is working!',
        timestamp: new Date().toISOString(),
        status: 'active'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    console.log('Creating Supabase client...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Reading webhook payload...')
    const webhookData = await req.json()
    console.log('Webhook data received:', JSON.stringify(webhookData, null, 2))

    // Log webhook receipt to system_settings for debugging
    const webhookLogEntry = {
      key: `webhook_received_${Date.now()}`,
      value: {
        type: 'parcel_panel_webhook',
        timestamp: new Date().toISOString(),
        method: req.method,
        headers: Object.fromEntries(req.headers.entries()),
        data: webhookData,
        status: 'received'
      }
    }

    const { error: logError } = await supabase
      .from('system_settings')
      .insert(webhookLogEntry)

    if (logError) {
      console.error('Error logging webhook:', logError)
    } else {
      console.log('Webhook logged successfully')
    }

    // Extract tracking information from webhook payload
    const { 
      tracking_number, 
      order_number, 
      status, 
      sub_status,
      courier_code, 
      courier_name,
      origin_country,
      destination_country,
      estimated_delivery_date,
      delivered_at,
      shipped_at,
      tracking_events 
    } = webhookData

    console.log('Processing tracking update for:', { tracking_number, order_number, status })

    // Find the order by order number or tracking number
    let orderId = null;
    
    if (order_number) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', order_number)
        .single()

      if (orderData) {
        orderId = orderData.id
      } else {
        console.log('Order not found by order_number, trying tracking_number...')
      }
    }

    // If not found by order number, try tracking number
    if (!orderId && tracking_number) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('tracking_number', tracking_number)
        .single()

      if (orderData) {
        orderId = orderData.id
      }
    }

    if (!orderId) {
      console.log('Order not found in database, creating webhook log entry...')
      
      // Log the webhook for debugging purposes even if order not found
      const { error: logError } = await supabase
        .from('system_settings')
        .upsert({
          key: `webhook_log_${Date.now()}`,
          value: {
            type: 'parcel_panel_webhook',
            timestamp: new Date().toISOString(),
            data: webhookData,
            status: 'order_not_found'
          }
        })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook received but order not found in database',
          order_number,
          tracking_number 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found order ID:', orderId)

    // Update or create tracking details
    const trackingDetailsData = {
      order_id: orderId,
      tracking_number: tracking_number || null,
      courier_code: courier_code || null,
      courier_name: courier_name || null,
      status: status || null,
      sub_status: sub_status || null,
      origin_country: origin_country || null,
      destination_country: destination_country || null,
      estimated_delivery_date: estimated_delivery_date || null,
      delivered_at: delivered_at || null,
      shipped_at: shipped_at || null,
      tracking_events: tracking_events || [],
      last_updated: new Date().toISOString()
    }

    console.log('Upserting tracking details:', trackingDetailsData)

    const { error: upsertError } = await supabase
      .from('order_tracking_details')
      .upsert(trackingDetailsData, {
        onConflict: 'order_id'
      })

    if (upsertError) {
      console.error('Error upserting tracking details:', upsertError)
      throw upsertError
    }

    // Update order status and tracking number if provided
    const orderUpdates: any = {
      updated_at: new Date().toISOString()
    }

    if (tracking_number) {
      orderUpdates.tracking_number = tracking_number
    }

    // Update order stage based on tracking status
    if (status) {
      const normalizedStatus = status.toLowerCase()
      if (normalizedStatus.includes('delivered')) {
        orderUpdates.stage = 'completed'
        orderUpdates.delivered_at = delivered_at || new Date().toISOString()
      } else if (normalizedStatus.includes('shipped') || normalizedStatus.includes('transit')) {
        orderUpdates.stage = 'tracking'
        if (shipped_at) {
          orderUpdates.shipped_at = shipped_at
        }
      }
    }

    console.log('Updating order with:', orderUpdates)

    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update(orderUpdates)
      .eq('id', orderId)

    if (orderUpdateError) {
      console.error('Error updating order:', orderUpdateError)
      // Don't throw here, tracking details are more important
    }

    console.log('=== WEBHOOK PROCESSING COMPLETE ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Tracking details updated successfully',
        order_id: orderId,
        tracking_number,
        status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== WEBHOOK ERROR ===')
    console.error('Error processing webhook:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
