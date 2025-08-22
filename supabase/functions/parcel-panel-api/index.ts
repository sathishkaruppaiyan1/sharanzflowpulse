
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

    // Handle different API actions
    switch (action) {
      case 'fetchTrackingByOrderNumber':
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
        apiUrl = `https://open.parcelpanel.com/api/v2/tracking/order?order_number=${encodeURIComponent(orderNumber)}`
        break

      case 'trackPackage':
        if (!trackingNumber) {
          return new Response(
            JSON.stringify({ 
              error: 'Tracking number is required',
              code: 400
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        apiUrl = `https://open.parcelpanel.com/api/v2/tracking?tracking_number=${encodeURIComponent(trackingNumber)}`
        break

      case 'fetchOrders':
        const queryParams = new URLSearchParams()
        if (params.page) queryParams.append('page', params.page.toString())
        if (params.limit) queryParams.append('limit', params.limit.toString())
        if (params.status) queryParams.append('status', params.status)
        
        apiUrl = `https://open.parcelpanel.com/api/v2/orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`
        break

      case 'getAnalytics':
        const analyticsParams = new URLSearchParams()
        if (params.start_date) analyticsParams.append('start_date', params.start_date)
        if (params.end_date) analyticsParams.append('end_date', params.end_date)
        
        apiUrl = `https://open.parcelpanel.com/api/v2/analytics${analyticsParams.toString() ? '?' + analyticsParams.toString() : ''}`
        break

      case 'getSupportedCouriers':
        apiUrl = 'https://open.parcelpanel.com/api/v2/couriers'
        break

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action specified',
            code: 400
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
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

    // Store tracking data in database if this is a successful tracking fetch
    if (action === 'fetchTrackingByOrderNumber' && responseData.data?.trackings) {
      try {
        const tracking = responseData.data.trackings[0]
        
        const deliveryData = {
          order_number: orderNumber,
          tracking_number: tracking?.tracking_number,
          courier_code: tracking?.courier_code,
          courier_name: tracking?.courier_name,
          status: tracking?.status,
          sub_status: tracking?.sub_status,
          origin_country: tracking?.origin_country,
          destination_country: tracking?.destination_country,
          estimated_delivery_date: tracking?.estimated_delivery_date,
          delivered_at: tracking?.delivered_at,
          shipped_at: tracking?.shipped_at,
          tracking_events: tracking?.tracking_events || [],
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

    // Return successful response
    return new Response(
      JSON.stringify({
        code: 200,
        message: 'Success',
        data: responseData.data || responseData
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
