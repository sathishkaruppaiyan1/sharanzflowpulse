
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== EDGE FUNCTION STARTED ===')
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
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      supabaseUrl: supabaseUrl || 'MISSING'
    })
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Reading request body...')
    const requestBody = await req.json()
    console.log('Request body:', requestBody)

    const { shopify_order_id, tracking_number, carrier, tracking_url } = requestBody

    console.log('=== SHOPIFY FULFILLMENT UPDATE START ===')
    console.log('Request data:', { shopify_order_id, tracking_number, carrier, tracking_url })

    // Validate required fields
    if (!shopify_order_id || !tracking_number) {
      console.error('Missing required fields:', { shopify_order_id, tracking_number })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: shopify_order_id, tracking_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching API configurations from system_settings...')
    // Get API configurations from system_settings
    const { data: configData, error: configError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'api_configs')
      .single()

    console.log('Config query result:', { configData, configError })

    if (configError || !configData?.value) {
      console.error('Error fetching API configurations:', configError)
      return new Response(
        JSON.stringify({ error: 'API configurations not found', details: configError?.message || 'No config data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiConfigs = configData.value as any
    console.log('API configs retrieved')
    
    const shopifyConfig = apiConfigs.shopify
    console.log('Shopify config check:', {
      enabled: shopifyConfig?.enabled,
      hasShopUrl: !!shopifyConfig?.shop_url,
      hasAccessToken: !!shopifyConfig?.access_token,
      shopUrl: shopifyConfig?.shop_url
    })

    if (!shopifyConfig?.enabled) {
      console.error('Shopify API is not enabled')
      return new Response(
        JSON.stringify({ error: 'Shopify API is not enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!shopifyConfig?.shop_url || !shopifyConfig?.access_token) {
      console.error('Shopify API not properly configured')
      return new Response(
        JSON.stringify({ error: 'Shopify API not properly configured - missing shop_url or access_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use carrier name and tracking URL directly from courier_partners (dynamic, no hardcoding)
    const trackingInfo = {
      company: carrier || 'Other',
      url: tracking_url || ''
    }

    // Clean and prepare shop domain
    let shopDomain = shopifyConfig.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    
    console.log('Processing order:', {
      shopDomain,
      shopifyOrderId: shopify_order_id,
      trackingNumber: tracking_number,
      trackingInfo
    })

    // Step 1: Get fulfillment orders
    const fulfillmentOrdersUrl = `https://${shopDomain}/admin/api/2023-04/orders/${shopify_order_id}/fulfillment_orders.json`
    console.log('Step 1: Fetching fulfillment orders:', fulfillmentOrdersUrl)

    const fulfillmentOrdersResponse = await fetch(fulfillmentOrdersUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': shopifyConfig.access_token,
        'Content-Type': 'application/json',
      },
    })

    console.log('Fulfillment orders response status:', fulfillmentOrdersResponse.status)

    if (!fulfillmentOrdersResponse.ok) {
      const errorText = await fulfillmentOrdersResponse.text()
      console.error('Error fetching fulfillment orders:', errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch Shopify fulfillment orders', 
          status: fulfillmentOrdersResponse.status,
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fulfillmentOrdersData = await fulfillmentOrdersResponse.json()
    console.log('Fulfillment orders fetched successfully:', {
      count: fulfillmentOrdersData.fulfillment_orders?.length || 0,
      orders: fulfillmentOrdersData.fulfillment_orders?.map((fo: any) => ({
        id: fo.id,
        status: fo.status,
        request_status: fo.request_status
      }))
    })

    if (!fulfillmentOrdersData.fulfillment_orders || fulfillmentOrdersData.fulfillment_orders.length === 0) {
      console.error('No fulfillment orders found')
      return new Response(
        JSON.stringify({ error: 'No fulfillment orders found for this order' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the first fulfillment order that can be fulfilled
    const fulfillableOrders = fulfillmentOrdersData.fulfillment_orders.filter((fo: any) => 
      fo.status === 'open' && fo.request_status === 'unsubmitted'
    )

    if (fulfillableOrders.length === 0) {
      console.error('No fulfillable orders found')
      return new Response(
        JSON.stringify({ 
          error: 'No fulfillable orders found - order may already be fulfilled',
          action: 'order_already_fulfilled',
          fulfillment_orders: fulfillmentOrdersData.fulfillment_orders.map((fo: any) => ({
            id: fo.id,
            status: fo.status,
            request_status: fo.request_status
          }))
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fulfillmentOrderId = fulfillableOrders[0].id
    console.log('Step 2: Using fulfillment order ID:', fulfillmentOrderId)

    // Step 3: Create fulfillment using the new API structure
    const fulfillmentData = {
      fulfillment: {
        line_items_by_fulfillment_order: [
          {
            fulfillment_order_id: fulfillmentOrderId
          }
        ],
        tracking_info: {
          number: tracking_number,
          url: trackingInfo.url,
          company: trackingInfo.company
        }
      }
    }

    console.log('Step 3: Creating fulfillment with data:', JSON.stringify(fulfillmentData, null, 2))

    const createFulfillmentUrl = `https://${shopDomain}/admin/api/2024-04/fulfillments.json`
    const fulfillmentResponse = await fetch(createFulfillmentUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': shopifyConfig.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fulfillmentData),
    })

    console.log('Create fulfillment response status:', fulfillmentResponse.status)

    if (!fulfillmentResponse.ok) {
      const errorText = await fulfillmentResponse.text()
      console.error('Error creating fulfillment:', errorText)
      
      let errorDetails
      try {
        errorDetails = JSON.parse(errorText)
      } catch {
        errorDetails = { message: errorText }
      }
      
      // Handle specific error cases
      if (fulfillmentResponse.status === 422 || fulfillmentResponse.status === 406) {
        return new Response(
          JSON.stringify({ 
            error: 'Order cannot be fulfilled - it may already be fulfilled or have insufficient inventory',
            status: fulfillmentResponse.status,
            details: errorDetails,
            action: 'order_already_fulfilled'
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create Shopify fulfillment', 
          status: fulfillmentResponse.status,
          details: errorDetails
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fulfillmentResult = await fulfillmentResponse.json()
    console.log('Shopify fulfillment created successfully')

    console.log('=== SHOPIFY FULFILLMENT UPDATE SUCCESS ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        fulfillment: fulfillmentResult,
        action: 'created_fulfillment_with_tracking',
        fulfillment_order_id: fulfillmentOrderId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== SHOPIFY FULFILLMENT ERROR ===')
    console.error('Error in update-shopify-fulfillment:', error)
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
