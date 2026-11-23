-- ═══════════════════════════════════════════════════════════════════════════════
-- 0136 — Contrôle central des accès : suspension (par pôle ou globale), révocation tracée,
--        désactivation / réactivation de compte, révocation des sessions — EFFECTIFS CÔTÉ SERVEUR.
-- PRÉPARÉE, NON APPLIQUÉE. Prérequis : 0134 appliquée (verrou des rôles et statuts des profils).
-- • Suspension : interruption temporaire des droits d'un pôle (ou de tous) ; réversible ; motif obligatoire.
-- • Révocation : un retrait de permission ou de rôle ne SUPPRIME plus la ligne : elle passe « revoquee »
--   (date, auteur, motif) ; une nouvelle attribution crée une nouvelle ligne (historique conservé).
-- • Désactivation : profiles.statut = 'inactif' → plus aucun droit, sessions fermées, données conservées.
-- • Suppression : non couverte ici (procédure RGPD distincte, accord de la fondatrice).
-- Les fonctions de droits (a_permission, est_staff_bellaia) tiennent compte de tout cela : le blocage
-- s'applique à la requête suivante, même si un jeton de connexion est encore valide.
-- Personne ne peut agir sur ses propres accès ; seule la fondatrice agit sur un accès global ;
-- un responsable de pôle (permission « acces.suspendre » sur son pôle) ne suspend que dans son pôle.
-- Idempotente. Retour arrière : rollback/0136_acces_suspensions_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Révocation tracée des permissions et des rôles
alter table public.bellaia_permissions add column if not exists statut text not null default 'active';
alter table public.bellaia_permissions add column if not exists revoque_le timestamptz;
alter table public.bellaia_permissions add column if not exists revoque_par uuid;
alter table public.bellaia_permissions add column if not exists motif_revocation text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bellaia_permissions_statut_check') then
    alter table public.bellaia_permissions add constraint bellaia_permissions_statut_check check (statut in ('active','revoquee'));
  end if;
end $$;
alter table public.bellaia_permissions drop constraint if exists bellaia_permissions_user_id_permission_univers_key;
alter table public.bellaia_permissions drop constraint if exists bellaia_permissions_user_id_permission_univ;
create unique index if not exists bellaia_permissions_active_unique on public.bellaia_permissions(user_id, permission, univers) where statut = 'active';
alter table public.bellaia_roles add column if not exists revoque_le timestamptz;
alter table public.bellaia_roles add column if not exists revoque_par uuid;
alter table public.bellaia_roles add column if not exists motif_revocation text;

-- Un DELETE envoyé par l'application devient une révocation (la ligne reste dans l'historique).
-- Les suppressions en cascade (compte supprimé) restent possibles.
create or replace function public.droits_revoquer_au_lieu_de_supprimer() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then return old; end if;
  if tg_table_name = 'bellaia_permissions' then
    update public.bellaia_permissions set statut = 'revoquee', revoque_le = now(), revoque_par = auth.uid(),
      motif_revocation = coalesce(nullif(current_setting('bellaia.motif', true), ''), 'Retrait de la permission') where id = old.id and statut = 'active';
  else
    update public.bellaia_roles set statut = 'revoque', revoque_le = now(), revoque_par = auth.uid(),
      motif_revocation = coalesce(nullif(current_setting('bellaia.motif', true), ''), 'Retrait du rôle') where id = old.id and statut <> 'revoque';
  end if;
  return null;
end $$;
drop trigger if exists trg_perms_revocation on public.bellaia_permissions;
create trigger trg_perms_revocation before delete on public.bellaia_permissions for each row execute function public.droits_revoquer_au_lieu_de_supprimer();
drop trigger if exists trg_roles_revocation on public.bellaia_roles;
create trigger trg_roles_revocation before delete on public.bellaia_roles for each row execute function public.droits_revoquer_au_lieu_de_supprimer();

