-- Retour arrière de 0136 : fonctions de droits d'origine, suppression des suspensions et du mécanisme de révocation.
-- Les permissions révoquées sont copiées dans bellaia_journal avant d'être retirées (la contrainte d'unicité d'origine l'exige).
create or replace function public.a_permission(p text, u text default '*') returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice')
    or exists (select 1 from public.bellaia_permissions bp
               where bp.user_id = auth.uid() and bp.permission in (p, 'acces_complet')
                 and (bp.univers = '*' or bp.univers = u) and (bp.expire_le is null or bp.expire_le > now()))
  ); $$;
create or replace function public.est_staff_bellaia() returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice')
    or exists (select 1 from public.bellaia_permissions where user_id = auth.uid() and permission = 'acces_complet' and (expire_le is null or expire_le > now()))); $$;
drop function if exists public.changer_etat_compte(uuid, text, text);
drop function if exists public.revoquer_sessions(uuid);
drop table if exists public.bellaia_suspensions;
drop function if exists public.suspension_controle();
drop function if exists public.est_suspendu(uuid, text);
drop trigger if exists trg_perms_revocation on public.bellaia_permissions;
drop trigger if exists trg_roles_revocation on public.bellaia_roles;
drop trigger if exists trg_perms_controle on public.bellaia_permissions;
drop trigger if exists trg_roles_controle on public.bellaia_roles;
drop function if exists public.droits_revoquer_au_lieu_de_supprimer();
drop function if exists public.droits_controle_modification();
insert into public.bellaia_journal(action, cible, details)
  select 'rollback_0136.permission_revoquee', user_id::text, to_jsonb(bp) from public.bellaia_permissions bp where statut = 'revoquee';
delete from public.bellaia_permissions where statut = 'revoquee';
drop index if exists public.bellaia_permissions_active_unique;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.bellaia_permissions'::regclass and contype = 'u') then
    alter table public.bellaia_permissions add constraint bellaia_permissions_user_id_permission_univers_key unique (user_id, permission, univers);
  end if;
end $$;
alter table public.bellaia_permissions drop constraint if exists bellaia_permissions_statut_check;
alter table public.bellaia_permissions drop column if exists motif_revocation, drop column if exists revoque_par, drop column if exists revoque_le, drop column if exists statut;
alter table public.bellaia_roles drop column if exists motif_revocation, drop column if exists revoque_par, drop column if exists revoque_le;
