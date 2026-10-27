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

-- RLS: la app usa anon key (sin login), se permite acceso público
alter table public.expenses enable row level security;

drop policy if exists "Autenticados pueden leer gastos" on public.expenses;
drop policy if exists "Autenticados pueden insertar gastos" on public.expenses;
drop policy if exists "Autenticados pueden eliminar gastos" on public.expenses;
drop policy if exists "Autenticados pueden actualizar gastos" on public.expenses;

create policy "Acceso publico a gastos"
  on public.expenses for all
  using (true)
  with check (true);
