
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

    const { shopify_order_id, tracking_number, carrier } = requestBody

    console.log('=== SHOPIFY FULFILLMENT UPDATE START ===')
    console.log('Request data:', { shopify_order_id, tracking_number, carrier })

    // Validate required fields
    if (!shopify_order_id || !tracking_number || !carrier) {
      console.error('Missing required fields:', { shopify_order_id, tracking_number, carrier })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: shopify_order_id, tracking_number, carrier' }),
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

    // Map carrier to Shopify tracking company
    const getTrackingCompany = (carrier: string) => {
      switch (carrier.toLowerCase()) {
        case 'frenchexpress':
          return 'French Express'
        case 'delhivery':
          return 'Delhivery'
        case 'other':
          return 'Other'
        default:
          return 'Other'
      }
    }

    const trackingCompany = getTrackingCompany(carrier)

    // Clean and prepare shop domain
    let shopDomain = shopifyConfig.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    
    console.log('Processing order:', {
      shopDomain,
      shopifyOrderId: shopify_order_id,
      trackingNumber: tracking_number,
      trackingCompany
    })

    // Get order details first
    const orderUrl = `https://${shopDomain}/admin/api/2024-04/orders/${shopify_order_id}.json`
    console.log('Fetching order details:', orderUrl)

    const orderResponse = await fetch(orderUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': shopifyConfig.access_token,
        'Content-Type': 'application/json',
      },
    })

    console.log('Order response status:', orderResponse.status)

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text()
      console.error('Error fetching order:', errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch Shopify order', 
          status: orderResponse.status,
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderData = await orderResponse.json()
    console.log('Order fetched successfully:', {
      id: orderData.order?.id,
      name: orderData.order?.name,
      fulfillmentStatus: orderData.order?.fulfillment_status,
      lineItemsCount: orderData.order?.line_items?.length
    })

    if (!orderData.order) {
      console.error('Order not found in response')
      return new Response(
        JSON.stringify({ error: 'Order not found in Shopify' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for existing fulfillments
    const fulfillmentsUrl = `https://${shopDomain}/admin/api/2024-04/orders/${shopify_order_id}/fulfillments.json`
    console.log('Checking existing fulfillments:', fulfillmentsUrl)
    
    const fulfillmentsResponse = await fetch(fulfillmentsUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': shopifyConfig.access_token,
        'Content-Type': 'application/json',
      },
    })

    console.log('Fulfillments response status:', fulfillmentsResponse.status)

    let existingFulfillments = []
    if (fulfillmentsResponse.ok) {
      const fulfillmentsData = await fulfillmentsResponse.json()
      existingFulfillments = fulfillmentsData.fulfillments || []
      console.log(`Found ${existingFulfillments.length} existing fulfillments`)
    }

    // Try to update existing fulfillment first
    if (existingFulfillments.length > 0) {
      const activeFulfillment = existingFulfillments.find((f: any) => 
        f.status !== 'cancelled' && f.status !== 'failure'
      ) || existingFulfillments[0]
      
      if (activeFulfillment) {
        console.log('Attempting to update existing fulfillment:', activeFulfillment.id)
        
        const updateUrl = `https://${shopDomain}/admin/api/2024-04/orders/${shopify_order_id}/fulfillments/${activeFulfillment.id}.json`
        const updatePayload = {
          fulfillment: {
            tracking_number: tracking_number,
            tracking_company: trackingCompany,
            notify_customer: true
          }
        }
        
        console.log('Update payload:', JSON.stringify(updatePayload, null, 2))
        
        const updateResponse = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': shopifyConfig.access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        })

        console.log('Update response status:', updateResponse.status)

        if (updateResponse.ok) {
          const updateResult = await updateResponse.json()
          console.log('Fulfillment updated successfully')
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              fulfillment: updateResult,
              action: 'updated_existing_fulfillment'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          const errorText = await updateResponse.text()
          console.error('Update failed:', errorText)
          // Continue to try creating new fulfillment
        }
      }
    }

    // Create new fulfillment if no existing one or update failed
    console.log('Creating new fulfillment...')
    
    // Prepare line items for fulfillment - only include unfulfilled items
    const lineItems = orderData.order.line_items
      .filter((item: any) => item.fulfillable_quantity > 0)
      .map((item: any) => ({
        id: item.id,
        quantity: item.fulfillable_quantity || item.quantity
      }))

    console.log('Line items for fulfillment:', lineItems)

    if (lineItems.length === 0) {
      console.log('No fulfillable items found, order may already be fulfilled')
      return new Response(
        JSON.stringify({ 
          error: 'No fulfillable items found - order may already be fulfilled',
          action: 'order_already_fulfilled'
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fulfillmentData = {
      fulfillment: {
        location_id: null,
        tracking_number: tracking_number,
        tracking_company: trackingCompany,
        notify_customer: true,
        line_items: lineItems
      }
    }

    console.log('Creating fulfillment with data:', JSON.stringify(fulfillmentData, null, 2))

    const createUrl = `https://${shopDomain}/admin/api/2024-04/orders/${shopify_order_id}/fulfillments.json`
    const fulfillmentResponse = await fetch(createUrl, {
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
        action: 'created_new_fulfillment'
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
