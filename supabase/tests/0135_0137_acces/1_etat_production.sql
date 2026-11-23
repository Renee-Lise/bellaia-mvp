-- Reproduction de l'état de PRODUCTION (23/11/2026) des tables de droits et de missions, sans donnée réelle.
-- S'applique après : environnement minimal (0129), état des profils (0134/1_etat_actuel.sql) et migration 0134.
create extension if not exists pgcrypto;
alter table auth.users add column if not exists email text;
create table if not exists auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid);
create table if not exists auth.refresh_tokens (id bigserial primary key, user_id varchar(255), revoked boolean default false);
create table public.business_units (code text primary key);
insert into public.business_units values ('FOOD'),('EVENTS'),('BSH'),('STUDIO'),('GENERAL');
create table public.bellaia_organisations (id uuid primary key default gen_random_uuid(), nom text, type text);
create table public.bellaia_autorisations (id uuid primary key default gen_random_uuid(), organisation_id uuid, fonction text, statut text, validee_par_fondatrice boolean);
create table public.bellaia_journal (id bigserial primary key, action text, cible text, details jsonb, le timestamptz default now());
drop table if exists public.bellaia_permissions cascade;
create table public.bellaia_permissions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, permission text, univers text default '*',
  accorde_par uuid default auth.uid(), expire_le timestamptz, created_at timestamptz default now(), constraint bellaia_permissions_user_id_permission_univ unique (user_id, permission, univers));
create table public.bellaia_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, role text check (role = any (array['assistante','prestataire','fournisseur','hote','collaborateur','qualite','autre'])),
  organisation_id uuid references public.bellaia_organisations(id) on delete cascade, statut text check (statut = any (array['invite','actif','suspendu','revoque'])), libelle text, accorde_par uuid, created_at timestamptz default now(), updated_at timestamptz default now());
create or replace function public.journaliser_droits() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.bellaia_journal (action, cible, details) values (tg_table_name || '.' || lower(tg_op), coalesce(new.user_id, old.user_id)::text, jsonb_build_object('avant', to_jsonb(old), 'apres', to_jsonb(new)));
  return coalesce(new, old);
end $$;
create trigger trg_journal_perms after insert or update or delete on public.bellaia_permissions for each row execute function public.journaliser_droits();
create trigger trg_journal_roles after insert or update or delete on public.bellaia_roles for each row execute function public.journaliser_droits();
create or replace function public.a_permission(p text, u text default '*') returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null and (exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice')
    or exists (select 1 from public.bellaia_permissions bp where bp.user_id = auth.uid() and bp.permission in (p, 'acces_complet') and (bp.univers = '*' or bp.univers = u) and (bp.expire_le is null or bp.expire_le > now()))); $$;
create or replace function public.est_staff_bellaia() returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null and (exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice')
    or exists (select 1 from public.bellaia_permissions where user_id = auth.uid() and permission = 'acces_complet' and (expire_le is null or expire_le > now()))); $$;
alter table public.bellaia_permissions enable row level security; alter table public.bellaia_roles enable row level security;
create policy perms_fondatrice on public.bellaia_permissions for all using (is_fondatrice()) with check (is_fondatrice());
create policy perms_moi on public.bellaia_permissions for select using (user_id = auth.uid());
create policy roles_fondatrice on public.bellaia_roles for all using (is_fondatrice()) with check (is_fondatrice());
create policy roles_moi on public.bellaia_roles for select using (user_id = auth.uid());
create table public.bellaia_missions (id uuid primary key default gen_random_uuid(), pole text check (pole = any (array['FOOD','EVENTS','BSH','STUDIO'])), type text default 'autre' check (type = any (array['patisserie','creation','hotesse','autre'])),
  titre text, details text, statut text default 'a_faire' check (statut = any (array['a_faire','en_cours','a_valider','fait','annule'])), assigne_a uuid references auth.users(id) on delete set null, cree_par uuid default auth.uid(),
  created_at timestamptz default now(), updated_at timestamptz default now(), priorite smallint, echeance date, organisation_id uuid references public.bellaia_organisations(id), simulation boolean default false, univers text references public.business_units(code));
create table public.bellaia_missions_fil (id uuid primary key default gen_random_uuid(), mission_id uuid references public.bellaia_missions(id) on delete cascade, auteur uuid default auth.uid(),
  type text default 'commentaire' check (type = any (array['commentaire','correction','validation','statut','fichier'])), texte text, fichier_chemin text, created_at timestamptz default now());
create or replace function public.mission_pole_compatible() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if tg_op = 'UPDATE' and new.pole is distinct from old.pole and new.univers is not distinct from old.univers then new.univers := new.pole; end if;
  if new.univers is null then new.univers := coalesce(new.pole, 'GENERAL'); end if;
  new.pole := case when new.univers in ('FOOD','EVENTS','BSH','STUDIO') then new.univers when new.univers = 'VILDOR' then 'FOOD' else 'STUDIO' end;
  return new;
end $$;
create trigger trg_mission_pole_compatible before insert or update on public.bellaia_missions for each row execute function public.mission_pole_compatible();
alter table public.bellaia_missions enable row level security; alter table public.bellaia_missions_fil enable row level security;
create policy missions_assignee_lecture on public.bellaia_missions for select using (assigne_a = auth.uid());
create policy missions_equipe on public.bellaia_missions for all using (a_permission('missions.gerer')) with check (a_permission('missions.gerer'));
create policy fil_lecture on public.bellaia_missions_fil for select using (a_permission('missions.gerer') or exists (select 1 from public.bellaia_missions m where m.id = mission_id and m.assigne_a = auth.uid()));
create policy fil_ecriture on public.bellaia_missions_fil for insert with check (auteur = auth.uid() and (a_permission('missions.gerer') or (type = any (array['commentaire','fichier','statut']) and exists (select 1 from public.bellaia_missions m where m.id = mission_id and m.assigne_a = auth.uid()))));
-- Table conservée (0 ligne en production)
create table public.bsh_hotes_candidatures (id uuid primary key default gen_random_uuid(), prenom text, statut text);
grant all on all tables in schema public to anon, authenticated; grant usage, select on all sequences in schema public to anon, authenticated;
