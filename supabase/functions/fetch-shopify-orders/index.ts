
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Get access token via OAuth client_credentials grant ──────────────────────
async function getAccessTokenFromClientCredentials(
  shopName: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const url = `https://${shopName}.myshopify.com/admin/oauth/access_token`

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Shopify OAuth token error (${response.status}): ${text}`)
  }

  const data = await response.json()
  if (!data.access_token) {
    throw new Error('Shopify OAuth response did not include access_token')
  }

  console.log('Successfully obtained access token via client_credentials')
  return data.access_token
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

    if (!shopifyConfig?.enabled || !shopifyConfig?.shop_url) {
      return new Response(
        JSON.stringify({ error: 'Shopify API not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Resolve access token ─────────────────────────────────────────────────
    // Priority: direct access_token > client_id + client_secret OAuth
    let shopName = shopifyConfig.shop_url
      .replace(/^https?:\/\//, '')
      .replace('.myshopify.com', '')
      .replace(/\/$/, '')
      .trim()

    console.log('Using shop name:', shopName)

    let accessToken: string

    if (shopifyConfig.access_token?.startsWith('shpat_') ||
        (shopifyConfig.access_token && !shopifyConfig.client_id)) {
      // Legacy: use provided access token directly
      accessToken = shopifyConfig.access_token
      console.log('Using provided access token')
    } else if (shopifyConfig.client_id && shopifyConfig.client_secret) {
      // New: exchange client_id + client_secret for access token
      console.log('Using client_credentials OAuth flow')
      accessToken = await getAccessTokenFromClientCredentials(
        shopName,
        shopifyConfig.client_id,
        shopifyConfig.client_secret
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Shopify credentials not configured. Provide either an Access Token or API Key + Secret.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Fetch all orders with pagination ─────────────────────────────────────
    const fetchAllOrders = async () => {
      let allOrders: any[] = []
      const limit = 250
      let hasMoreOrders = true
      let sinceId = null
      let pageCount = 0
      const maxPages = 50

      console.log('Starting comprehensive fetch of ALL Shopify orders...')

      while (hasMoreOrders && pageCount < maxPages) {
        pageCount++

        let url = `https://${shopName}.myshopify.com/admin/api/2024-01/orders.json?status=any&limit=${limit}&fields=id,name,created_at,updated_at,customer,line_items,shipping_address,total_price,current_total_price,currency,financial_status,fulfillment_status,total_weight`

        if (sinceId) {
          url += `&since_id=${sinceId}`
        } else {
          url += `&order=id+asc`
        }

        console.log(`Fetching page ${pageCount}, since_id: ${sinceId || 'none'}, total so far: ${allOrders.length}`)

        try {
          const shopifyResponse = await fetch(url, {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          })

          console.log(`Page ${pageCount} response status:`, shopifyResponse.status)

          if (!shopifyResponse.ok) {
            const errorText = await shopifyResponse.text()
            console.error('Shopify API error response:', errorText)

            if (shopifyResponse.status === 429) {
              console.log('Rate limited, waiting 5 seconds...')
              await new Promise(resolve => setTimeout(resolve, 5000))
              continue
            }

            throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`)
          }

          const shopifyData = await shopifyResponse.json()
          const orders = shopifyData.orders || []

          console.log(`Page ${pageCount}: Fetched ${orders.length} orders`)

          if (orders.length === 0) {
            hasMoreOrders = false
          } else {
            allOrders = allOrders.concat(orders)
            if (orders.length < limit) {
              hasMoreOrders = false
            } else {
              sinceId = orders[orders.length - 1].id
            }
          }

          await new Promise(resolve => setTimeout(resolve, 500))

        } catch (fetchError) {
          console.error(`Error fetching page ${pageCount}:`, fetchError)
          if (fetchError.message?.includes('fetch')) {
            await new Promise(resolve => setTimeout(resolve, 3000))
            pageCount--
            continue
          }
          throw fetchError
        }
      }

      if (pageCount >= maxPages) {
        console.warn(`Reached maximum page limit (${maxPages})`)
      }

      console.log(`Fetch complete. Pages: ${pageCount}, Total orders: ${allOrders.length}`)
      return allOrders
    }

    const allOrders = await fetchAllOrders()
    console.log(`FINAL RESULT - Total orders fetched: ${allOrders.length}`)

    const transformedOrders = allOrders.map((order: any) => {
      const customerPhone = order.customer?.phone
      const shippingPhone = order.shipping_address?.phone
      const orderPhone = shippingPhone || customerPhone || null

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
        phone: orderPhone,
      }
    })

    return new Response(
      JSON.stringify({
        orders: transformedOrders,
        total_fetched: transformedOrders.length,
        message: `Successfully fetched ${transformedOrders.length} orders from Shopify`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching Shopify orders:', error)
    return new Response(
      JSON.stringify({ error: error.message, details: error.toString() }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
