-- Tables de production utilisées par 0144 et absentes de l'environnement 0135–0137 (structures réduites).
create table if not exists public.bsh_hotes (id uuid primary key default gen_random_uuid(), profile_id uuid, nom text);
create table if not exists public.bsh_evenements (id uuid primary key default gen_random_uuid(), titre text);
create table if not exists public.bsh_musique (id uuid primary key default gen_random_uuid(), titre text);
alter table public.profiles add column if not exists date_naissance date, add column if not exists membership_status text default 'customer';
create schema if not exists realtime;
create or replace function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '') $$;
create table if not exists realtime.messages (id bigserial primary key, topic text, payload jsonb);
alter table realtime.messages enable row level security;
alter table public.bellaia_organisations add column if not exists nom_commercial text;   -- présent en production
