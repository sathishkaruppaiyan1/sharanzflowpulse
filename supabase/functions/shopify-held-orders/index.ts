/// <reference lib="deno.ns" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SHOPIFY_API_VERSION = '2026-04'

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
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Shopify OAuth token error (${resp.status}): ${text}`)
  }
  const data = await resp.json()
  if (!data.access_token) throw new Error('Shopify OAuth response did not include access_token')
  return data.access_token
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({
          error: 'Supabase environment variables missing',
          details: 'SUPABASE_URL or SUPABASE_ANON_KEY is not set for this function',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    const shopifyConfig = (configData.value as any)?.shopify
    if (!shopifyConfig?.enabled) {
      return new Response(JSON.stringify({ error: 'Shopify API is not enabled' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const hasAccessToken = Boolean(shopifyConfig?.access_token)
    const hasClientCreds = Boolean(shopifyConfig?.client_id && shopifyConfig?.client_secret)
    if (!shopifyConfig?.shop_url || (!hasAccessToken && !hasClientCreds)) {
      return new Response(
        JSON.stringify({
          error:
            'Shopify API not properly configured - need shop_url plus either access_token or client_id+client_secret',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let shopDomain = shopifyConfig.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!shopDomain.includes('.')) shopDomain = `${shopDomain}.myshopify.com`
    const shopName = shopDomain.replace('.myshopify.com', '')

    const accessToken = hasAccessToken
      ? shopifyConfig.access_token
      : await getAccessTokenFromClientCredentials(
          shopName,
          shopifyConfig.client_id,
          shopifyConfig.client_secret
        )

    const endpoint = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`
    const headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    const buildQuery = (withFilter: boolean) => `
      query getOrders($first: Int!, $after: String) {
        orders(first: $first, after: $after${withFilter ? ', query: "fulfillment_status:on_hold"' : ''}, sortKey: PROCESSED_AT, reverse: true) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              legacyResourceId
              name
              createdAt
              displayFinancialStatus
              displayFulfillmentStatus
              currentTotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              shippingAddress {
                name
                address1
                address2
                city
                province
                zip
                country
                phone
              }
              fulfillmentOrders(first: 10) {
                edges {
                  node {
                    status
                    requestStatus
                  }
                }
              }
              lineItems(first: 100) {
                edges {
                  node {
                    name
                    quantity
                    sku
                    variantTitle
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `

    const transformOrder = (node: any, legacyId: string) => ({
      id: legacyId,
      order_number: node.name || legacyId,
      customer_name: node.shippingAddress?.name || 'Guest',
      customer_email: null,
      customer_phone: node.shippingAddress?.phone || null,
      customer: null,
      total_amount: node.currentTotalPriceSet?.shopMoney?.amount || '0',
      currency: node.currentTotalPriceSet?.shopMoney?.currencyCode || '',
      created_at: node.createdAt,
      financial_status: (node.displayFinancialStatus || 'PENDING').toLowerCase(),
      fulfillment_status: 'on_hold',
      line_items: (node.lineItems?.edges || []).map((itemEdge: any) => ({
        title: itemEdge.node?.name || '',
        name: itemEdge.node?.name || '',
        quantity: itemEdge.node?.quantity || 0,
        variant_title: itemEdge.node?.variantTitle || '',
        price: itemEdge.node?.originalUnitPriceSet?.shopMoney?.amount || '0',
        sku: itemEdge.node?.sku || '',
      })),
      shipping_address: node.shippingAddress || null,
      total_weight: 0,
      current_total_price: node.currentTotalPriceSet?.shopMoney?.amount || '0',
      phone: node.shippingAddress?.phone || null,
    })

    const heldIds: string[] = []
    const heldOrders: any[] = []
    const inProgressIds: string[] = []
    const inProgressOrders: any[] = []
    const seenHeldIds = new Set<string>()
    const maxPages = 20
    let totalScanned = 0

    // ─── Pass 1: held orders via Shopify's native filter ──────────────────
    // `fulfillment_status:on_hold` returns ONLY held orders, so all 50+ held
    // rows come back in one or two pages regardless of how deep they are in
    // order history. Previously the function relied on the unfiltered scan
    // below, which capped out at 2000 recent orders and silently dropped
    // older held orders.
    {
      const heldQuery = buildQuery(true)
      let cursor: string | null = null
      let pages = 0
      while (pages < maxPages) {
        pages++
        totalScanned++
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: heldQuery, variables: { first: 250, after: cursor } }),
        })
        const text = await resp.text()
        let json: any
        try { json = JSON.parse(text) } catch { json = { raw: text } }
        if (!resp.ok) {
          return new Response(
            JSON.stringify({ error: `Shopify GraphQL error (${resp.status})`, details: json }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (json.errors && json.errors.length > 0) {
          return new Response(
            JSON.stringify({ error: 'Shopify GraphQL returned errors', details: json.errors }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const ordersConn = json?.data?.orders
        const edges = ordersConn?.edges || []
        for (const edge of edges) {
          const node = edge.node
          const legacyId = node?.legacyResourceId ? String(node.legacyResourceId) : null
          if (!legacyId || seenHeldIds.has(legacyId)) continue
          seenHeldIds.add(legacyId)
          heldIds.push(legacyId)
          heldOrders.push({ ...transformOrder(node, legacyId), fulfillment_status: 'on_hold' })
        }
        if (!ordersConn?.pageInfo?.hasNextPage) break
        cursor = ordersConn.pageInfo.endCursor
      }
    }

    // ─── Pass 2: in-progress detection via unfiltered scan ─────────────────
    // Shopify's search syntax has no direct filter for IN_PROGRESS fulfillment
    // order status, so we scan recent orders and inspect fulfillmentOrders
    // status in code. Held orders are skipped here since pass 1 already
    // collected them.
    {
      const scanQuery = buildQuery(false)
      let cursor: string | null = null
      let pages = 0
      while (pages < maxPages) {
        pages++
        totalScanned++
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: scanQuery, variables: { first: 100, after: cursor } }),
        })
        const text = await resp.text()
        let json: any
        try { json = JSON.parse(text) } catch { json = { raw: text } }
        if (!resp.ok) {
          return new Response(
            JSON.stringify({ error: `Shopify GraphQL error (${resp.status})`, details: json }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (json.errors && json.errors.length > 0) {
          return new Response(
            JSON.stringify({ error: 'Shopify GraphQL returned errors', details: json.errors }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const ordersConn = json?.data?.orders
        const edges = ordersConn?.edges || []
        for (const edge of edges) {
          const node = edge.node
          const legacyId = node?.legacyResourceId ? String(node.legacyResourceId) : null
          if (!legacyId) continue
          const fulfillmentOrderEdges = node.fulfillmentOrders?.edges || []
          const hasInProgress = fulfillmentOrderEdges.some((foEdge: any) => foEdge.node?.status === 'IN_PROGRESS')
          if (!hasInProgress) continue
          inProgressIds.push(legacyId)
          inProgressOrders.push({ ...transformOrder(node, legacyId), fulfillment_status: 'in_progress' })
        }
        if (!ordersConn?.pageInfo?.hasNextPage) break
        cursor = ordersConn.pageInfo.endCursor
      }
    }

    return new Response(
      JSON.stringify({
        held_order_ids: heldIds,
        orders: heldOrders,
        in_progress_order_ids: inProgressIds,
        in_progress_orders: inProgressOrders,
        scanned_pages: totalScanned,
        count: heldIds.length,
        in_progress_count: inProgressIds.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
