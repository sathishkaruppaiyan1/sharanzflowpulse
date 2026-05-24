// One-time historical backfill: pulls fulfilled orders from Shopify
// and inserts them directly at stage='shipped' with tracking info.
// Idempotent: re-running skips orders that already exist.
// Paginates 250 orders per Shopify page; processes up to 5 pages per call,
// then returns a cursor so the client can resume without hitting timeouts.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PAGES_PER_CALL = 5
const PAGE_SIZE = 250

async function getAccessTokenFromClientCredentials(
  shopName: string,
  clientId: string,
  clientSecret: string,
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
  if (!data.access_token) throw new Error('Shopify OAuth response did not include access_token')
  return data.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const sinceIdInput: string | null = body?.since_id ?? null

    const { data: configRow, error: configError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'api_configs')
      .single()

    if (configError) throw new Error(`Failed to load api_configs: ${configError.message}`)

    const shopifyConfig = (configRow.value as any)?.shopify
    if (!shopifyConfig?.enabled || !shopifyConfig?.shop_url) {
      return new Response(
        JSON.stringify({ error: 'Shopify is not configured. Enable it in Settings → API first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const shopName = String(shopifyConfig.shop_url)
      .replace(/^https?:\/\//, '')
      .replace('.myshopify.com', '')
      .replace(/\/$/, '')
      .trim()

    let accessToken: string
    if (
      shopifyConfig.access_token?.startsWith('shpat_') ||
      (shopifyConfig.access_token && !shopifyConfig.client_id)
    ) {
      accessToken = shopifyConfig.access_token
    } else if (shopifyConfig.client_id && shopifyConfig.client_secret) {
      accessToken = await getAccessTokenFromClientCredentials(
        shopName,
        shopifyConfig.client_id,
        shopifyConfig.client_secret,
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Shopify credentials missing.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const totals = { fetched: 0, inserted: 0, skipped: 0, failed: 0 }
    const errors: Array<{ order: string; message: string }> = []
    let sinceId = sinceIdInput
    let lastSeenId: string | null = null
    let pagesProcessed = 0
    let hasMore = true

    const FIELDS = [
      'id', 'name', 'order_number', 'created_at', 'updated_at',
      'customer', 'line_items', 'shipping_address',
      'total_price', 'current_total_price', 'currency',
      'financial_status', 'fulfillment_status', 'total_weight', 'note',
      'fulfillments',
    ].join(',')

    while (hasMore && pagesProcessed < MAX_PAGES_PER_CALL) {
      pagesProcessed++

      let url =
        `https://${shopName}.myshopify.com/admin/api/2024-01/orders.json` +
        `?status=any&fulfillment_status=shipped&limit=${PAGE_SIZE}&fields=${FIELDS}`
      if (sinceId) {
        url += `&since_id=${sinceId}`
      } else {
        url += `&order=id+asc`
      }

      const resp = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      })

      if (resp.status === 429) {
        await new Promise(r => setTimeout(r, 5000))
        pagesProcessed--
        continue
      }
      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(`Shopify error ${resp.status}: ${text}`)
      }

      const json = await resp.json()
      const orders: any[] = json.orders || []
      totals.fetched += orders.length

      if (orders.length === 0) {
        hasMore = false
        break
      }

      for (const order of orders) {
        try {
          await ingestOrder(supabase, order)
          totals.inserted++
        } catch (e) {
          const msg = (e as Error).message || String(e)
          if (/duplicate key|already exists|already-inserted/i.test(msg)) {
            totals.skipped++
          } else {
            totals.failed++
            errors.push({ order: order.name || String(order.id), message: msg })
          }
        }
      }

      lastSeenId = String(orders[orders.length - 1].id)
      sinceId = lastSeenId

      if (orders.length < PAGE_SIZE) {
        hasMore = false
        break
      }

      await new Promise(r => setTimeout(r, 400))
    }

    return new Response(
      JSON.stringify({
        ...totals,
        next_since_id: hasMore ? lastSeenId : null,
        has_more: hasMore,
        pages_processed: pagesProcessed,
        errors: errors.slice(0, 20),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('backfill-shipped-orders error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

async function ingestOrder(supabase: ReturnType<typeof createClient>, order: any) {
  const shopifyOrderId = BigInt(order.id).toString()

  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('shopify_order_id', shopifyOrderId)
    .maybeSingle()
  if (existing) throw new Error('already-inserted')

  // Customer
  let customerId: string | null = null
  if (order.customer?.id) {
    const cust = order.customer
    const { data: upCust, error: custErr } = await supabase
      .from('customers')
      .upsert(
        {
          shopify_customer_id: BigInt(cust.id).toString(),
          first_name: cust.first_name ?? null,
          last_name: cust.last_name ?? null,
          email: cust.email ?? null,
          phone: cust.phone ?? order.shipping_address?.phone ?? null,
        },
        { onConflict: 'shopify_customer_id' },
      )
      .select('id')
      .single()
    if (custErr) throw custErr
    customerId = upCust.id
  }

  // Address
  let addressId: string | null = null
  const sa = order.shipping_address
  if (sa && customerId) {
    const { data: addr, error: addrErr } = await supabase
      .from('addresses')
      .insert({
        customer_id: customerId,
        address_line_1: sa.address1 ?? '',
        address_line_2: sa.address2 ?? null,
        city: sa.city ?? '',
        state: sa.province ?? null,
        postal_code: sa.zip ?? null,
        country: sa.country ?? 'India',
        is_default: true,
      })
      .select('id')
      .single()
    if (addrErr) throw addrErr
    addressId = addr.id
  }

  // Tracking from first fulfillment
  const firstFulfillment = (order.fulfillments && order.fulfillments[0]) || null
  const trackingNumber = firstFulfillment?.tracking_number ?? null
  const carrier = firstFulfillment?.tracking_company ?? null
  const trackingUrl =
    firstFulfillment?.tracking_url ||
    (firstFulfillment?.tracking_urls && firstFulfillment.tracking_urls[0]) ||
    null
  const shippedAt = firstFulfillment?.created_at ?? order.updated_at ?? order.created_at

  // Total weight (grams)
  const totalWeight = (order.line_items || []).reduce(
    (sum: number, li: any) => sum + (Number(li.grams) || 0) * (Number(li.quantity) || 1),
    0,
  )

  const orderNumber = String(order.order_number ?? order.name ?? '').trim()
  if (!orderNumber) throw new Error('missing order_number')

  // Insert order at shipped stage with all timestamps populated
  const { data: insertedOrder, error: orderErr } = await supabase
    .from('orders')
    .insert({
      shopify_order_id: shopifyOrderId,
      order_number: orderNumber,
      customer_id: customerId,
      shipping_address_id: addressId,
      stage: 'shipped',
      total_amount: Number(order.current_total_price ?? order.total_price ?? 0),
      currency: order.currency ?? 'INR',
      tracking_number: trackingNumber,
      carrier,
      tracking_url: trackingUrl,
      total_weight: totalWeight,
      notes: order.note ?? null,
      printed_at: order.created_at,
      packed_at: order.created_at,
      shipped_at: shippedAt,
    })
    .select('id')
    .single()
  if (orderErr) throw orderErr
  const orderId = insertedOrder.id

  // Products + order_items
  for (const li of order.line_items || []) {
    let productId: string | null = null
    if (li.product_id) {
      const { data: prod, error: prodErr } = await supabase
        .from('products')
        .upsert(
          {
            shopify_product_id: BigInt(li.product_id).toString(),
            title: li.title ?? 'Untitled',
            sku: li.sku ?? null,
            price: Number(li.price) || 0,
            variations: li.variant_details ?? {},
            variant_options: li.properties ?? {},
          },
          { onConflict: 'shopify_product_id' },
        )
        .select('id')
        .single()
      if (prodErr) throw prodErr
      productId = prod.id
    }

    const qty = Number(li.quantity) || 1
    const price = Number(li.price) || 0
    const { error: itemErr } = await supabase.from('order_items').insert({
      order_id: orderId,
      product_id: productId,
      shopify_variant_id: li.variant_id ? BigInt(li.variant_id).toString() : null,
      title: li.title ?? 'Untitled',
      sku: li.sku ?? null,
      quantity: qty,
      price,
      total: qty * price,
      packed: true,
      variant_title: li.variant_title ?? null,
      variant_options: li.properties ?? {},
      grams: Number(li.grams) || 0,
    })
    if (itemErr) throw itemErr
  }

  // Tracking details row (so Tracking/Delivery pages have data)
  if (trackingNumber) {
    await supabase.from('order_tracking_details').insert({
      order_id: orderId,
      tracking_number: trackingNumber,
      courier_name: carrier,
      tracking_status: 'shipped',
      tracking_events: [],
      shipped_at: shippedAt,
    })
  }
}
