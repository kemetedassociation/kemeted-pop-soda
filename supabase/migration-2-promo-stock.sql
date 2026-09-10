-- ============================================================
-- KEMETED SAVEUR — stock du coffret découverte de lancement (200 ex.)
-- ============================================================

create table public.promo_stock (
  id text primary key,
  remaining integer not null,
  total integer not null
);

insert into public.promo_stock (id, remaining, total)
values ('coffret-decouverte', 200, 200);

-- lecture publique (pour afficher "X restants" sur le site), écriture
-- réservée au service_role (le webhook Stripe), jamais au client
alter table public.promo_stock enable row level security;
create policy "promo stock public read" on public.promo_stock
  for select using (true);

-- décrément atomique et borné à 0 (jamais de stock négatif même en cas
-- d'achats simultanés au moment où le stock touche la limite)
create or replace function public.decrement_stock(p_id text, p_qty integer)
returns integer as $$
declare
  new_remaining integer;
begin
  update public.promo_stock
  set remaining = greatest(0, remaining - p_qty)
  where id = p_id
  returning remaining into new_remaining;
  return new_remaining;
end;
$$ language plpgsql security definer set search_path = public;
