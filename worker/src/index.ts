// flowpulse-sync — Shopify → Supabase order sync, run from a Cloudflare cron.
//
// Replaces the browser-side loop in Printing.tsx. Talks to Supabase Postgres
// through Hyperdrive and calls the existing sync_shopify_order_to_db() RPC, so
// all order rules stay in the database. Only orders Shopify has changed since
// the last tick are fetched.

import postgres from 'postgres';

type Env = {
  HYPERDRIVE: Hyperdrive;
  SHOPIFY_SHOP: string;            // bare shop name, e.g. "sharanz-2"
  SHOPIFY_API_VERSION: string;
  SHOPIFY_CLIENT_ID: string;
  SHOPIFY_CLIENT_SECRET: string;   // secret
  SYNC_KEY: string;                // secret — guards the manual /run trigger
};

// Workers Free allows 50 subrequests per invocation. A tick uses ~5:
// token + order list + held-order query + Hyperdrive socket(s).
const MAX_PER_TICK = 25;

// Shopify error pages are full HTML; keep only the human-readable line.
function summarize(text: string): string {
  const m = text.match(/Oauth error[^<]*|"errors?"\s*:\s*"?([^"}]+)/i);
  return (m ? m[0] : text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 200);
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(sync(env).catch((e) => console.error('sync failed:', e)));
  },

  // Manual trigger for testing: curl -H "x-sync-key: <SYNC_KEY>" https://<worker>/run
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/run') {
      if (req.headers.get('x-sync-key') !== env.SYNC_KEY) return new Response('forbidden', { status: 403 });
      try {
        const r = await sync(env);
        return Response.json(r);
      } catch (e: any) {
        return Response.json({ error: String(e?.message ?? e) }, { status: 500 });
      }
    }
    return new Response('flowpulse-sync ok');
  },
};

// Same client_credentials exchange the Supabase edge functions use.
// Tokens last 24h; one per tick (720/day) is well inside Shopify limits.
async function getShopifyToken(env: Env): Promise<string> {
  const res = await fetch(`https://${env.SHOPIFY_SHOP}.myshopify.com/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Shopify OAuth ${res.status}: ${summarize(await res.text())}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('Shopify OAuth response had no access_token');
  return data.access_token;
}

// Numeric ids of every order currently on hold in Shopify. One GraphQL call.
async function heldOrderIds(base: string, H: Record<string, string>): Promise<Set<string>> {
  const res = await fetch(`${base}/graphql.json`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{ orders(first: 250, query: "fulfillment_status:on_hold") { edges { node { legacyResourceId } } } }`,
    }),
  });
  if (!res.ok) {
    console.warn('held-order query failed', res.status);
    return new Set(); // fail open: sync proceeds, holds are re-checked next tick
  }
  const data = (await res.json()) as { data?: { orders?: { edges?: { node: { legacyResourceId: string } }[] } } };
  return new Set((data.data?.orders?.edges ?? []).map((e) => e.node.legacyResourceId));
}

async function sync(env: Env) {
  const sql = postgres(env.HYPERDRIVE.connectionString, { max: 2, fetch_types: false });
  const base = `https://${env.SHOPIFY_SHOP}.myshopify.com/admin/api/${env.SHOPIFY_API_VERSION}`;
  const started = Date.now();

  try {
    // 1. Cursor lives in Supabase so there is one source of truth.
    const [row] = await sql<{ since: string | null }[]>`
      select value->>'updated_at_min' as since
      from system_settings where key = 'shopify_sync_cursor'`;
    const since = row?.since ?? new Date(Date.now() - 24 * 3600e3).toISOString();

    // 2. Only orders Shopify changed since then.
    const token = await getShopifyToken(env);
    const H = { 'X-Shopify-Access-Token': token };
    const listUrl =
      `${base}/orders.json?status=open&fulfillment_status=unfulfilled&limit=${MAX_PER_TICK}` +
      `&order=updated_at+asc&updated_at_min=${encodeURIComponent(since)}` +
      `&fields=id,name,order_number,created_at,updated_at,note,currency,current_total_price,customer,line_items,shipping_address,fulfillment_status`;
    const res = await fetch(listUrl, { headers: H });
    if (!res.ok) throw new Error(`Shopify orders ${res.status}: ${summarize(await res.text())}`);
    const { orders } = (await res.json()) as { orders: any[] };

    if (!orders?.length) {
      return { since, fetched: 0, synced: 0, skippedHeld: 0, ms: Date.now() - started };
    }

    // Held orders in ONE request (same query fetch-shopify-held-orders uses),
    // instead of one fulfillment_orders call per order.
    const held = await heldOrderIds(base, H);

    let synced = 0;
    let skippedHeld = 0;

    for (const order of orders) {
      if (held.has(String(order.id))) {
        skippedHeld++;
        continue;
      }

      // Existing RPC, unchanged. It refreshes pre-print orders and no-ops for the rest.
      const [{ id }] = await sql<{ id: string }[]>`
        select sync_shopify_order_to_db(${sql.json(order)}::jsonb) as id`;

      // Promote new orders into the printing queue; never demote anything.
      await sql`update orders set stage = 'printing' where id = ${id} and stage = 'pending'`;
      synced++;
    }

    // 3. Advance the cursor. updated_at_min is inclusive, so once caught up
    //    (short page) step 1s past the last order to stop re-syncing it every
    //    tick. On a full page keep it inclusive: several orders can share a
    //    second and the next page must not skip them.
    const last = orders[orders.length - 1].updated_at as string;
    const next =
      orders.length < MAX_PER_TICK ? new Date(new Date(last).getTime() + 1000).toISOString() : last;
    await sql`
      insert into system_settings (key, value)
      values ('shopify_sync_cursor', ${sql.json({ updated_at_min: next })})
      on conflict (key) do update set value = excluded.value, updated_at = now()`;

    const result = { since, until: next, fetched: orders.length, synced, skippedHeld, ms: Date.now() - started };
    console.log('sync', JSON.stringify(result));
    return result;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
