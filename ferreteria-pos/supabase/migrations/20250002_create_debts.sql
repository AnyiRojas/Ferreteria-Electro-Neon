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

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;

-- debts
create policy "Auth puede leer deudas"
  on public.debts for select using (auth.role() = 'authenticated');
create policy "Auth puede insertar deudas"
  on public.debts for insert with check (auth.role() = 'authenticated');
create policy "Auth puede actualizar deudas"
  on public.debts for update using (auth.role() = 'authenticated');
create policy "Auth puede eliminar deudas"
  on public.debts for delete using (auth.role() = 'authenticated');

-- debt_payments
create policy "Auth puede leer abonos"
  on public.debt_payments for select using (auth.role() = 'authenticated');
create policy "Auth puede insertar abonos"
  on public.debt_payments for insert with check (auth.role() = 'authenticated');
create policy "Auth puede eliminar abonos"
  on public.debt_payments for delete using (auth.role() = 'authenticated');
