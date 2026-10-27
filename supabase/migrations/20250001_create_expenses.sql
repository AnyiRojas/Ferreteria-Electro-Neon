-- ─── Tabla: expenses (Gastos / Contabilidad) ─────────────────────────────────
-- Ejecutar en el SQL Editor de Supabase

create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  date            date not null,
  category        text not null default 'otros',
  description     text not null,
  amount          numeric(14,2) not null default 0,
  receipt_number  text,
  supplier        text,
  tax_base        numeric(14,2) not null default 0,
  iva             numeric(14,2) not null default 0,
  retefuente      numeric(14,2) not null default 0,
  reteica         numeric(14,2) not null default 0,
  created_at      timestamptz not null default now()
);

-- Índice por fecha para consultas por período
create index if not exists expenses_date_idx on public.expenses (date desc);

-- RLS: solo usuarios autenticados pueden leer/escribir
alter table public.expenses enable row level security;

create policy "Autenticados pueden leer gastos"
  on public.expenses for select
  using (auth.role() = 'authenticated');

create policy "Autenticados pueden insertar gastos"
  on public.expenses for insert
  with check (auth.role() = 'authenticated');

create policy "Autenticados pueden eliminar gastos"
  on public.expenses for delete
  using (auth.role() = 'authenticated');

create policy "Autenticados pueden actualizar gastos"
  on public.expenses for update
  using (auth.role() = 'authenticated');
