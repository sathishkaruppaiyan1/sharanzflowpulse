/// <reference lib="deno.ns" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SHOPIFY_API_VERSION = '2026-04'

type TargetStage = 'hold' | 'pending' | 'printing' | 'inprogress'

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

  return data.access_token
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { shopify_order_id, target_stage } = await req.json()

    if (!shopify_order_id || !target_stage) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: shopify_order_id, target_stage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['hold', 'pending', 'printing', 'inprogress'].includes(target_stage)) {
      return new Response(
        JSON.stringify({ error: `Unsupported target_stage: ${target_stage}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const hasAccessToken = Boolean(shopifyConfig?.access_token)
    const hasClientCreds = Boolean(shopifyConfig?.client_id && shopifyConfig?.client_secret)

    if (!shopifyConfig?.enabled || !shopifyConfig?.shop_url || (!hasAccessToken && !hasClientCreds)) {
      return new Response(
        JSON.stringify({ error: 'Shopify API not properly configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let shopDomain = shopifyConfig.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!shopDomain.includes('.')) {
      shopDomain = `${shopDomain}.myshopify.com`
    }
    const shopName = shopDomain.replace('.myshopify.com', '')

    const accessToken = hasAccessToken
      ? shopifyConfig.access_token
      : await getAccessTokenFromClientCredentials(
          shopName,
          shopifyConfig.client_id,
          shopifyConfig.client_secret
        )

    const graphqlEndpoint = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`
    const shopifyHeaders = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    const gql = async (query: string, variables: Record<string, unknown>) => {
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
        throw new Error(`Shopify GraphQL error (${resp.status}): ${JSON.stringify(json)}`)
      }
      if (json.errors?.length) {
        throw new Error(`Shopify GraphQL returned errors: ${JSON.stringify(json.errors)}`)
      }
      return json
    }

    const rawId = String(shopify_order_id)
    const orderGid = rawId.startsWith('gid://')
      ? rawId
      : `gid://shopify/Order/${rawId.replace(/\D/g, '')}`

    const orderQuery = `
      query getOrderFulfillmentOrders($id: ID!) {
        order(id: $id) {
          id
          name
          displayFulfillmentStatus
          fulfillmentOrders(first: 20) {
            edges {
              node {
                id
                status
                requestStatus
                supportedActions {
                  action
                }
              }
            }
          }
        }
      }
    `

    const orderJson = await gql(orderQuery, { id: orderGid })
    const order = orderJson?.data?.order
    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found in Shopify' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fulfillmentOrders = order.fulfillmentOrders?.edges?.map((edge: any) => edge.node) || []
    const performedActions: Array<{ fulfillmentOrderId: string; action: string; resultStatus?: string }> = []

    const holdMutation = `
      mutation fulfillmentOrderHold($id: ID!, $fulfillmentHold: FulfillmentOrderHoldInput!) {
        fulfillmentOrderHold(id: $id, fulfillmentHold: $fulfillmentHold) {
          fulfillmentOrder {
            id
            status
            requestStatus
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const releaseHoldMutation = `
      mutation fulfillmentOrderReleaseHold($id: ID!) {
        fulfillmentOrderReleaseHold(id: $id) {
          fulfillmentOrder {
            id
            status
            requestStatus
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const openMutation = `
      mutation fulfillmentOrderOpen($id: ID!) {
        fulfillmentOrderOpen(id: $id) {
          fulfillmentOrder {
            id
            status
            requestStatus
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const reportProgressMutation = `
      mutation fulfillmentOrderReportProgress($id: ID!, $progressReport: FulfillmentOrderReportProgressInput!) {
        fulfillmentOrderReportProgress(id: $id, progressReport: $progressReport) {
          fulfillmentOrder {
            id
            status
            requestStatus
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const targetStageValue = target_stage as TargetStage

    for (const fulfillmentOrder of fulfillmentOrders) {
      const supportedActions = new Set(
        (fulfillmentOrder.supportedActions || []).map((action: any) => action.action)
      )

      if (targetStageValue === 'hold') {
        if (fulfillmentOrder.status === 'ON_HOLD') continue
        if (!supportedActions.has('HOLD')) continue

        const holdJson = await gql(holdMutation, {
          id: fulfillmentOrder.id,
          fulfillmentHold: {
            reason: 'OTHER',
            reasonNotes: 'Moved to hold from Sharanz Flow Pulse orders page',
          },
        })
        const userErrors = holdJson?.data?.fulfillmentOrderHold?.userErrors || []
        if (userErrors.length > 0) {
          throw new Error(`Failed to hold fulfillment order ${fulfillmentOrder.id}: ${JSON.stringify(userErrors)}`)
        }

        performedActions.push({
          fulfillmentOrderId: fulfillmentOrder.id,
          action: 'HOLD',
          resultStatus: holdJson?.data?.fulfillmentOrderHold?.fulfillmentOrder?.status,
        })
        continue
      }

      if (targetStageValue === 'inprogress') {
        if (fulfillmentOrder.status === 'IN_PROGRESS') continue

        // Release hold first if needed. After this, supportedActions captured
        // from the initial query is stale (ON_HOLD orders only list
        // RELEASE_HOLD), so we cannot use it to gate REPORT_PROGRESS below.
        if (fulfillmentOrder.status === 'ON_HOLD') {
          if (!supportedActions.has('RELEASE_HOLD')) continue
          const releaseJson = await gql(releaseHoldMutation, { id: fulfillmentOrder.id })
          const releaseErrors = releaseJson?.data?.fulfillmentOrderReleaseHold?.userErrors || []
          if (releaseErrors.length > 0) {
            throw new Error(`Failed to release hold for fulfillment order ${fulfillmentOrder.id}: ${JSON.stringify(releaseErrors)}`)
          }

          performedActions.push({
            fulfillmentOrderId: fulfillmentOrder.id,
            action: 'RELEASE_HOLD',
            resultStatus: releaseJson?.data?.fulfillmentOrderReleaseHold?.fulfillmentOrder?.status,
          })
        } else {
          // For non-held orders, REPORT_PROGRESS must be in supportedActions
          // for the call to succeed. Held orders skip this gate since they're
          // now OPEN post-release.
          if (!supportedActions.has('REPORT_PROGRESS')) continue
        }

        const progressJson = await gql(reportProgressMutation, {
          id: fulfillmentOrder.id,
          progressReport: {
            reasonNotes: 'Moved to in progress from Sharanz Flow Pulse orders page',
          },
        })
        const userErrors = progressJson?.data?.fulfillmentOrderReportProgress?.userErrors || []
        if (userErrors.length > 0) {
          // Surface as warning rather than throwing — the release hold above
          // already succeeded and we don't want to roll that back.
          console.warn(
            `REPORT_PROGRESS failed for ${fulfillmentOrder.id}:`,
            JSON.stringify(userErrors)
          )
        } else {
          performedActions.push({
            fulfillmentOrderId: fulfillmentOrder.id,
            action: 'REPORT_PROGRESS',
            resultStatus: progressJson?.data?.fulfillmentOrderReportProgress?.fulfillmentOrder?.status,
          })
        }
        continue
      }

      if (targetStageValue === 'pending' || targetStageValue === 'printing') {
        if (fulfillmentOrder.status === 'ON_HOLD' && supportedActions.has('RELEASE_HOLD')) {
          const releaseJson = await gql(releaseHoldMutation, { id: fulfillmentOrder.id })
          const userErrors = releaseJson?.data?.fulfillmentOrderReleaseHold?.userErrors || []
          if (userErrors.length > 0) {
            throw new Error(`Failed to release hold for fulfillment order ${fulfillmentOrder.id}: ${JSON.stringify(userErrors)}`)
          }

          performedActions.push({
            fulfillmentOrderId: fulfillmentOrder.id,
            action: 'RELEASE_HOLD',
            resultStatus: releaseJson?.data?.fulfillmentOrderReleaseHold?.fulfillmentOrder?.status,
          })
          continue
        }

        if (fulfillmentOrder.status === 'IN_PROGRESS' && supportedActions.has('MARK_AS_OPEN')) {
          const openJson = await gql(openMutation, { id: fulfillmentOrder.id })
          const userErrors = openJson?.data?.fulfillmentOrderOpen?.userErrors || []
          if (userErrors.length > 0) {
            throw new Error(`Failed to open fulfillment order ${fulfillmentOrder.id}: ${JSON.stringify(userErrors)}`)
          }

          performedActions.push({
            fulfillmentOrderId: fulfillmentOrder.id,
            action: 'MARK_AS_OPEN',
            resultStatus: openJson?.data?.fulfillmentOrderOpen?.fulfillmentOrder?.status,
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        shopify_order_id: shopify_order_id,
        target_stage: targetStageValue,
        actions: performedActions,
        fulfillment_orders_seen: fulfillmentOrders.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
