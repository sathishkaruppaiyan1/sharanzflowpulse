
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

    // Enhanced function to fetch ALL orders with comprehensive pagination
    const fetchAllOrders = async () => {
      let allOrders: any[] = []
      const limit = 250 // Maximum allowed by Shopify
      let hasMoreOrders = true
      let sinceId = null
      let pageCount = 0
      const maxPages = 50 // Safety limit to prevent infinite loops

      console.log('Starting comprehensive fetch of ALL Shopify orders...')

      while (hasMoreOrders && pageCount < maxPages) {
        pageCount++
        
        // Build URL with enhanced parameters to ensure we get all orders
        let url = `https://${shopName}.myshopify.com/admin/api/2023-10/orders.json?status=any&limit=${limit}&fields=id,name,created_at,updated_at,customer,line_items,shipping_address,total_price,current_total_price,currency,financial_status,fulfillment_status,total_weight`
        
        // Add since_id for pagination if we have it
        if (sinceId) {
          url += `&since_id=${sinceId}`
        } else {
          // For the first request, get orders in ascending order by ID to ensure proper pagination
          url += `&order=id+asc`
        }
        
        console.log(`Fetching page ${pageCount} with since_id: ${sinceId || 'none'}, current total: ${allOrders.length}`)

        try {
          const shopifyResponse = await fetch(url, {
            headers: {
              'X-Shopify-Access-Token': shopifyConfig.access_token,
              'Content-Type': 'application/json',
            },
          })

          console.log(`Page ${pageCount} response status:`, shopifyResponse.status)
          
          if (!shopifyResponse.ok) {
            const errorText = await shopifyResponse.text()
            console.error('Shopify API error response:', errorText)
            
            // If it's a 429 (rate limit), wait longer and retry
            if (shopifyResponse.status === 429) {
              console.log('Rate limited, waiting 5 seconds...')
              await new Promise(resolve => setTimeout(resolve, 5000))
              continue // Retry the same request
            }
            
            throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`)
          }

          const shopifyData = await shopifyResponse.json()
          const orders = shopifyData.orders || []
          
          console.log(`Page ${pageCount}: Fetched ${orders.length} orders`)
          
          if (orders.length === 0) {
            console.log('No more orders to fetch - reached end')
            hasMoreOrders = false
          } else {
            // Add orders to our collection
            allOrders = allOrders.concat(orders)
            
            // If we got fewer than the limit, we're done
            if (orders.length < limit) {
              console.log(`Page ${pageCount}: Got fewer orders than limit (${orders.length} < ${limit}) - this is the last page`)
              hasMoreOrders = false
            } else {
              // Set the since_id to the last order's ID for next iteration
              const lastOrder = orders[orders.length - 1]
              sinceId = lastOrder.id
              console.log(`Page ${pageCount}: Next since_id will be: ${sinceId}`)
            }
          }

          // Add delay to respect rate limits (be more conservative)
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay

        } catch (fetchError) {
          console.error(`Error fetching page ${pageCount}:`, fetchError)
          
          // If it's a network error, try one more time with longer delay
          if (fetchError.message.includes('fetch')) {
            console.log('Network error, waiting 3 seconds and retrying...')
            await new Promise(resolve => setTimeout(resolve, 3000))
            pageCount-- // Don't count this as a page attempt
            continue
          }
          
          throw fetchError
        }
      }

      if (pageCount >= maxPages) {
        console.warn(`Reached maximum page limit (${maxPages}), there might be more orders`)
      }

      console.log(`Finished comprehensive fetch. Total pages processed: ${pageCount}, Total orders collected: ${allOrders.length}`)
      return allOrders
    }

    // Fetch all orders with enhanced pagination
    const allOrders = await fetchAllOrders()
    console.log(`FINAL RESULT - Total orders fetched: ${allOrders.length}`)
    
    // Transform Shopify orders to include detailed information
    const transformedOrders = allOrders.map((order: any) => {
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

    console.log(`Returning ${transformedOrders.length} transformed orders with comprehensive data`)

    return new Response(
      JSON.stringify({ 
        orders: transformedOrders,
        total_fetched: transformedOrders.length,
        message: `Successfully fetched ${transformedOrders.length} orders from Shopify`
      }),
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
