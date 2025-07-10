
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

    // Function to fetch orders with simple pagination
    const fetchAllOrders = async () => {
      let allOrders: any[] = []
      let limit = 250
      let page = 1
      let hasMoreOrders = true

      while (hasMoreOrders && allOrders.length < 10000) {
        // Use simple page-based pagination which is more reliable
        const url = `https://${shopName}.myshopify.com/admin/api/2023-10/orders.json?status=any&limit=${limit}&page=${page}&fields=id,name,created_at,updated_at,customer,line_items,shipping_address,total_price,current_total_price,currency,financial_status,fulfillment_status,total_weight`
        
        console.log(`Fetching page ${page}:`, url)

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
              console.log('Rate limited, waiting 2 seconds...')
              await new Promise(resolve => setTimeout(resolve, 2000))
              continue // Retry the same page
            }
            
            throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`)
          }

          const shopifyData = await shopifyResponse.json()
          const orders = shopifyData.orders || []
          
          console.log(`Page ${page}: Fetched ${orders.length} orders`)
          
          if (orders.length === 0) {
            hasMoreOrders = false
          } else {
            allOrders = allOrders.concat(orders)
            
            // If we got less than the limit, we're on the last page
            if (orders.length < limit) {
              hasMoreOrders = false
            } else {
              page++
            }
          }

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))

        } catch (fetchError) {
          console.error('Error fetching page', page, ':', fetchError)
          throw fetchError
        }
      }

      return allOrders
    }

    // Fetch all orders with pagination
    const allOrders = await fetchAllOrders()
    console.log(`Total orders fetched: ${allOrders.length}`)
    
    // Transform Shopify orders to include detailed information
    const transformedOrders = allOrders.map((order: any) => ({
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
    }))

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