-- Une révocation est définitive pour la ligne (ré-attribuer = nouvelle ligne) ; personne ne touche à ses propres droits
-- (fonction « invoker » : current_user vaut « authenticated » pour un appel direct de l'application, et le
--  propriétaire pour un appel passant par une fonction contrôlée comme accepter_invitation)
create or replace function public.droits_controle_modification() returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user in ('authenticated','anon') and auth.uid() is not null and new.user_id = auth.uid() and not public.is_fondatrice() then
    raise exception 'Modification de ses propres droits interdite'; end if;
  if tg_op = 'UPDATE' then
    if tg_table_name = 'bellaia_permissions' and old.statut = 'revoquee' and new.statut <> 'revoquee' then raise exception 'Permission révoquée : créer une nouvelle attribution'; end if;
    if tg_table_name = 'bellaia_roles' and old.statut = 'revoque' and new.statut <> 'revoque' then raise exception 'Rôle révoqué : créer une nouvelle attribution'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_perms_controle on public.bellaia_permissions;
create trigger trg_perms_controle before insert or update on public.bellaia_permissions for each row execute function public.droits_controle_modification();
drop trigger if exists trg_roles_controle on public.bellaia_roles;
create trigger trg_roles_controle before insert or update on public.bellaia_roles for each row execute function public.droits_controle_modification();

-- 2. Suspensions
create table if not exists public.bellaia_suspensions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  univers text not null default '*',
  motif text not null check (length(btrim(motif)) >= 3),
  debut timestamptz not null default now(),
  fin timestamptz,
  par uuid default auth.uid(),
  levee_le timestamptz, levee_par uuid, levee_motif text,
  created_at timestamptz not null default now(),
  constraint suspension_periode check (fin is null or fin > debut),
  constraint suspension_levee_motivee check (levee_le is null or length(btrim(coalesce(levee_motif,''))) >= 3)
);
create index if not exists suspensions_actives_idx on public.bellaia_suspensions(user_id) where levee_le is null;

create or replace function public.est_suspendu(u uuid, pole text default '*') returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = u and p.role <> 'fondatrice' and coalesce(p.statut,'actif') in ('suspendu','inactif'))
      or exists (select 1 from public.bellaia_suspensions s where s.user_id = u and s.levee_le is null and s.debut <= now() and (s.fin is null or s.fin > now())
                   and (s.univers = '*' or s.univers = pole)  -- pôle '*' demandé : seules les suspensions globales comptent
                   and not exists (select 1 from public.profiles f where f.id = u and f.role = 'fondatrice')) $$;

create or replace function public.suspension_controle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- administration de la base
  if new.user_id = auth.uid() then raise exception 'Action sur ses propres accès interdite'; end if;
  if exists (select 1 from public.profiles where id = new.user_id and role = 'fondatrice') then raise exception 'Le compte de la fondatrice ne peut pas être suspendu depuis l''application'; end if;
  if not public.is_fondatrice() then
    if new.univers = '*' then raise exception 'Suspension globale réservée à la fondatrice'; end if;
    if not exists (select 1 from public.bellaia_permissions bp where bp.user_id = auth.uid() and bp.permission = 'acces.suspendre' and bp.univers = new.univers
                   and bp.statut = 'active' and (bp.expire_le is null or bp.expire_le > now())) or public.est_suspendu(auth.uid(), new.univers) then
      raise exception 'Non habilité à suspendre dans ce pôle'; end if;
  end if;
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id; new.univers := old.univers; new.debut := old.debut; new.par := old.par; new.created_at := old.created_at; new.motif := old.motif;
    if old.levee_le is not null then raise exception 'Suspension déjà levée'; end if;
    if new.levee_le is not null then new.levee_par := auth.uid(); new.levee_le := now(); end if;
  else
    new.par := auth.uid(); new.levee_le := null; new.levee_par := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_suspension_controle on public.bellaia_suspensions;
