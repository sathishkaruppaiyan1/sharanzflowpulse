
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
    const { action, orderNumber, trackingNumber, ...params } = body

    let apiUrl = ''
    let fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-parcelpanel-api-key': apiKey
      }
    }

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

    // Use only the specified Parcel Panel API endpoint
    apiUrl = `https://open.parcelpanel.com/api/v2/tracking/order?order_number=${encodeURIComponent(orderNumber)}`

    console.log(`Making request to: ${apiUrl}`)
    console.log('Request headers:', fetchOptions.headers)

    // Make request to Parcel Panel API
    const response = await fetch(apiUrl, fetchOptions)
    const responseData = await response.json()

    console.log('Parcel Panel API response status:', response.status)
    console.log('Parcel Panel API response:', JSON.stringify(responseData, null, 2))
    console.log('responseData.data structure:', JSON.stringify(responseData.data, null, 2))

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

    // Store tracking data in database if this is a successful tracking fetch
    if (action === 'fetchTrackingByOrderNumber' && responseData.data?.order?.shipments?.length > 0) {
      try {
        // Use the first shipment for storage
        const shipment = responseData.data.order.shipments[0];
        
        const deliveryData = {
          order_number: orderNumber,
          tracking_number: shipment.tracking_number,
          courier_code: shipment.carrier?.code,
          courier_name: shipment.carrier?.name,
          status: shipment.status,
          sub_status: shipment.substatus_label || shipment.status_label,
          origin_country: 'IN',
          destination_country: responseData.data.order?.shipping_address?.country || 'IN',
          estimated_delivery_date: shipment.estimated_delivery_date,
          delivered_at: shipment.delivery_date,
          shipped_at: shipment.fulfillment_date,
          tracking_events: shipment.checkpoints?.map(checkpoint => ({
            time: checkpoint.checkpoint_time,
            description: checkpoint.detail,
            location: checkpoint.detail.split(',').slice(-2).join(',').trim(),
            status: checkpoint.status_label
          })) || [],
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
      } catch (storeError) {
        console.error('Error processing tracking data for storage:', storeError)
      }
    }

    // Transform Parcel Panel API response to expected format
    let responseDataForClient = { trackings: [] };
    
    if (responseData.data?.order?.shipments && Array.isArray(responseData.data.order.shipments)) {
      // Transform shipments to trackings format
      responseDataForClient.trackings = responseData.data.order.shipments.map(shipment => ({
        tracking_number: shipment.tracking_number,
        courier_code: shipment.carrier?.code,
        courier_name: shipment.carrier?.name,
        status: shipment.status,
        sub_status: shipment.substatus_label || shipment.status_label,
        origin_country: 'IN', // Default based on the data shown
        destination_country: responseData.data.order?.shipping_address?.country || 'IN',
        estimated_delivery_date: shipment.estimated_delivery_date,
        delivered_at: shipment.delivery_date,
        shipped_at: shipment.fulfillment_date,
        tracking_events: shipment.checkpoints?.map(checkpoint => ({
          time: checkpoint.checkpoint_time,
          description: checkpoint.detail,
          location: checkpoint.detail.split(',').slice(-2).join(',').trim(), // Extract location from detail
          status: checkpoint.status_label
        })) || []
      }));
    }
    
    console.log('Final response structure for client:', JSON.stringify(responseDataForClient, null, 2));
    
    return new Response(
      JSON.stringify({
        code: 200,
        message: 'Success',
        data: responseDataForClient
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
