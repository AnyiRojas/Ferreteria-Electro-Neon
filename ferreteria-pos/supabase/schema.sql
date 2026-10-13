-- ============================================================
-- Ferretería POS — Supabase Schema (solo tablas + funciones)
-- Sin datos de ejemplo — carga tu propio catálogo vía Excel
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── CATEGORIES ──────────────────────────────────────────────
create table if not exists categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  color       text default '#f97316',
  created_at  timestamptz not null default now()
);

-- ─── PRODUCTS ────────────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  price       numeric(12,2) not null default 0,
  cost        numeric(12,2) not null default 0,
  stock       integer not null default 0,
  min_stock   integer not null default 5,
  image_url   text,
  category_id uuid references categories(id) on delete set null,
  barcode     text unique,
  unit        text not null default 'und',
  supplier    text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Agregar columna supplier si no existe (para proyectos ya creados)
alter table products add column if not exists supplier text;

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on products;
create trigger products_updated_at
  before update on products
  for each row execute procedure set_updated_at();

-- ─── SALES ───────────────────────────────────────────────────
create table if not exists sales (
  id             uuid primary key default uuid_generate_v4(),
  total          numeric(12,2) not null default 0,
  discount       numeric(12,2) not null default 0,
  payment_method text not null check (payment_method in ('cash','card','transfer')),
  cash_received  numeric(12,2),
  change_given   numeric(12,2),
  notes          text,
  created_at     timestamptz not null default now()
);

-- ─── SALE ITEMS ──────────────────────────────────────────────
create table if not exists sale_items (
  id          uuid primary key default uuid_generate_v4(),
  sale_id     uuid not null references sales(id) on delete cascade,
  product_id  uuid not null references products(id) on delete restrict,
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(12,2) not null,
  subtotal    numeric(12,2) not null,
  created_at  timestamptz not null default now()
);

-- ─── STOCK MOVEMENTS ─────────────────────────────────────────
create table if not exists stock_movements (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null references products(id) on delete cascade,
  type         text not null check (type in ('in','out','adjustment')),
  quantity     integer not null,
  reason       text,
  reference_id uuid,
  created_at   timestamptz not null default now()
);

-- ─── INDEXES ─────────────────────────────────────────────────
create index if not exists idx_products_category   on products(category_id);
create index if not exists idx_products_active     on products(active);
create index if not exists idx_products_barcode    on products(barcode);
create index if not exists idx_sale_items_sale     on sale_items(sale_id);
create index if not exists idx_sale_items_product  on sale_items(product_id);
create index if not exists idx_stock_mov_product   on stock_movements(product_id);
create index if not exists idx_sales_created_at    on sales(created_at);

-- ─── FUNCTION: process_sale ──────────────────────────────────
create or replace function process_sale(
  p_items          jsonb,
  p_total          numeric,
  p_discount       numeric,
  p_payment_method text,
  p_cash_received  numeric,
  p_change_given   numeric,
  p_notes          text
)
returns uuid language plpgsql as $$
declare
  v_sale_id uuid;
  v_item    jsonb;
begin
  insert into sales (total, discount, payment_method, cash_received, change_given, notes)
  values (p_total, p_discount, p_payment_method, p_cash_received, p_change_given, p_notes)
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
    set
      stock = greatest(0, stock - (v_item->>'quantity')::integer)
      -- No se desactiva el producto cuando se agota; el administrador
      -- puede reabastecer el stock editándolo desde el inventario.
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

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table categories      enable row level security;
alter table products        enable row level security;
alter table sales           enable row level security;
alter table sale_items      enable row level security;
alter table stock_movements enable row level security;

drop policy if exists "Public read categories"      on categories;
drop policy if exists "Anon write categories"       on categories;
drop policy if exists "Auth write categories"       on categories;
drop policy if exists "Public read products"        on products;
drop policy if exists "Anon write products"         on products;
drop policy if exists "Auth write products"         on products;
drop policy if exists "Public read sales"           on sales;
drop policy if exists "Anon write sales"            on sales;
drop policy if exists "Auth write sales"            on sales;
drop policy if exists "Public read sale_items"      on sale_items;
drop policy if exists "Anon write sale_items"       on sale_items;
drop policy if exists "Auth write sale_items"       on sale_items;
drop policy if exists "Public read stock_movements" on stock_movements;
drop policy if exists "Anon write stock_movements"  on stock_movements;
drop policy if exists "Auth write stock_movements"  on stock_movements;

-- Lectura y escritura pública (sin login) — apto para uso local sin auth
create policy "Public read categories"      on categories      for select using (true);
create policy "Anon write categories"       on categories      for all    using (true);
create policy "Public read products"        on products        for select using (true);
create policy "Anon write products"         on products        for all    using (true);
create policy "Public read sales"           on sales           for select using (true);
create policy "Anon write sales"            on sales           for all    using (true);
create policy "Public read sale_items"      on sale_items      for select using (true);
create policy "Anon write sale_items"       on sale_items      for all    using (true);
create policy "Public read stock_movements" on stock_movements for select using (true);
create policy "Anon write stock_movements"  on stock_movements for all    using (true);

-- ─── GRANTS AL ROL ANON ──────────────────────────────────────
-- Sin esto el error 401 "permission denied" persiste aunque las policies existan
grant usage  on schema public                    to anon;
grant all    on all tables    in schema public   to anon;
grant all    on all sequences in schema public   to anon;
grant execute on all functions in schema public  to anon;
