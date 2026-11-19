-- Environnement minimal reproduisant Supabase (rôles, auth.uid, storage) + tables existantes utilisées par 0129.
do $$ begin if not exists (select 1 from pg_roles where rolname = $r$anon$r$) then create role anon nologin; create role authenticated nologin; end if; end $$;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid $$;
grant usage on schema auth, storage, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated;
create table public.profiles (id uuid primary key, prenom text, role text, statut text, age_verifi boolean default false, date_naissance date, membership_status text default 'customer');
create table public.bellaia_permissions (id uuid primary key default gen_random_uuid(), user_id uuid, permission text, univers text default '*', expire_le timestamptz);
create function public.is_fondatrice() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice') $$;
create function public.a_permission(p text, u text default '*') returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice')
    or exists (select 1 from public.bellaia_permissions bp where bp.user_id = auth.uid() and bp.permission in (p, 'acces_complet') and (bp.univers = '*' or bp.univers = u) and (bp.expire_le is null or bp.expire_le > now()))) $$;
-- privilèges par défaut Supabase : les tables public sont accessibles aux rôles API (la RLS filtre)
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
