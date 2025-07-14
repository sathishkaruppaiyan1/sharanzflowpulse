
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

    // Function to fetch all orders using proper REST API pagination
    const fetchAllOrders = async () => {
      let allOrders: any[] = []
      const limit = 250 // Maximum allowed by Shopify
      let hasMoreOrders = true
      let sinceId = null

      console.log('Starting to fetch all orders from Shopify...')

      while (hasMoreOrders && allOrders.length < 10000) {
        // Build URL with proper pagination
        // Note: Cannot use 'order' parameter with 'since_id' - Shopify API restriction
        let url = `https://${shopName}.myshopify.com/admin/api/2023-10/orders.json?status=any&limit=${limit}`
        
        // Add since_id for pagination if we have it
        if (sinceId) {
          url += `&since_id=${sinceId}`
        } else {
          // Only add order parameter for the first request (when no since_id)
          url += `&order=created_at+asc`
        }
        
        console.log(`Fetching batch with since_id: ${sinceId || 'none'}, current total: ${allOrders.length}`)

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
            // Add orders to our collection
            allOrders = allOrders.concat(orders)
            
            // If we got fewer than the limit, we're done
            if (orders.length < limit) {
              console.log('Last batch - got fewer orders than limit')
              hasMoreOrders = false
            } else {
              // Set the since_id to the last order's ID for next iteration
              const lastOrder = orders[orders.length - 1]
              sinceId = lastOrder.id
              console.log(`Next since_id will be: ${sinceId}`)
            }
          }

          // Add delay to respect rate limits (2 calls per second max)
          await new Promise(resolve => setTimeout(resolve, 500))

        } catch (fetchError) {
          console.error('Error in fetch request:', fetchError)
          throw fetchError
        }
      }

      console.log(`Finished fetching. Total orders collected: ${allOrders.length}`)
      return allOrders
    }

    // Fetch all orders with pagination
    const allOrders = await fetchAllOrders()
    console.log(`Final count - Total orders fetched: ${allOrders.length}`)
    
    
    // Transform Shopify orders to include detailed information
    const transformedOrders = allOrders.map((order: any) => {
      // Log line items data for debugging
      if (order.line_items && order.line_items.length > 0) {
        console.log(`Order ${order.name} line items:`, JSON.stringify(order.line_items, null, 2))
        order.line_items.forEach((item: any, index: number) => {
          console.log(`Item ${index}: title=${item.title}, sku=${item.sku}, variant_id=${item.variant_id}`)
        })
      }
      
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
        current_total_price: order.current_total_price
      }
    })

    console.log(`Returning ${transformedOrders.length} transformed orders`)

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
