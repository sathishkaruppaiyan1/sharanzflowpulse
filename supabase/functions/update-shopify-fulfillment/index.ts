
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { shopify_order_id, tracking_number, carrier } = await req.json()

    // Get API configurations from system_settings
    const { data: configData, error: configError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'api_configs')
      .single()

    if (configError || !configData?.value) {
      console.error('Error fetching API configurations:', configError)
      return new Response(
        JSON.stringify({ error: 'API configurations not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiConfigs = configData.value as any
    const shopifyConfig = apiConfigs.shopify

    if (!shopifyConfig?.enabled || !shopifyConfig?.shop_url || !shopifyConfig?.access_token) {
      console.error('Shopify API not configured')
      return new Response(
        JSON.stringify({ error: 'Shopify API not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map carrier to Shopify tracking company
    const getTrackingCompany = (carrier: string) => {
      switch (carrier) {
        case 'frenchexpress':
          return 'French Express'
        case 'delhivery':
          return 'Delhivery'
        default:
          return 'Other'
      }
    }

    const trackingCompany = getTrackingCompany(carrier)

    // Get the shop domain from the shop_url
    const shopDomain = shopifyConfig.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '')

    // First, get the order details to get line items
    const orderResponse = await fetch(
      `https://${shopDomain}/admin/api/2023-10/orders/${shopify_order_id}.json`,
      {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': shopifyConfig.access_token,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text()
      console.error('Error fetching Shopify order:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Shopify order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderData = await orderResponse.json()
    const lineItems = orderData.order.line_items.map((item: any) => ({
      id: item.id,
      quantity: item.quantity
    }))

    // Create fulfillment with tracking information
    const fulfillmentData = {
      fulfillment: {
        location_id: null, // Use default location
        tracking_number: tracking_number,
        tracking_company: trackingCompany,
        tracking_urls: [],
        notify_customer: true,
        line_items: lineItems
      }
    }

    console.log('Creating Shopify fulfillment with data:', JSON.stringify(fulfillmentData, null, 2))

    const fulfillmentResponse = await fetch(
      `https://${shopDomain}/admin/api/2023-10/orders/${shopify_order_id}/fulfillments.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifyConfig.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fulfillmentData),
      }
    )

    if (!fulfillmentResponse.ok) {
      const errorText = await fulfillmentResponse.text()
      console.error('Error creating Shopify fulfillment:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create Shopify fulfillment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fulfillmentResult = await fulfillmentResponse.json()
    console.log('Shopify fulfillment created successfully:', fulfillmentResult)

    return new Response(
      JSON.stringify({ success: true, fulfillment: fulfillmentResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in update-shopify-fulfillment:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
