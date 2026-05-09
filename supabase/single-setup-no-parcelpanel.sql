-- Single-file setup for a new client project
-- Includes core fulfillment schema, hold stage, settings seed, and couriers
-- Parcel Panel settings are intentionally omitted from seeded config.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_stage') then
    create type public.order_stage as enum (
      'pending',
      'hold',
      'printing',
      'packing',
      'tracking',
      'shipped',
      'delivered',
      'delivery'
    );
  end if;
end $$;

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  shopify_customer_id bigint unique,
  email text,
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null default 'India',
  is_default boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  shopify_order_id bigint unique,
  order_number text unique not null,
  customer_id uuid references public.customers(id),
  shipping_address_id uuid references public.addresses(id),
  stage public.order_stage default 'pending',
  total_amount numeric(10,2),
  currency text default 'INR',
  tracking_number text,
  carrier text,
  total_weight integer default 0,
  notes text,
  tracking_url text,
  printed_at timestamptz,
  packed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shopify_product_id bigint unique,
  title text not null,
  sku text,
  price numeric(10,2),
  weight numeric(8,2),
  variations jsonb default '{}'::jsonb,
  variant_options jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  shopify_variant_id bigint,
  title text not null,
  sku text,
  quantity integer not null default 1,
  price numeric(10,2),
  total numeric(10,2),
  packed boolean default false,
  variant_title text,
  variant_options jsonb default '{}'::jsonb,
  grams integer default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_tracking_details (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  tracking_number text,
  courier_name text,
  tracking_status text,
  tracking_events jsonb default '[]'::jsonb,
  estimated_delivery_date text,
  delivered_at text,
  shipped_at text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_tracking_details (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  tracking_number text,
  courier_code text,
  courier_name text,
  status text,
  sub_status text,
  origin_country text,
  destination_country text,
  estimated_delivery_date text,
  delivered_at text,
  shipped_at text,
  tracking_events jsonb default '[]'::jsonb,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.courier_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  tracking_url text,
  tracking_prefix text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.products enable row level security;
alter table public.order_items enable row level security;
alter table public.system_settings enable row level security;
alter table public.order_tracking_details enable row level security;
alter table public.delivery_tracking_details enable row level security;
alter table public.courier_partners enable row level security;

drop policy if exists "Allow all operations on customers" on public.customers;
create policy "Allow all operations on customers" on public.customers for all using (true) with check (true);

drop policy if exists "Allow all operations on addresses" on public.addresses;
create policy "Allow all operations on addresses" on public.addresses for all using (true) with check (true);

drop policy if exists "Allow all operations on orders" on public.orders;
create policy "Allow all operations on orders" on public.orders for all using (true) with check (true);

drop policy if exists "Allow all operations on products" on public.products;
create policy "Allow all operations on products" on public.products for all using (true) with check (true);

drop policy if exists "Allow all operations on order_items" on public.order_items;
create policy "Allow all operations on order_items" on public.order_items for all using (true) with check (true);

drop policy if exists "Allow all access to system_settings" on public.system_settings;
drop policy if exists "Allow all operations on system_settings" on public.system_settings;
create policy "Allow all operations on system_settings" on public.system_settings for all using (true) with check (true);

drop policy if exists "Allow all operations on order_tracking_details" on public.order_tracking_details;
create policy "Allow all operations on order_tracking_details" on public.order_tracking_details for all using (true) with check (true);

drop policy if exists "Allow all operations on delivery_tracking_details" on public.delivery_tracking_details;
create policy "Allow all operations on delivery_tracking_details" on public.delivery_tracking_details for all using (true) with check (true);

drop policy if exists "Allow all operations on courier_partners" on public.courier_partners;
create policy "Allow all operations on courier_partners" on public.courier_partners for all using (true) with check (true);

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers
for each row execute function public.handle_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
for each row execute function public.handle_updated_at();

drop trigger if exists system_settings_updated_at on public.system_settings;
create trigger system_settings_updated_at before update on public.system_settings
for each row execute function public.handle_updated_at();

drop trigger if exists handle_updated_at_order_tracking_details on public.order_tracking_details;
create trigger handle_updated_at_order_tracking_details before update on public.order_tracking_details
for each row execute function public.handle_updated_at();

drop trigger if exists courier_partners_updated_at on public.courier_partners;
create trigger courier_partners_updated_at before update on public.courier_partners
for each row execute function public.handle_updated_at();

create or replace function public.update_order_stage_when_packed()
returns trigger as $$
begin
  if not exists (
    select 1
    from public.order_items
    where order_id = new.order_id
      and coalesce(packed, false) = false
  ) then
    update public.orders
    set stage = 'tracking',
        packed_at = now(),
        updated_at = now()
    where id = new.order_id
      and stage = 'packing';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists order_completion_trigger on public.order_items;
create trigger order_completion_trigger
after update of packed on public.order_items
for each row execute function public.update_order_stage_when_packed();

create index if not exists idx_orders_stage on public.orders(stage);
create index if not exists idx_orders_stage_created on public.orders(stage, created_at desc);
create index if not exists idx_orders_tracking_number on public.orders(tracking_number) where tracking_number is not null;
create index if not exists idx_order_items_packed on public.order_items(order_id, packed);
create index if not exists idx_courier_partners_active_sort on public.courier_partners(is_active, sort_order);
create index if not exists idx_courier_partners_prefix on public.courier_partners(tracking_prefix) where tracking_prefix is not null;

create or replace function public.sync_shopify_order_to_db(
  shopify_order_data jsonb
) returns uuid as $$
declare
  v_order_id uuid;
  v_customer_id uuid;
  v_address_id uuid;
  v_product_id uuid;
  v_item jsonb;
  v_total_weight integer := 0;
begin
  insert into public.customers (
    shopify_customer_id, first_name, last_name, email, phone
  ) values (
    (shopify_order_data->'customer'->>'id')::bigint,
    shopify_order_data->'customer'->>'first_name',
    shopify_order_data->'customer'->>'last_name',
    shopify_order_data->'customer'->>'email',
    coalesce(
      shopify_order_data->'customer'->>'phone',
      shopify_order_data->'shipping_address'->>'phone'
    )
  )
  on conflict (shopify_customer_id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    phone = coalesce(excluded.phone, public.customers.phone),
    updated_at = now()
  returning id into v_customer_id;

  insert into public.addresses (
    customer_id, address_line_1, address_line_2, city, state, postal_code, country, is_default
  ) values (
    v_customer_id,
    shopify_order_data->'shipping_address'->>'address1',
    shopify_order_data->'shipping_address'->>'address2',
    shopify_order_data->'shipping_address'->>'city',
    shopify_order_data->'shipping_address'->>'province',
    shopify_order_data->'shipping_address'->>'zip',
    coalesce(shopify_order_data->'shipping_address'->>'country', 'India'),
    true
  )
  returning id into v_address_id;

  select coalesce(sum(
    coalesce((item->>'grams')::integer, 0) * coalesce((item->>'quantity')::integer, 1)
  ), 0)
  into v_total_weight
  from jsonb_array_elements(shopify_order_data->'line_items') as item;

  insert into public.orders (
    shopify_order_id, order_number, customer_id, shipping_address_id,
    stage, total_amount, currency, total_weight, notes
  ) values (
    (shopify_order_data->>'id')::bigint,
    coalesce(shopify_order_data->>'order_number', shopify_order_data->>'name'),
    v_customer_id,
    v_address_id,
    'pending'::public.order_stage,
    coalesce((shopify_order_data->>'current_total_price')::numeric, 0),
    coalesce(shopify_order_data->>'currency', 'INR'),
    v_total_weight,
    shopify_order_data->>'note'
  )
  on conflict (shopify_order_id) do update set
    order_number = excluded.order_number,
    customer_id = excluded.customer_id,
    shipping_address_id = excluded.shipping_address_id,
    total_amount = excluded.total_amount,
    currency = excluded.currency,
    total_weight = excluded.total_weight,
    notes = excluded.notes,
    updated_at = now()
  returning id into v_order_id;

  delete from public.order_items where order_id = v_order_id;

  for v_item in select * from jsonb_array_elements(shopify_order_data->'line_items')
  loop
    insert into public.products (
      shopify_product_id, title, sku, price, variations, variant_options
    ) values (
      (v_item->>'product_id')::bigint,
      v_item->>'title',
      v_item->>'sku',
      (v_item->>'price')::numeric,
      coalesce(v_item->'variant_details', '{}'::jsonb),
      coalesce(v_item->'properties', '{}'::jsonb)
    )
    on conflict (shopify_product_id) do update set
      title = excluded.title,
      sku = coalesce(excluded.sku, public.products.sku),
      price = excluded.price,
      variations = coalesce(excluded.variations, public.products.variations),
      variant_options = coalesce(excluded.variant_options, public.products.variant_options)
    returning id into v_product_id;

    insert into public.order_items (
      order_id, product_id, shopify_variant_id, title, sku, quantity,
      price, total, packed, variant_title, variant_options, grams
    ) values (
      v_order_id,
      v_product_id,
      (v_item->>'variant_id')::bigint,
      v_item->>'title',
      v_item->>'sku',
      (v_item->>'quantity')::integer,
      (v_item->>'price')::numeric,
      (v_item->>'quantity')::integer * (v_item->>'price')::numeric,
      false,
      v_item->>'variant_title',
      coalesce(v_item->'properties', '{}'::jsonb),
      coalesce((v_item->>'grams')::integer, 0)
    );
  end loop;

  return v_order_id;
end;
$$ language plpgsql;

create or replace function public.sync_shopify_order(shopify_order_data jsonb)
returns uuid as $$
  select public.sync_shopify_order_to_db(shopify_order_data);
$$ language sql;

insert into public.system_settings (key, value)
values
(
  'api_configs',
  '{
    "shopify": {
      "enabled": false,
      "shop_url": "",
      "access_token": "",
      "client_id": "",
      "client_secret": "",
      "webhook_secret": ""
    },
    "interakt": {
      "enabled": false,
      "api_key": "",
      "base_url": "https://api.interakt.ai"
    }
  }'::jsonb
),
(
  'from_address',
  '{
    "store_name": "",
    "address1": "",
    "address2": "",
    "city": "",
    "state": "",
    "zip": "",
    "country": "India",
    "phone": "",
    "email": ""
  }'::jsonb
),
(
  'workflow_settings',
  '{
    "labelTemplate": "thermal-4x6",
    "bypassPacking": false
  }'::jsonb
)
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

-- No hardcoded courier rows are inserted.
-- Add your own rows in courier_partners based on the first 4 characters/digits
-- of the tracking number. The app already does:
--   trackingNumber.startsWith(tracking_prefix)
--
-- Example:
-- insert into public.courier_partners
--   (name, code, tracking_url, tracking_prefix, is_active, sort_order)
-- values
--   ('Courier A', 'courier-a', 'https://track.example.com/{number}', '2158', true, 1),
--   ('Courier B', 'courier-b', 'https://track.other.com/{number}', '1334', true, 2);
