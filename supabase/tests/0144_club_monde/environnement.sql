-- Tables existantes en production utilisées par 0144 (structures réduites aux colonnes utiles),
-- schéma realtime simulé (realtime.topic() lit le paramètre « realtime.topic »), comptes de test.
create table public.bsh_hotes (id uuid primary key default gen_random_uuid(), profile_id uuid, nom text, statut text default 'actif');
create table public.bsh_evenements (id uuid primary key default gen_random_uuid(), titre text);
create table public.bsh_musique (id uuid primary key default gen_random_uuid(), titre text);
create table public.bellaia_missions (id uuid primary key default gen_random_uuid(), titre text, assigne_a uuid);
create schema realtime;
create function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '') $$;
create table realtime.messages (id bigserial primary key, topic text, payload jsonb, inserted_at timestamptz default now());
alter table realtime.messages enable row level security;
grant usage on schema realtime to anon, authenticated;
grant select, insert on realtime.messages to authenticated; grant usage on sequence realtime.messages_id_seq to authenticated;
grant execute on function realtime.topic() to anon, authenticated;
-- Comptes : F fondatrice ; H1, H2 futurs hôtes ; J1, J2, J3 joueurs adultes ; MIN mineur ; NV âge non vérifié ; NC adulte sans charte.
insert into public.profiles (id, prenom, role, statut, age_verifi, date_naissance) values
 ('00000000-0000-0000-0000-0000000000f1','Fondatrice','fondatrice','actif',true,null),
 ('00000000-0000-0000-0000-0000000000a1','Hote1','cliente','actif',true,'1990-01-01'),
 ('00000000-0000-0000-0000-0000000000a2','Hote2','cliente','actif',true,'1992-01-01'),
 ('00000000-0000-0000-0000-0000000000b1','Joueur1','cliente','actif',true,'1995-05-05'),
 ('00000000-0000-0000-0000-0000000000b2','Joueur2','cliente','actif',true,null),
 ('00000000-0000-0000-0000-0000000000b3','Joueur3','cliente','actif',true,'1988-03-03'),
 ('00000000-0000-0000-0000-0000000000c1','Mineur','cliente','actif',true,(current_date - interval '16 years')::date),
 ('00000000-0000-0000-0000-0000000000c2','NonVerifie','cliente','actif',false,null),
 ('00000000-0000-0000-0000-0000000000c3','SansCharte','cliente','actif',true,'1980-01-01');
insert into public.bsh_hotes (id, profile_id, nom) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','Hote1');
insert into public.bellaia_missions (id, titre) values ('20000000-0000-0000-0000-000000000001','Animer la Red Room du 28/11');
