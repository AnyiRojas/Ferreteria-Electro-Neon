-- ============================================================
-- Ferretería POS — Migración v2
-- Ejecutar este script si ya tienes la base de datos v1.
-- Es seguro: solo agrega lo que no existe.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─── 1. CUSTOMERS (nueva tabla) ──────────────────────────────
create table if not exists customers (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  document_type   text not null default 'CC' check (document_type in ('CC','NIT','CE','PP')),
  document_number text not null,
  email           text,
  phone           text,
  address         text,
  city            text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (document_type, document_number)
);

-- ─── 2. Columnas nuevas en SALES ─────────────────────────────
alter table sales add column if not exists customer_id uuid references customers(id) on delete set null;
alter table sales add column if not exists register_id uuid;

-- ─── 3. CASH REGISTERS (nueva tabla) ─────────────────────────
create table if not exists cash_registers (
  id               uuid primary key default uuid_generate_v4(),
  opened_at        timestamptz not null default now(),
  closed_at        timestamptz,
  opening_balance  numeric(12,2) not null default 0,
  closing_balance  numeric(12,2),
  status           text not null default 'open' check (status in ('open','closed')),
  notes            text,
  total_cash       numeric(12,2),
  total_card       numeric(12,2),
  total_transfer   numeric(12,2),
  total_sales      numeric(12,2),
  difference       numeric(12,2),
  created_by       text,
  created_at       timestamptz not null default now()
);

-- ─── 4. CASH MOVEMENTS (nueva tabla) ─────────────────────────
create table if not exists cash_movements (
  id          uuid primary key default uuid_generate_v4(),
  register_id uuid not null references cash_registers(id) on delete cascade,
  type        text not null check (type in ('income','expense')),
  amount      numeric(12,2) not null,
  description text not null,
  created_at  timestamptz not null default now()
);

