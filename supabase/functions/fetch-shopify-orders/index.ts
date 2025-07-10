
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

    // Fetch orders from Shopify with more detailed information
    const shopifyResponse = await fetch(
      `https://${shopName}.myshopify.com/admin/api/2023-10/orders.json?status=any&limit=50&fields=id,name,created_at,updated_at,customer,line_items,shipping_address,total_price,current_total_price,currency,financial_status,fulfillment_status,total_weight`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyConfig.access_token,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!shopifyResponse.ok) {
      throw new Error(`Shopify API error: ${shopifyResponse.status}`)
    }

    const shopifyData = await shopifyResponse.json()
    
    // Transform Shopify orders to include detailed information
    const transformedOrders = shopifyData.orders.map((order: any) => ({
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
