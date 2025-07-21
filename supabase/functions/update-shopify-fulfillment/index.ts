
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

    console.log('Received request:', { shopify_order_id, tracking_number, carrier })

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

    console.log('Shop domain:', shopDomain)
    console.log('Order ID:', shopify_order_id)
    console.log('Tracking number:', tracking_number)
    console.log('Carrier:', trackingCompany)

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
        JSON.stringify({ error: 'Failed to fetch Shopify order', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderData = await orderResponse.json()
    console.log('Order data received:', JSON.stringify(orderData, null, 2))

    // Check if order is already fulfilled
    if (orderData.order.fulfillment_status === 'fulfilled') {
      console.log('Order is already fulfilled, updating existing fulfillment')
      
      // Get existing fulfillments
      const fulfillmentsResponse = await fetch(
        `https://${shopDomain}/admin/api/2023-10/orders/${shopify_order_id}/fulfillments.json`,
        {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': shopifyConfig.access_token,
            'Content-Type': 'application/json',
          },
        }
      )

      if (fulfillmentsResponse.ok) {
        const fulfillmentsData = await fulfillmentsResponse.json()
        if (fulfillmentsData.fulfillments && fulfillmentsData.fulfillments.length > 0) {
          const fulfillmentId = fulfillmentsData.fulfillments[0].id
          
          // Update existing fulfillment with tracking
          const updateResponse = await fetch(
            `https://${shopDomain}/admin/api/2023-10/orders/${shopify_order_id}/fulfillments/${fulfillmentId}.json`,
            {
              method: 'PUT',
              headers: {
                'X-Shopify-Access-Token': shopifyConfig.access_token,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fulfillment: {
                  id: fulfillmentId,
                  tracking_number: tracking_number,
                  tracking_company: trackingCompany,
                  notify_customer: true
                }
              }),
            }
          )

          if (updateResponse.ok) {
            const updateResult = await updateResponse.json()
            console.log('Fulfillment updated successfully:', updateResult)
            return new Response(
              JSON.stringify({ success: true, fulfillment: updateResult }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          } else {
            const errorText = await updateResponse.text()
            console.error('Error updating fulfillment:', errorText)
          }
        }
      }
    }

    // Create new fulfillment
    const lineItems = orderData.order.line_items.map((item: any) => ({
      id: item.id,
      quantity: item.quantity
    }))

    const fulfillmentData = {
      fulfillment: {
        location_id: null,
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
      
      // Try to parse the error response
      try {
        const errorData = JSON.parse(errorText)
        console.error('Parsed error:', errorData)
      } catch (e) {
        console.error('Could not parse error response')
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create Shopify fulfillment', details: errorText }),
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
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
