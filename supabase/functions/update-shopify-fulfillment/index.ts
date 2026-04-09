
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SHOPIFY_API_VERSION = '2024-04'

serve(async (req) => {
  console.log('=== EDGE FUNCTION STARTED ===')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const requestBody = await req.json()
    const { shopify_order_id, tracking_number, carrier, tracking_url } = requestBody

    console.log('Request:', { shopify_order_id, tracking_number, carrier, tracking_url })

    if (!shopify_order_id || !tracking_number) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: shopify_order_id, tracking_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Shopify config
    const { data: configData, error: configError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'api_configs')
      .single()

    if (configError || !configData?.value) {
      return new Response(
        JSON.stringify({ error: 'API configurations not found', details: configError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiConfigs = configData.value as any
    const shopifyConfig = apiConfigs.shopify

    if (!shopifyConfig?.enabled) {
      return new Response(
        JSON.stringify({ error: 'Shopify API is not enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!shopifyConfig?.shop_url || !shopifyConfig?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Shopify API not properly configured - missing shop_url or access_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let shopDomain = shopifyConfig.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    // Ensure it ends with .myshopify.com if it doesn't already have a domain
    if (!shopDomain.includes('.')) {
      shopDomain = `${shopDomain}.myshopify.com`
    }

    const shopifyHeaders = {
      'X-Shopify-Access-Token': shopifyConfig.access_token,
      'Content-Type': 'application/json',
    }

    console.log('Shop domain:', shopDomain)

    // Step 1: Get fulfillment orders
    const fulfillmentOrdersUrl = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/orders/${shopify_order_id}/fulfillment_orders.json`
    console.log('Fetching fulfillment orders:', fulfillmentOrdersUrl)

    const fulfillmentOrdersResponse = await fetch(fulfillmentOrdersUrl, {
      method: 'GET',
      headers: shopifyHeaders,
    })

    console.log('Fulfillment orders response status:', fulfillmentOrdersResponse.status)

    if (!fulfillmentOrdersResponse.ok) {
      const errorText = await fulfillmentOrdersResponse.text()
      console.error('Error fetching fulfillment orders:', errorText)
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch Shopify fulfillment orders (${fulfillmentOrdersResponse.status})`, 
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fulfillmentOrdersData = await fulfillmentOrdersResponse.json()
    const allFulfillmentOrders = fulfillmentOrdersData.fulfillment_orders || []
    
    console.log('Fulfillment orders:', allFulfillmentOrders.map((fo: any) => ({
      id: fo.id, status: fo.status, request_status: fo.request_status
    })))

    if (allFulfillmentOrders.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No fulfillment orders found for this order' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Broader filter: accept open orders regardless of request_status
    let fulfillableOrders = allFulfillmentOrders.filter((fo: any) => fo.status === 'open')
    
    // If no open orders, check if already fulfilled
    if (fulfillableOrders.length === 0) {
      const closedOrders = allFulfillmentOrders.filter((fo: any) => fo.status === 'closed')
      if (closedOrders.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: true,
            action: 'order_already_fulfilled',
            message: 'Order is already fulfilled in Shopify'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Try any remaining order
      fulfillableOrders = allFulfillmentOrders
    }

    const fulfillmentOrderId = fulfillableOrders[0].id
    console.log('Using fulfillment order ID:', fulfillmentOrderId)

    // Step 2: Create fulfillment
    const fulfillmentData = {
      fulfillment: {
        line_items_by_fulfillment_order: [
          { fulfillment_order_id: fulfillmentOrderId }
        ],
        tracking_info: {
          number: tracking_number,
          url: tracking_url || '',
          company: carrier || 'Other'
        }
      }
    }

    console.log('Creating fulfillment:', JSON.stringify(fulfillmentData))

    const createFulfillmentUrl = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/fulfillments.json`
    const fulfillmentResponse = await fetch(createFulfillmentUrl, {
      method: 'POST',
      headers: shopifyHeaders,
      body: JSON.stringify(fulfillmentData),
    })

    console.log('Create fulfillment response status:', fulfillmentResponse.status)

    if (!fulfillmentResponse.ok) {
      const errorText = await fulfillmentResponse.text()
      console.error('Error creating fulfillment:', errorText)
      
      if (fulfillmentResponse.status === 422 || fulfillmentResponse.status === 406) {
        return new Response(
          JSON.stringify({ 
            success: true,
            action: 'order_already_fulfilled',
            message: 'Order may already be fulfilled',
            details: errorText
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create Shopify fulfillment', 
          status: fulfillmentResponse.status,
          details: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fulfillmentResult = await fulfillmentResponse.json()
    console.log('=== SHOPIFY FULFILLMENT SUCCESS ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        fulfillment: fulfillmentResult,
        action: 'created_fulfillment_with_tracking',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== SHOPIFY FULFILLMENT ERROR ===', (error as Error).message)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
