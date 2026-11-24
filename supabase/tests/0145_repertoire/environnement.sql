-- Objets de production utilisés par 0145 (structures réduites) + comptes fictifs.
create table auth.users (id uuid primary key, email text, created_at timestamptz default now());
alter table public.profiles add column if not exists nom text, add column if not exists telephone text;
create table public.bellaia_organisations (id uuid primary key, nom_commercial text);
create table public.bellaia_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), role text, organisation_id uuid references public.bellaia_organisations(id), statut text default 'actif', updated_at timestamptz);
alter table public.bellaia_permissions add column if not exists accorde_par uuid, add column if not exists created_at timestamptz default now();
create table public.bellaia_journal (id bigserial primary key, user_id uuid, action text, cible text, details jsonb, created_at timestamptz default now());
alter table public.bellaia_roles enable row level security; alter table public.bellaia_journal enable row level security;
create policy roles_fondatrice on public.bellaia_roles for all using (public.is_fondatrice()) with check (public.is_fondatrice());
create policy roles_moi on public.bellaia_roles for select using (user_id = auth.uid());
create policy journal_fondatrice on public.bellaia_journal for select using (public.is_fondatrice());
create function public.journaliser_droits() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.bellaia_journal (action, cible, details) values (tg_table_name || '.' || lower(tg_op), coalesce(new.user_id, old.user_id)::text, jsonb_build_object('avant', to_jsonb(old), 'apres', to_jsonb(new))); return coalesce(new, old); end $$;
create trigger trg_journal_roles after insert or delete or update on public.bellaia_roles for each row execute function public.journaliser_droits();
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000f1','fondatrice@exemple.invalid'), ('00000000-0000-0000-0000-00000000a001','lina@exemple.invalid'),
 ('00000000-0000-0000-0000-00000000b001','marie1@exemple.invalid'), ('00000000-0000-0000-0000-00000000c001','assistante@exemple.invalid');
insert into public.profiles (id, prenom, nom, role, statut) values
 ('00000000-0000-0000-0000-0000000000f1','Fondatrice','TEST','fondatrice','actif'), ('00000000-0000-0000-0000-00000000a001','Lina','TESTEUR','partenaire','actif'),
 ('00000000-0000-0000-0000-00000000b001','Marie','DUPONT','cliente','actif'), ('00000000-0000-0000-0000-00000000c001','Ana','ASSIST','assistante','actif');
insert into public.bellaia_organisations values ('00000000-0000-0000-0000-0000000000c1', 'Vil''Dor Pâtisse');
insert into public.bellaia_roles (user_id, role, organisation_id) values
 ('00000000-0000-0000-0000-00000000a001','hote','00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-00000000a001','assistante','00000000-0000-0000-0000-0000000000c1'),
 ('00000000-0000-0000-0000-00000000a001','collaborateur','00000000-0000-0000-0000-0000000000c1');
insert into public.bellaia_permissions (user_id, permission, univers) values ('00000000-0000-0000-0000-00000000a001','food.consulter','FOOD');
