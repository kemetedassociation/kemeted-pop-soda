-- ============================================================
-- KEMETED SAVEUR — schéma comptes clients / points / B2B
-- À coller une seule fois dans Supabase → SQL Editor → Run
-- ============================================================

-- one profile row per authenticated user
create table public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  tier text not null default 'b2c' check (tier in ('b2c','b2b')),
  points_balance integer not null default 0,
  b2b_requested boolean not null default false,
  b2b_company text,
  created_at timestamptz not null default now()
);

-- one row per Stripe order, written only by the webhook (service_role)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  stripe_session_id text unique not null,
  email text not null,
  amount_total integer not null, -- montant en centimes
  currency text not null default 'eur',
  points_earned integer not null default 0,
  created_at timestamptz not null default now()
);
create index orders_customer_idx on public.orders(customer_id);

-- ledger of point movements, so the balance is always auditable
create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  delta integer not null,
  reason text not null,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index point_transactions_customer_idx on public.point_transactions(customer_id);

-- auto-create a customers row whenever someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.customers (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- let a signed-in client request B2B status WITHOUT being able to grant
-- itself the tier or points directly (that stays admin-only, via the
-- Table Editor, or the service_role key used by the webhook)
create or replace function public.request_b2b(company text)
returns void as $$
begin
  update public.customers
  set b2b_requested = true, b2b_company = company
  where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.request_b2b(text) to authenticated;

-- atomic points credit, called only by the Stripe webhook (service_role,
-- which already bypasses RLS — this just avoids a read-then-write race)
create or replace function public.increment_points(p_customer_id uuid, p_delta integer)
returns void as $$
begin
  update public.customers
  set points_balance = points_balance + p_delta
  where id = p_customer_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ============== Row Level Security ==============
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.point_transactions enable row level security;

-- a customer can only ever read their own row — no UPDATE policy is
-- granted on purpose, so tier/points can't be self-edited from the client
create policy "customers read own" on public.customers
  for select using (auth.uid() = id);

create policy "orders read own" on public.orders
  for select using (auth.uid() = customer_id);

create policy "transactions read own" on public.point_transactions
  for select using (auth.uid() = customer_id);

-- ============== how to promote someone to B2B ==============
-- Table Editor → customers → find the row → set tier = 'b2b'. That's it,
-- their dashboard will unlock the pro pricing section on next load.
