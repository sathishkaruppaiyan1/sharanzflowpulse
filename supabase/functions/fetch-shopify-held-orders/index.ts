/// <reference lib="deno.ns" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SHOPIFY_API_VERSION = '2025-01'

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
    const t = await resp.text()
    throw new Error(`Shopify OAuth token error (${resp.status}): ${t}`)
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Optional diagnostic mode: ?debug=1 returns full per-order status info so
    // we can see what Shopify is actually reporting. Production use omits it.
    let debug = false
    try {
      const url = new URL(req.url)
      debug = url.searchParams.get('debug') === '1'
    } catch { /* no-op */ }

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
            'Shopify API not properly configured — need shop_url plus either access_token or client_id+client_secret',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let shopDomain = shopifyConfig.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!shopDomain.includes('.')) shopDomain = `${shopDomain}.myshopify.com`
    const shopName = shopDomain.replace('.myshopify.com', '')

    let accessToken: string
    if (hasAccessToken) {
      accessToken = shopifyConfig.access_token
    } else {
      try {
        accessToken = await getAccessTokenFromClientCredentials(
          shopName,
          shopifyConfig.client_id,
          shopifyConfig.client_secret
        )
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Failed to obtain Shopify access token', details: (e as Error).message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const endpoint = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`
    const headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    // Shopify's order-search syntax supports `fulfillment_status:on_hold`
    // directly, so we can ask Shopify for ONLY the held orders instead of
    // scanning every open order. Reference:
    // https://shopify.dev/docs/api/admin-graphql/latest/queries/orders
    const query = `
      query getHeldOrders($first: Int!, $after: String) {
        orders(first: $first, after: $after, query: "fulfillment_status:on_hold", sortKey: PROCESSED_AT, reverse: true) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              legacyResourceId
              name
              displayFulfillmentStatus
            }
          }
        }
      }
    `

    const heldIds: string[] = []
    const debugSamples: Array<{ id: string; name: string; displayStatus: string }> = []
    let cursor: string | null = null
    let pages = 0
    const maxPages = 20 // up to 5000 held orders, more than anyone should ever have

    while (pages < maxPages) {
      pages++
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables: { first: 250, after: cursor } }),
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
        if (node?.legacyResourceId) {
          heldIds.push(String(node.legacyResourceId))
          if (debug && debugSamples.length < 25) {
            debugSamples.push({
              id: String(node.legacyResourceId),
              name: node.name || '',
              displayStatus: node.displayFulfillmentStatus || 'UNKNOWN',
            })
          }
        }
      }

      if (!ordersConn?.pageInfo?.hasNextPage) break
      cursor = ordersConn.pageInfo.endCursor
    }

    const body: any = {
      held_order_ids: heldIds,
      scanned_pages: pages,
      count: heldIds.length,
    }
    if (debug) {
      body.debug = {
        samples: debugSamples,
        query_used: 'fulfillment_status:on_hold',
        api_version: SHOPIFY_API_VERSION,
        shop: shopDomain,
      }
    }

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
