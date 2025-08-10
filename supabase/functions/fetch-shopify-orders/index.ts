
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
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

    if (configError) {
      console.error('Failed to fetch API configurations:', configError)
      throw new Error('Failed to fetch API configurations')
    }

    const apiConfigs = configData.value as any
    const shopifyConfig = apiConfigs?.shopify

    if (!shopifyConfig?.enabled || !shopifyConfig?.shop_url || !shopifyConfig?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Shopify API not configured' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Clean and extract shop name from URL
    let shopName = shopifyConfig.shop_url
      .replace(/^https?:\/\//, '')
      .replace('.myshopify.com', '')
      .replace(/\/$/, '')

    console.log('Using shop name:', shopName)

    // Function to fetch the latest 300 orders
    const fetchLatest300Orders = async () => {
      let allOrders: any[] = []
      const limit = 250 // Maximum allowed by Shopify
      const maxOrders = 300 // Only fetch last 300 orders
      let hasMoreOrders = true
      let pageInfo = null

      console.log('Starting to fetch latest 300 orders from Shopify...')

      while (hasMoreOrders && allOrders.length < maxOrders) {
        // Calculate remaining orders to fetch
        const remainingOrders = maxOrders - allOrders.length
        const currentLimit = Math.min(limit, remainingOrders)

        // Build URL - use simpler pagination approach
        let url = `https://${shopName}.myshopify.com/admin/api/2023-10/orders.json?status=any&limit=${currentLimit}&fields=id,name,created_at,updated_at,customer,line_items,shipping_address,total_price,current_total_price,currency,financial_status,fulfillment_status,total_weight`
        
        // Only add since_id for subsequent requests, without order parameter
        if (pageInfo) {
          url += `&since_id=${pageInfo}`
        }
        
        console.log(`Fetching batch with pageInfo: ${pageInfo || 'none'}, current total: ${allOrders.length}, requesting: ${currentLimit}`)

        try {
          const shopifyResponse = await fetch(url, {
            headers: {
              'X-Shopify-Access-Token': shopifyConfig.access_token,
              'Content-Type': 'application/json',
            },
          })

          console.log('Response status:', shopifyResponse.status)
          
          if (!shopifyResponse.ok) {
            const errorText = await shopifyResponse.text()
            console.error('Shopify API error response:', errorText)
            
            // If it's a 429 (rate limit), wait and retry
            if (shopifyResponse.status === 429) {
              console.log('Rate limited, waiting 3 seconds...')
              await new Promise(resolve => setTimeout(resolve, 3000))
              continue // Retry the same request
            }
            
            throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`)
          }

          const shopifyData = await shopifyResponse.json()
          const orders = shopifyData.orders || []
          
          console.log(`Fetched ${orders.length} orders in this batch`)
          
          if (orders.length === 0) {
            console.log('No more orders to fetch')
            hasMoreOrders = false
          } else {
            // Sort orders by created_at descending to get newest first
            const sortedOrders = orders.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            
            // Add orders to our collection, but don't exceed 300
            const ordersToAdd = sortedOrders.slice(0, remainingOrders)
            allOrders = allOrders.concat(ordersToAdd)
            
            // Check if we've reached our limit or got fewer than requested
            if (allOrders.length >= maxOrders || orders.length < currentLimit) {
              console.log(`Reached limit or last batch - total orders: ${allOrders.length}`)
              hasMoreOrders = false
            } else {
              // Set the pageInfo to the last order's ID for next iteration
              const lastOrder = orders[orders.length - 1]
              pageInfo = lastOrder.id
              console.log(`Next pageInfo will be: ${pageInfo}`)
            }
          }

          // Add delay to respect rate limits (2 calls per second max)
          await new Promise(resolve => setTimeout(resolve, 500))

        } catch (fetchError) {
          console.error('Error in fetch request:', fetchError)
          throw fetchError
        }
      }

      // Final sort to ensure we have the most recent orders first
      allOrders.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      // Take only the first 300 (most recent)
      allOrders = allOrders.slice(0, maxOrders)

      console.log(`Finished fetching. Total orders collected: ${allOrders.length} (limited to ${maxOrders})`)
      return allOrders
    }

    // Fetch latest 300 orders
    const latestOrders = await fetchLatest300Orders()
    console.log(`Final count - Total orders fetched: ${latestOrders.length}`)
    
    // Transform Shopify orders to include detailed information
    const transformedOrders = latestOrders.map((order: any) => {
      // Extract phone number from multiple sources
      const customerPhone = order.customer?.phone;
      const shippingPhone = order.shipping_address?.phone;
      const orderPhone = shippingPhone || customerPhone || null;
      
      return {
        id: order.id.toString(),
        order_number: order.name,
        customer_name: order.customer 
          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Guest'
          : 'Guest',
        customer: order.customer,
        total_amount: order.current_total_price,
        currency: order.currency,
        created_at: order.created_at,
        financial_status: order.financial_status || 'pending',
        fulfillment_status: order.fulfillment_status || 'unfulfilled',
        line_items: order.line_items || [],
        shipping_address: order.shipping_address,
        total_weight: order.total_weight,
        current_total_price: order.current_total_price,
        phone: orderPhone // Add phone at order level for consistency
      }
    })

    console.log(`Returning ${transformedOrders.length} transformed orders (latest 300)`)

    return new Response(
      JSON.stringify({ orders: transformedOrders }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error fetching Shopify orders:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
