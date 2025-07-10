
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

    // Extract shop name from URL (remove http/https and .myshopify.com)
    const shopName = shopifyConfig.shop_url
      .replace(/^https?:\/\//, '')
      .replace('.myshopify.com', '')

    // Function to fetch orders with pagination
    const fetchAllOrders = async () => {
      let allOrders: any[] = []
      let pageInfo = null
      let hasNextPage = true

      while (hasNextPage) {
        // Build URL with pagination
        let url = `https://${shopName}.myshopify.com/admin/api/2023-10/orders.json?status=any&limit=250&fields=id,name,created_at,updated_at,customer,line_items,shipping_address,total_price,current_total_price,currency,financial_status,fulfillment_status,total_weight`
        
        if (pageInfo) {
          url += `&page_info=${pageInfo}`
        }

        console.log('Fetching orders from:', url)

        const shopifyResponse = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': shopifyConfig.access_token,
            'Content-Type': 'application/json',
          },
        })

        if (!shopifyResponse.ok) {
          throw new Error(`Shopify API error: ${shopifyResponse.status}`)
        }

        const shopifyData = await shopifyResponse.json()
        const orders = shopifyData.orders || []
        
        console.log(`Fetched ${orders.length} orders in this batch`)
        allOrders = allOrders.concat(orders)

        // Check for pagination info in Link header
        const linkHeader = shopifyResponse.headers.get('Link')
        if (linkHeader && linkHeader.includes('rel="next"')) {
          // Extract page_info from Link header
          const nextLinkMatch = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/)
          if (nextLinkMatch) {
            pageInfo = nextLinkMatch[1]
            console.log('Found next page info:', pageInfo)
          } else {
            hasNextPage = false
          }
        } else {
          hasNextPage = false
          console.log('No more pages to fetch')
        }

        // Safety check to prevent infinite loops
        if (allOrders.length > 10000) {
          console.log('Reached safety limit of 10,000 orders')
          break
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
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
