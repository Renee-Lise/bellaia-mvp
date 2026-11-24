-- Réplique minimale des objets de production utilisés par 0143 (structure relevée le 24/11/2026).
create table public.catalogue_produits (id uuid primary key default gen_random_uuid(), business_unit text, nom text, categorie_slug text, sous_categorie text, description_courte text, prix numeric, prix_promotion numeric, tags text[], galerie_photos text[], allergenes text[], ordre int, recette_id uuid, visible_client boolean, disponible boolean, statut text, metadata jsonb);
create table public.catalogue_variantes (id uuid primary key default gen_random_uuid(), produit_id uuid references public.catalogue_produits(id), nom text, prix numeric, disponible boolean);
alter table public.catalogue_produits enable row level security; alter table public.catalogue_variantes enable row level security;
create policy catalogue_produits_fondatrice on public.catalogue_produits for all using (public.is_fondatrice());
create policy catalogue_produits_lecture_publique on public.catalogue_produits for select to anon, authenticated using (false);
create policy catalogue_variantes_fondatrice on public.catalogue_variantes for all using (public.is_fondatrice());
create policy catalogue_variantes_lecture_publique on public.catalogue_variantes for select to anon, authenticated using (false);
create function public.food_produit_commandable(p uuid, a text[], r uuid) returns boolean language sql stable as $$ select coalesce(array_length(a,1),0) > 0 $$;
create table public.food_menu_jour (id uuid primary key default gen_random_uuid(), date date not null default current_date, items jsonb not null default '[]', lieux jsonb not null default '[]', statut text not null default 'brouillon', notes text, created_at timestamptz default now(), updated_at timestamptz default now());
alter table public.food_menu_jour enable row level security;
create policy food_menu_jour_lecture_publique on public.food_menu_jour for select to public using (statut = 'publie');
create policy food_menu_jour_fondatrice on public.food_menu_jour for all to public using (public.is_fondatrice()) with check (public.is_fondatrice());
-- vues d'origine (avant 0143)
\i rollback_vues.sql
