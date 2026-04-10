import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Use a recent stable Admin API version with GraphQL fulfillment support
const SHOPIFY_API_VERSION = '2025-01'

serve(async (req) => {
  console.log('=== EDGE FUNCTION STARTED ===')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const requestBody = await req.json()
    const { shopify_order_id, tracking_number, carrier, tracking_url } = requestBody

    console.log('Request:', { shopify_order_id, tracking_number, carrier, tracking_url })

    if (!shopify_order_id || !tracking_number) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: shopify_order_id, tracking_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Shopify config
    const { data: configData, error: configError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'api_configs')
      .single()

    if (configError || !configData?.value) {
      return new Response(
        JSON.stringify({ error: 'API configurations not found', details: configError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiConfigs = configData.value as any
    const shopifyConfig = apiConfigs.shopify

    if (!shopifyConfig?.enabled) {
      return new Response(
        JSON.stringify({ error: 'Shopify API is not enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!shopifyConfig?.shop_url || !shopifyConfig?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Shopify API not properly configured - missing shop_url or access_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let shopDomain = shopifyConfig.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!shopDomain.includes('.')) {
      shopDomain = `${shopDomain}.myshopify.com`
    }

    const graphqlEndpoint = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`
    const shopifyHeaders = {
      'X-Shopify-Access-Token': shopifyConfig.access_token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    // Normalize the order ID to a GraphQL GID
    const rawId = String(shopify_order_id)
    const orderGid = rawId.startsWith('gid://')
      ? rawId
      : `gid://shopify/Order/${rawId.replace(/\D/g, '')}`

    const trackingInfo = {
      number: tracking_number,
      url: tracking_url || null,
      company: carrier || 'Other',
    }

    console.log('Shop domain:', shopDomain)
    console.log('Order GID:', orderGid)
    console.log('Tracking info:', trackingInfo)

    // ── Helper: execute a GraphQL operation ────────────────────────────────
    const gql = async (query: string, variables: Record<string, any>) => {
      const resp = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: shopifyHeaders,
        body: JSON.stringify({ query, variables }),
      })
      const text = await resp.text()
      let json: any
      try {
        json = JSON.parse(text)
      } catch {
        json = { raw: text }
      }
      if (!resp.ok) {
        return { ok: false, status: resp.status, body: json, text }
      }
      if (json.errors && json.errors.length > 0) {
        return { ok: false, status: 200, body: json, text, graphqlErrors: json.errors }
      }
      return { ok: true, status: resp.status, body: json, text }
    }

    // ── Step 1: Fetch existing fulfillments + fulfillment orders ──────────
    const orderQuery = `
      query getOrderForFulfillment($id: ID!) {
        order(id: $id) {
          id
          name
          displayFulfillmentStatus
          fulfillments(first: 10) {
            id
            status
            trackingInfo { number url company }
          }
          fulfillmentOrders(first: 20) {
            edges {
              node {
                id
                status
                requestStatus
              }
            }
          }
        }
      }
    `

    const orderResult = await gql(orderQuery, { id: orderGid })
    if (!orderResult.ok) {
      console.error('Failed to fetch order:', orderResult.text)
      return new Response(
        JSON.stringify({
          error: `Failed to fetch Shopify order (${orderResult.status})`,
          details: orderResult.body,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const order = orderResult.body?.data?.order
    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found in Shopify', details: orderResult.body }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const existingFulfillments: any[] = order.fulfillments || []
    console.log('Existing fulfillments:', existingFulfillments.length)

    // ── Path A: order already has a fulfillment → update its tracking ─────
    if (existingFulfillments.length > 0) {
      const activeFulfillment =
        existingFulfillments.find((f) => f.status === 'SUCCESS') || existingFulfillments[0]
      const fulfillmentId = activeFulfillment.id
      console.log('Updating tracking on existing fulfillment:', fulfillmentId)

      const updateMutation = `
        mutation fulfillmentTrackingInfoUpdate(
          $fulfillmentId: ID!
          $trackingInfoInput: FulfillmentTrackingInput!
          $notifyCustomer: Boolean
        ) {
          fulfillmentTrackingInfoUpdate(
            fulfillmentId: $fulfillmentId
            trackingInfoInput: $trackingInfoInput
            notifyCustomer: $notifyCustomer
          ) {
            fulfillment {
              id
              status
              trackingInfo { number url company }
            }
            userErrors { field message }
          }
        }
      `

      const updateResult = await gql(updateMutation, {
        fulfillmentId,
        trackingInfoInput: trackingInfo,
        notifyCustomer: true,
      })

      const userErrors =
        updateResult.body?.data?.fulfillmentTrackingInfoUpdate?.userErrors || []
      if (!updateResult.ok || userErrors.length > 0) {
        console.error('Update tracking failed:', updateResult.text, userErrors)
        return new Response(
          JSON.stringify({
            error: 'Failed to update tracking on existing fulfillment',
            details: updateResult.body,
            userErrors,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'updated_tracking',
          fulfillment:
            updateResult.body?.data?.fulfillmentTrackingInfoUpdate?.fulfillment,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Path B: no fulfillment yet → create one on open fulfillment orders ─
    const fulfillmentOrders: any[] =
      order.fulfillmentOrders?.edges?.map((e: any) => e.node) || []

    console.log(
      'Fulfillment orders:',
      fulfillmentOrders.map((fo) => ({ id: fo.id, status: fo.status, requestStatus: fo.requestStatus }))
    )

    if (fulfillmentOrders.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No fulfillment orders found for this order' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openFulfillmentOrders = fulfillmentOrders.filter((fo) => fo.status === 'OPEN')
    if (openFulfillmentOrders.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No open fulfillment orders found — order may already be fulfilled',
          action: 'order_already_fulfilled',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const createMutation = `
      mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
        fulfillmentCreate(fulfillment: $fulfillment) {
          fulfillment {
            id
            status
            trackingInfo { number url company }
          }
          userErrors { field message }
        }
      }
    `

    const createVariables = {
      fulfillment: {
        lineItemsByFulfillmentOrder: openFulfillmentOrders.map((fo) => ({
          fulfillmentOrderId: fo.id,
        })),
        trackingInfo,
        notifyCustomer: true,
      },
    }

    console.log('Creating fulfillment with:', JSON.stringify(createVariables))

    const createResult = await gql(createMutation, createVariables)
    const createUserErrors =
      createResult.body?.data?.fulfillmentCreate?.userErrors || []

    if (!createResult.ok || createUserErrors.length > 0) {
      console.error('Create fulfillment failed:', createResult.text, createUserErrors)
      return new Response(
        JSON.stringify({
          error: 'Failed to create Shopify fulfillment',
          details: createResult.body,
          userErrors: createUserErrors,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== SHOPIFY FULFILLMENT SUCCESS ===')
    return new Response(
      JSON.stringify({
        success: true,
        action: 'created_fulfillment_with_tracking',
        fulfillment: createResult.body?.data?.fulfillmentCreate?.fulfillment,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('=== SHOPIFY FULFILLMENT ERROR ===', (error as Error).message)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
