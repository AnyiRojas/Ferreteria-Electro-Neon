-- ─── Tabla: debts (Obligaciones / Préstamos) ─────────────────────────────────
-- Ejecutar en el SQL Editor de Supabase

create table if not exists public.debts (
  id               uuid primary key default gen_random_uuid(),
  creditor         text not null,
  description      text,
  original_amount  numeric(14,2) not null default 0,
  interest_rate    numeric(6,2)  not null default 0,   -- % mensual
  daily_payment    numeric(14,2) not null default 0,   -- cuota diaria sugerida
  start_date       date not null default current_date,
  due_date         date,
  status           text not null default 'active'      -- 'active' | 'paid'
                   check (status in ('active','paid')),
  created_at       timestamptz not null default now()
);

-- ─── Tabla: debt_payments (Abonos a deuda) ───────────────────────────────────

create table if not exists public.debt_payments (
  id          uuid primary key default gen_random_uuid(),
  debt_id     uuid not null references public.debts(id) on delete cascade,
  date        date not null default current_date,
  amount      numeric(14,2) not null,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Índices
create index if not exists debts_status_idx        on public.debts (status);
create index if not exists debt_payments_debt_idx  on public.debt_payments (debt_id);
create index if not exists debt_payments_date_idx  on public.debt_payments (date desc);

-- ─── RLS: la app usa anon key (sin login), se permite acceso público ──────────

alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;

drop policy if exists "Auth puede leer deudas" on public.debts;
drop policy if exists "Auth puede insertar deudas" on public.debts;
drop policy if exists "Auth puede actualizar deudas" on public.debts;
drop policy if exists "Auth puede eliminar deudas" on public.debts;
drop policy if exists "Auth puede leer abonos" on public.debt_payments;
drop policy if exists "Auth puede insertar abonos" on public.debt_payments;
drop policy if exists "Auth puede eliminar abonos" on public.debt_payments;

create policy "Acceso publico a deudas"
  on public.debts for all
  using (true)
  with check (true);

create policy "Acceso publico a abonos"
  on public.debt_payments for all
  using (true)
  with check (true);
