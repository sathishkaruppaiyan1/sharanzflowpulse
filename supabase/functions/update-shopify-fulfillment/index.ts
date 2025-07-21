
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
  console.log('Request headers:', Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating Supabase client...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Missing')
    console.log('Supabase Key:', supabaseKey ? 'Present' : 'Missing')
    
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

    if (configError) {
      console.error('Error fetching API configurations:', configError)
      return new Response(
        JSON.stringify({ error: 'API configurations not found', details: configError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!configData?.value) {
      console.error('No API configuration value found')
      return new Response(
        JSON.stringify({ error: 'API configurations not found - no value' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiConfigs = configData.value as any
    console.log('API configs structure:', JSON.stringify(apiConfigs, null, 2))
    
    const shopifyConfig = apiConfigs.shopify
    console.log('Shopify config:', JSON.stringify(shopifyConfig, null, 2))

    console.log('Shopify config validation:', {
      enabled: shopifyConfig?.enabled,
      hasShopUrl: !!shopifyConfig?.shop_url,
      hasAccessToken: !!shopifyConfig?.access_token,
      shopUrl: shopifyConfig?.shop_url,
      accessTokenLength: shopifyConfig?.access_token?.length || 0
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

    console.log('Processing order:', {
      shopDomain,
      shopifyOrderId: shopify_order_id,
      trackingNumber: tracking_number,
      trackingCompany
    })

    // First, get the order details to check current status
    const orderUrl = `https://${shopDomain}/admin/api/2023-10/orders/${shopify_order_id}.json`
    console.log('Fetching order from:', orderUrl)

    const orderResponse = await fetch(orderUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': shopifyConfig.access_token,
        'Content-Type': 'application/json',
      },
    })

    console.log('Order fetch response status:', orderResponse.status)
    console.log('Order fetch response headers:', Object.fromEntries(orderResponse.headers.entries()))

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text()
      console.error('Error fetching Shopify order:', {
        status: orderResponse.status,
        statusText: orderResponse.statusText,
        headers: Object.fromEntries(orderResponse.headers.entries()),
        error: errorText
      })
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch Shopify order', 
          status: orderResponse.status,
          statusText: orderResponse.statusText,
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderData = await orderResponse.json()
    console.log('Order data received:', {
      id: orderData.order?.id,
      name: orderData.order?.name,
      fulfillmentStatus: orderData.order?.fulfillment_status,
      financialStatus: orderData.order?.financial_status,
      totalLineItems: orderData.order?.line_items?.length || 0,
      orderExists: !!orderData.order
    })

    if (!orderData.order) {
      console.error('Order not found in Shopify')
      return new Response(
        JSON.stringify({ error: 'Order not found in Shopify' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if order is already fulfilled
    if (orderData.order.fulfillment_status === 'fulfilled') {
      console.log('Order is already fulfilled, attempting to update existing fulfillment')
      
      // Get existing fulfillments
      const fulfillmentsUrl = `https://${shopDomain}/admin/api/2023-10/orders/${shopify_order_id}/fulfillments.json`
      console.log('Fetching existing fulfillments from:', fulfillmentsUrl)
      
      const fulfillmentsResponse = await fetch(fulfillmentsUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': shopifyConfig.access_token,
          'Content-Type': 'application/json',
        },
      })

      console.log('Fulfillments fetch response status:', fulfillmentsResponse.status)

      if (fulfillmentsResponse.ok) {
        const fulfillmentsData = await fulfillmentsResponse.json()
        console.log('Existing fulfillments:', {
          count: fulfillmentsData.fulfillments?.length || 0,
          fulfillments: fulfillmentsData.fulfillments?.map((f: any) => ({
            id: f.id,
            status: f.status,
            tracking_number: f.tracking_number,
            tracking_company: f.tracking_company
          }))
        })
        
        if (fulfillmentsData.fulfillments && fulfillmentsData.fulfillments.length > 0) {
          const fulfillment = fulfillmentsData.fulfillments[0]
          console.log('Updating existing fulfillment:', fulfillment.id)
          
          const updateUrl = `https://${shopDomain}/admin/api/2023-10/orders/${shopify_order_id}/fulfillments/${fulfillment.id}.json`
          console.log('Update URL:', updateUrl)
          
          const updatePayload = {
            fulfillment: {
              id: fulfillment.id,
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

          console.log('Update fulfillment response status:', updateResponse.status)
          console.log('Update fulfillment response headers:', Object.fromEntries(updateResponse.headers.entries()))

          if (updateResponse.ok) {
            const updateResult = await updateResponse.json()
            console.log('Fulfillment updated successfully:', {
              id: updateResult.fulfillment?.id,
              tracking_number: updateResult.fulfillment?.tracking_number,
              tracking_company: updateResult.fulfillment?.tracking_company,
              status: updateResult.fulfillment?.status
            })
            
            console.log('=== SHOPIFY FULFILLMENT UPDATE SUCCESS ===')
            return new Response(
              JSON.stringify({ 
                success: true, 
                fulfillment: updateResult,
                action: 'updated_existing'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          } else {
            const errorText = await updateResponse.text()
            console.error('Error updating fulfillment:', {
              status: updateResponse.status,
              statusText: updateResponse.statusText,
              headers: Object.fromEntries(updateResponse.headers.entries()),
              error: errorText
            })
            
            return new Response(
              JSON.stringify({ 
                error: 'Failed to update existing fulfillment', 
                status: updateResponse.status,
                details: errorText 
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
      }
    }

    // Create new fulfillment
    console.log('Creating new fulfillment...')
    const lineItems = orderData.order.line_items.map((item: any) => ({
      id: item.id,
      quantity: item.quantity
    }))

    console.log('Line items for fulfillment:', lineItems)

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

    console.log('Creating fulfillment with data:', JSON.stringify(fulfillmentData, null, 2))

    const createUrl = `https://${shopDomain}/admin/api/2023-10/orders/${shopify_order_id}/fulfillments.json`
    console.log('Create fulfillment URL:', createUrl)
    
    const fulfillmentResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': shopifyConfig.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fulfillmentData),
    })

    console.log('Create fulfillment response status:', fulfillmentResponse.status)
    console.log('Create fulfillment response headers:', Object.fromEntries(fulfillmentResponse.headers.entries()))

    if (!fulfillmentResponse.ok) {
      const errorText = await fulfillmentResponse.text()
      console.error('Error creating Shopify fulfillment:', {
        status: fulfillmentResponse.status,
        statusText: fulfillmentResponse.statusText,
        headers: Object.fromEntries(fulfillmentResponse.headers.entries()),
        error: errorText
      })
      
      // Try to parse the error response for more details
      try {
        const errorData = JSON.parse(errorText)
        console.error('Parsed Shopify error:', errorData)
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create Shopify fulfillment', 
            status: fulfillmentResponse.status,
            statusText: fulfillmentResponse.statusText,
            shopifyError: errorData,
            details: errorText 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (parseError) {
        console.error('Could not parse error response:', parseError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create Shopify fulfillment', 
            status: fulfillmentResponse.status,
            statusText: fulfillmentResponse.statusText,
            details: errorText 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const fulfillmentResult = await fulfillmentResponse.json()
    console.log('Shopify fulfillment created successfully:', {
      id: fulfillmentResult.fulfillment?.id,
      status: fulfillmentResult.fulfillment?.status,
      trackingNumber: fulfillmentResult.fulfillment?.tracking_number,
      trackingCompany: fulfillmentResult.fulfillment?.tracking_company
    })

    console.log('=== SHOPIFY FULFILLMENT UPDATE SUCCESS ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        fulfillment: fulfillmentResult,
        action: 'created_new'
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
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
