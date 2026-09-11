-- ============================================================
-- KEMETED SAVEUR — newsletter, panier abandonné, demande d'avis
-- ============================================================

-- liste d'abonnés newsletter, indépendante des comptes clients
-- (le formulaire newsletter n'exige pas de compte)
create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);
alter table public.subscribers enable row level security;
-- n'importe qui peut s'inscrire (insert), mais personne ne peut lire la
-- liste depuis le client — seul service_role (les fonctions serveur) le peut
create policy "anyone can subscribe" on public.subscribers
  for insert with check (true);

-- panier synchronisé côté serveur pour les clients connectés — c'est ce
-- qui permet de détecter un panier abandonné (le panier "public" du site
-- vit dans le localStorage du navigateur, invisible au serveur)
create table public.carts (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  reminder_sent_at timestamptz
);
alter table public.carts enable row level security;
create policy "customers manage own cart" on public.carts
  for all using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

-- pour savoir si une demande d'avis a déjà été envoyée pour une commande
alter table public.orders add column if not exists review_requested_at timestamptz;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