-- ─── 5. SUPPLIERS (nueva tabla) ──────────────────────────────
create table if not exists suppliers (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  nit          text,
  contact_name text,
  email        text,
  phone        text,
  address      text,
  city         text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ─── 6. PURCHASE ORDERS (nueva tabla) ────────────────────────
create table if not exists purchase_orders (
  id          uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references suppliers(id) on delete restrict,
  status      text not null default 'pending' check (status in ('pending','received','cancelled')),
  total       numeric(12,2) not null default 0,
  notes       text,
  created_at  timestamptz not null default now(),
  received_at timestamptz
);

-- ─── 7. PURCHASE ORDER ITEMS (nueva tabla) ───────────────────
create table if not exists purchase_order_items (
  id         uuid primary key default uuid_generate_v4(),
  order_id   uuid not null references purchase_orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity   integer not null check (quantity > 0),
  unit_cost  numeric(12,2) not null,
  subtotal   numeric(12,2) not null
);

-- ─── 8. QUOTES (nueva tabla) ─────────────────────────────────
create table if not exists quotes (
  id            uuid primary key default uuid_generate_v4(),
  customer_id   uuid references customers(id) on delete set null,
  customer_name text,
  status        text not null default 'draft' check (status in ('draft','sent','approved','rejected')),
  total         numeric(12,2) not null default 0,
  discount      numeric(12,2) not null default 0,
  valid_until   date,
  notes         text,
  created_at    timestamptz not null default now()
);

-- ─── 9. QUOTE ITEMS (nueva tabla) ────────────────────────────
create table if not exists quote_items (
  id         uuid primary key default uuid_generate_v4(),
  quote_id   uuid not null references quotes(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity   integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  subtotal   numeric(12,2) not null
);

-- ─── 10. RETURNS (nueva tabla) ───────────────────────────────
create table if not exists returns (
  id         uuid primary key default uuid_generate_v4(),
  sale_id    uuid references sales(id) on delete set null,
  reason     text not null,
  total      numeric(12,2) not null default 0,
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  notes      text,
  created_at timestamptz not null default now()
);

-- ─── 11. RETURN ITEMS (nueva tabla) ──────────────────────────
create table if not exists return_items (
  id         uuid primary key default uuid_generate_v4(),
  return_id  uuid not null references returns(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity   integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  subtotal   numeric(12,2) not null
);

-- ─── 12. APP SETTINGS (nueva tabla) ──────────────────────────
create table if not exists app_settings (
  id               uuid primary key default uuid_generate_v4(),
  company_name     text not null default 'Ferretería',
  nit              text not null default '',
  address          text not null default '',
  city             text not null default '',
  phone            text not null default '',
  email            text not null default '',
  dian_resolution  text not null default '',
  dian_prefix      text not null default '',
  dian_from        integer not null default 1,
  dian_to          integer not null default 1000,
  dian_valid_until date,
  printer_name     text not null default '',
  drawer_enabled   boolean not null default false,
  drawer_port      text not null default 'COM1',
  updated_at       timestamptz not null default now()
);

-- Fila por defecto (ID fijo para upsert desde la app)
insert into app_settings (id, company_name)
values ('00000000-0000-0000-0000-000000000001', 'Ferretería')
on conflict (id) do nothing;

-- ─── 13. Índices nuevos ───────────────────────────────────────
create index if not exists idx_sales_customer      on sales(customer_id);
create index if not exists idx_sales_register      on sales(register_id);
create index if not exists idx_cash_mov_register   on cash_movements(register_id);
create index if not exists idx_po_supplier         on purchase_orders(supplier_id);
create index if not exists idx_poi_order           on purchase_order_items(order_id);
create index if not exists idx_quotes_customer     on quotes(customer_id);
create index if not exists idx_quote_items_quote   on quote_items(quote_id);
create index if not exists idx_returns_sale        on returns(sale_id);

-- ─── 14. Actualizar función process_sale ─────────────────────
create or replace function process_sale(
  p_items          jsonb,
  p_total          numeric,
  p_discount       numeric,
  p_payment_method text,
  p_cash_received  numeric,
  p_change_given   numeric,
  p_notes          text,
  p_customer_id    uuid default null,
  p_register_id    uuid default null
)
returns uuid language plpgsql as $$
declare
  v_sale_id uuid;
  v_item    jsonb;
begin
  insert into sales (total, discount, payment_method, cash_received, change_given, notes, customer_id, register_id)
  values (p_total, p_discount, p_payment_method, p_cash_received, p_change_given, p_notes, p_customer_id, p_register_id)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into sale_items (sale_id, product_id, quantity, unit_price, subtotal)
    values (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      (v_item->>'subtotal')::numeric
    );

    update products
    set stock = greatest(0, stock - (v_item->>'quantity')::integer)
    where id = (v_item->>'product_id')::uuid;

    insert into stock_movements (product_id, type, quantity, reason, reference_id)
    values (
      (v_item->>'product_id')::uuid,
      'out',
      (v_item->>'quantity')::integer,
      'Venta',
      v_sale_id
    );
  end loop;

  return v_sale_id;
end;
$$;

-- ─── 15. Nueva función close_cash_register ───────────────────
create or replace function close_cash_register(
  p_register_id     uuid,
  p_closing_balance numeric,
  p_notes           text default null
)
returns void language plpgsql as $$
declare
  v_total_cash     numeric := 0;
  v_total_card     numeric := 0;
  v_total_transfer numeric := 0;
  v_total_sales    numeric := 0;
begin
  select
    coalesce(sum(case when payment_method = 'cash'     then total else 0 end), 0),
    coalesce(sum(case when payment_method = 'card'     then total else 0 end), 0),
    coalesce(sum(case when payment_method = 'transfer' then total else 0 end), 0),
    coalesce(sum(total), 0)
  into v_total_cash, v_total_card, v_total_transfer, v_total_sales
  from sales
  where register_id = p_register_id;

  -- Sumar ingresos y restar egresos manuales
  select
    v_total_cash
    + coalesce((select sum(amount) from cash_movements where register_id = p_register_id and type = 'income'), 0)
    - coalesce((select sum(amount) from cash_movements where register_id = p_register_id and type = 'expense'), 0)
  into v_total_cash;

  update cash_registers set
    closed_at        = now(),
    closing_balance  = p_closing_balance,
    status           = 'closed',
    notes            = coalesce(p_notes, notes),
    total_cash       = v_total_cash,
    total_card       = v_total_card,
    total_transfer   = v_total_transfer,
    total_sales      = v_total_sales,
    difference       = p_closing_balance - v_total_cash
  where id = p_register_id;
end;
$$;

-- ─── 16. RLS para tablas nuevas ───────────────────────────────
alter table customers            enable row level security;
alter table cash_registers       enable row level security;
alter table cash_movements       enable row level security;
alter table suppliers            enable row level security;
alter table purchase_orders      enable row level security;
alter table purchase_order_items enable row level security;
alter table quotes               enable row level security;
alter table quote_items          enable row level security;
alter table returns              enable row level security;
alter table return_items         enable row level security;
alter table app_settings         enable row level security;

do $$ declare t text; begin
  for t in select unnest(array[
    'customers','cash_registers','cash_movements',
    'suppliers','purchase_orders','purchase_order_items',
    'quotes','quote_items','returns','return_items','app_settings'
  ]) loop
    execute format('drop policy if exists "Public read %s" on %s', t, t);
    execute format('drop policy if exists "Anon write %s"  on %s', t, t);
    execute format('create policy "Public read %s" on %s for select using (true)', t, t);
    execute format('create policy "Anon write %s"  on %s for all    using (true)', t, t);
  end loop;
end $$;

-- Grants al rol anon (por si hay tablas nuevas)
grant usage  on schema public                   to anon;
grant all    on all tables    in schema public  to anon;
grant all    on all sequences in schema public  to anon;
grant execute on all functions in schema public to anon;
