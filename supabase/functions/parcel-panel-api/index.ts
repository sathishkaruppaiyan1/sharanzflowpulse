
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get API configurations from database
    const { data: configData, error: configError } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'api_configs')
      .single()

    if (configError || !configData?.value?.parcel_panel?.api_key) {
      console.error('Failed to get Parcel Panel API key:', configError)
      return new Response(
        JSON.stringify({ 
          error: 'Parcel Panel API configuration not found',
          code: 500
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const parcelPanelConfig = configData.value.parcel_panel
    const apiKey = parcelPanelConfig.api_key
    
    console.log('Using Parcel Panel API key:', apiKey ? 'Present' : 'Missing')

    const body = await req.json()
    const { action, orderNumber } = body

    // Only support fetchTrackingByOrderNumber action
    if (action !== 'fetchTrackingByOrderNumber') {
      return new Response(
        JSON.stringify({ 
          error: 'Only fetchTrackingByOrderNumber action is supported',
          code: 400
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!orderNumber) {
      return new Response(
        JSON.stringify({ 
          error: 'Order number is required',
          code: 400
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Use the correct Parcel Panel API endpoint
    const apiUrl = `https://open.parcelpanel.com/api/v2/tracking/order?order_number=${encodeURIComponent(orderNumber)}`
    
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-parcelpanel-api-key': apiKey
      }
    }

    console.log(`Making request to: ${apiUrl}`)
    console.log('Request headers:', fetchOptions.headers)

    // Make request to Parcel Panel API
    const response = await fetch(apiUrl, fetchOptions)
    const responseData = await response.json()

    console.log('Parcel Panel API response status:', response.status)
    console.log('Parcel Panel API response:', JSON.stringify(responseData, null, 2))

    // Handle API errors
    if (!response.ok) {
      let errorMessage = 'Parcel Panel API request failed'
      let errorCode = response.status

      if (response.status === 401) {
        errorMessage = 'Invalid API key or access token'
      } else if (response.status === 404) {
        errorMessage = 'Resource not found'
      } else if (responseData.message) {
        errorMessage = responseData.message
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: responseData,
          code: errorCode
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Store delivery tracking data in database if successful
    if (responseData && responseData.order && responseData.order.shipments) {
      try {
        const order = responseData.order;
        const shipment = order.shipments[0]; // Take the first shipment
        
        if (shipment) {
          // Convert checkpoints to tracking events
          const tracking_events = shipment.checkpoints?.map((checkpoint: any) => ({
            time: checkpoint.checkpoint_time,
            description: checkpoint.detail,
            location: checkpoint.detail.split(',').slice(-2).join(',').trim(),
            status: checkpoint.status
          })) || [];

          const deliveryData = {
            order_number: orderNumber,
            tracking_number: shipment.tracking_number,
            courier_code: shipment.carrier?.code,
            courier_name: shipment.carrier?.name,
            status: shipment.status,
            sub_status: shipment.substatus_label || shipment.substatus,
            origin_country: 'India',
            destination_country: order.shipping_address?.country,
            estimated_delivery_date: shipment.estimated_delivery_date,
            delivered_at: shipment.delivery_date,
            shipped_at: shipment.pickup_date,
            tracking_events: tracking_events,
            last_updated: new Date().toISOString()
          }

          const { error: insertError } = await supabaseClient
            .from('delivery_tracking_details')
            .upsert(deliveryData, {
              onConflict: 'order_number'
            })

          if (insertError) {
            console.error('Error storing delivery tracking data:', insertError)
          } else {
            console.log('✅ Delivery tracking data stored successfully')
          }
        }
      } catch (storeError) {
        console.error('Error processing tracking data for storage:', storeError)
      }
    }

    // Return the response data as-is since the frontend expects the raw format
    return new Response(
      JSON.stringify({
        code: 200,
        message: 'Success',
        data: responseData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'Unknown error',
        code: 500
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
