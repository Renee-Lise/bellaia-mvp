-- Reproduction fidèle (relevé de production du 23/11/2026) de ce qui gouverne bellaia_documents.
create table if not exists auth.users (id uuid primary key);
insert into auth.users values ('00000000-0000-0000-0000-0000000000f1'),('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000a2'),('00000000-0000-0000-0000-0000000000c1'),('00000000-0000-0000-0000-0000000000b1');
insert into public.profiles(id, role) values ('00000000-0000-0000-0000-0000000000f1','fondatrice'),('00000000-0000-0000-0000-0000000000a1','assistante'),('00000000-0000-0000-0000-0000000000a2','assistante'),('00000000-0000-0000-0000-0000000000c1','cliente'),('00000000-0000-0000-0000-0000000000b1','hote');
-- assistante a2 : permission « acces_complet » (équivalent fondatrice) ; a1 : aucune
insert into public.bellaia_permissions(user_id, permission) values ('00000000-0000-0000-0000-0000000000a2','acces_complet');
create table public.bellaia_clients (id uuid primary key);
create table public.bsh_hotes (profile_id uuid, statut text);
insert into public.bsh_hotes values ('00000000-0000-0000-0000-0000000000b1','active');
create or replace function public.est_staff_bellaia() returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice')
    or exists (select 1 from public.bellaia_permissions where user_id = auth.uid() and permission = 'acces_complet' and (expire_le is null or expire_le > now()))); $$;
create or replace function public.est_hote_bsh() returns boolean language sql stable security definer as $$
  select exists (select 1 from public.bsh_hotes where profile_id = auth.uid() and statut = 'active'); $$;
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create table public.bellaia_documents (
  id uuid default gen_random_uuid() not null primary key, reference text unique, titre text not null, module text not null, categorie text,
  type_fichier text default 'html', contenu_html text, fichier_url text, taille_octets integer, client_id uuid references public.bellaia_clients(id) on delete set null,
  entite_table text, entite_id uuid, statut text default 'brouillon', version integer default 1, tags text[], notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(), entite_type text, hote_id uuid references auth.users(id),
  storage_path text, taille_bytes bigint, type_mime text, signe boolean default false, signe_le timestamptz);
create trigger trg_docs_upd before update on public.bellaia_documents for each row execute function set_updated_at();
alter table public.bellaia_documents enable row level security;
create policy bellaia_documents_hote_bsh on public.bellaia_documents for select to authenticated using ((module = 'BSH') and est_hote_bsh() and ((hote_id = auth.uid()) or ((hote_id is null) and (categorie = 'ressource_hotesse'))));
create policy bellaia_documents_staff on public.bellaia_documents for all to public using (est_staff_bellaia()) with check (est_staff_bellaia());
create policy ged_client_own on public.bellaia_documents for select to public using (client_id = auth.uid());
grant all on public.bellaia_documents to anon, authenticated;