create trigger trg_suspension_controle before insert or update on public.bellaia_suspensions for each row execute function public.suspension_controle();
drop trigger if exists trg_journal_suspensions on public.bellaia_suspensions;
create trigger trg_journal_suspensions after insert or update or delete on public.bellaia_suspensions for each row execute function public.journaliser_droits();

alter table public.bellaia_suspensions enable row level security;
drop policy if exists susp_fondatrice on public.bellaia_suspensions;
create policy susp_fondatrice on public.bellaia_suspensions for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
drop policy if exists susp_responsable on public.bellaia_suspensions;
create policy susp_responsable on public.bellaia_suspensions for all to authenticated
  using (univers <> '*' and public.a_permission('acces.suspendre', univers)) with check (univers <> '*' and public.a_permission('acces.suspendre', univers));
drop policy if exists susp_moi on public.bellaia_suspensions;
create policy susp_moi on public.bellaia_suspensions for select to authenticated using (user_id = auth.uid());
drop policy if exists susp_pas_de_suppression on public.bellaia_suspensions;
create policy susp_pas_de_suppression on public.bellaia_suspensions as restrictive for delete to authenticated using (false);
grant select, insert, update on public.bellaia_suspensions to authenticated;

-- 3. Fonctions de droits : permissions actives uniquement, comptes et pôles suspendus exclus
create or replace function public.a_permission(p text, u text default '*') returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice')
    or (not public.est_suspendu(auth.uid(), u)
        and exists (select 1 from public.bellaia_permissions bp
                    where bp.user_id = auth.uid() and bp.permission in (p, 'acces_complet') and bp.statut = 'active'
                      and (bp.univers = '*' or bp.univers = u) and (bp.expire_le is null or bp.expire_le > now())
                      and not public.est_suspendu(auth.uid(), bp.univers)))) $$;
create or replace function public.est_staff_bellaia() returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'fondatrice')
    or (not public.est_suspendu(auth.uid(), '*')
        and exists (select 1 from public.bellaia_permissions where user_id = auth.uid() and permission = 'acces_complet' and statut = 'active' and (expire_le is null or expire_le > now())))) $$;

-- 4. Sessions et comptes (fondatrice uniquement, motif obligatoire, journalisé)
create or replace function public.revoquer_sessions(u uuid) returns integer language plpgsql security definer set search_path = public, auth as $$
declare n integer := 0;
begin
  if not public.is_fondatrice() then raise exception 'Réservé à la fondatrice'; end if;
  if u = auth.uid() then raise exception 'Action sur ses propres accès interdite'; end if;
  delete from auth.sessions where user_id = u; get diagnostics n = row_count;
  update auth.refresh_tokens set revoked = true where user_id = u::text and not coalesce(revoked, false);
  insert into public.bellaia_journal(action, cible, details) values ('sessions.revocation', u::text, jsonb_build_object('sessions', n, 'par', auth.uid()));
  return n;
end $$;
create or replace function public.changer_etat_compte(u uuid, etat text, motif text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_fondatrice() then raise exception 'Réservé à la fondatrice'; end if;
  if u = auth.uid() then raise exception 'Action sur ses propres accès interdite'; end if;
  if etat not in ('actif','suspendu','inactif') then raise exception 'État inconnu'; end if;
  if length(btrim(coalesce(motif,''))) < 3 then raise exception 'Motif obligatoire'; end if;
  if exists (select 1 from public.profiles where id = u and role = 'fondatrice') then raise exception 'Compte de la fondatrice non modifiable ici'; end if;
  update public.profiles set statut = etat, updated_at = now() where id = u;
  if not found then raise exception 'Compte introuvable'; end if;
  insert into public.bellaia_journal(action, cible, details) values ('compte.' || etat, u::text, jsonb_build_object('motif', motif, 'par', auth.uid()));
  if etat <> 'actif' then perform public.revoquer_sessions(u); end if;
end $$;
revoke execute on function public.revoquer_sessions(uuid), public.changer_etat_compte(uuid, text, text) from anon;
