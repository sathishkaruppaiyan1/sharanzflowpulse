
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== PARCEL PANEL API FUNCTION STARTED ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders });
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

    // Get API configuration from database
    console.log('Fetching Parcel Panel API configuration...')
    const { data: configData, error: configError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'api_configs')
      .single()

    if (configError || !configData?.value?.parcel_panel?.api_key) {
      console.error('Parcel Panel API not configured:', configError)
      return new Response(
        JSON.stringify({ 
          error: 'Parcel Panel API not configured',
          code: 'API_NOT_CONFIGURED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = configData.value.parcel_panel.api_key
    console.log('API key found, processing request...')

    const requestData = await req.json()
    const { action, ...params } = requestData

    console.log('Action requested:', action)
    console.log('Parameters:', params)

    let response
    let result

    switch (action) {
      case 'fetchOrders':
        console.log('Fetching orders from Parcel Panel...')
        const ordersUrl = new URL('https://api.parcelpanel.com/api/v1/orders')
        if (params.page) ordersUrl.searchParams.append('page', params.page.toString())
        if (params.limit) ordersUrl.searchParams.append('limit', params.limit.toString())
        if (params.status) ordersUrl.searchParams.append('status', params.status)

        response = await fetch(ordersUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey,
          },
        })
        result = await response.json()
        break

      case 'trackPackage':
        console.log('Tracking package:', params.trackingNumber)
        const trackUrl = `https://api.parcelpanel.com/api/v1/trackings/${params.trackingNumber}`
        response = await fetch(trackUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey,
          },
        })
        result = await response.json()
        break

      case 'fetchTrackingByOrderNumber':
        console.log('Fetching tracking by order number:', params.orderNumber)
        const orderTrackUrl = `https://open.parcelpanel.com/api/v2/tracking/order?order_number=${params.orderNumber}`
        response = await fetch(orderTrackUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey,
          }
        })
        result = await response.json()
        break

      case 'getAnalytics':
        console.log('Fetching analytics...')
        const analyticsUrl = new URL('https://api.parcelpanel.com/api/v1/analytics/orders')
        if (params.start_date) analyticsUrl.searchParams.append('start_date', params.start_date)
        if (params.end_date) analyticsUrl.searchParams.append('end_date', params.end_date)

        response = await fetch(analyticsUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey,
          },
        })
        result = await response.json()
        break

      case 'getSupportedCouriers':
        console.log('Fetching supported couriers...')
        response = await fetch('https://api.parcelpanel.com/api/v1/couriers', {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey,
          },
        })
        result = await response.json()
        break

      default:
        console.error('Unknown action:', action)
        return new Response(
          JSON.stringify({ error: 'Unknown action', action }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    console.log('API response status:', response?.status)
    console.log('API response received:', result)

    if (!response?.ok) {
      console.error('API request failed:', response?.status, result)
      return new Response(
        JSON.stringify({ 
          error: 'Parcel Panel API request failed',
          details: result,
          status: response?.status
        }),
        { status: response?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store tracking details if it's a tracking request and order ID is provided
    if (action === 'fetchTrackingByOrderNumber' && params.orderId && result.code === 200 && result.data?.trackings?.length > 0) {
      console.log('Storing tracking details in database...')
      const tracking = result.data.trackings[0]
      
      const { error: upsertError } = await supabase
        .from('order_tracking_details')
        .upsert({
          order_id: params.orderId,
          tracking_number: tracking.tracking_number,
          courier_code: tracking.courier_code,
          courier_name: tracking.courier_name,
          status: tracking.status,
          sub_status: tracking.sub_status,
          origin_country: tracking.origin_country,
          destination_country: tracking.destination_country,
          estimated_delivery_date: tracking.estimated_delivery_date,
          delivered_at: tracking.delivered_at,
          shipped_at: tracking.shipped_at,
          tracking_events: tracking.tracking_events || [],
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'order_id'
        })

      if (upsertError) {
        console.error('Error storing tracking details:', upsertError)
      } else {
        console.log('Successfully stored tracking details')
      }
    }

    console.log('=== PARCEL PANEL API FUNCTION COMPLETE ===')

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== PARCEL PANEL API FUNCTION ERROR ===')
    console.error('Error:', error)
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
