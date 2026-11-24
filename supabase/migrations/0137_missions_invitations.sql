-- ═══════════════════════════════════════════════════════════════════════════════
-- 0137 — Transmission centralisée des missions (réception, avancement, transfert) et invitations sécurisées
-- PRÉPARÉE, NON APPLIQUÉE. Prérequis : 0134, 0135, 0136.
-- Missions : on réutilise bellaia_missions + bellaia_missions_fil (même enregistrement visible dans le pôle
-- et dans l'espace de la personne). La personne destinataire ne modifie pas la mission directement :
-- elle accuse réception et déclare son avancement par fonctions contrôlées (trace dans le fil).
-- Invitations : créées par la fondatrice après ACCEPTATION HUMAINE d'une candidature ; lien à usage unique,
-- expirant (72 h), dont seul le condensé est stocké ; rôles et permissions limités à une liste NON privilégiée.
-- Idempotente. Retour arrière : rollback/0137_missions_invitations_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════════
create extension if not exists pgcrypto;

-- 1. Missions
alter table public.bellaia_missions add column if not exists nature text not null default 'mission';
alter table public.bellaia_missions add column if not exists accuse_reception_le timestamptz;
alter table public.bellaia_missions add column if not exists progression smallint not null default 0;
alter table public.bellaia_missions add column if not exists transmis_par uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bellaia_missions_nature_check') then
    alter table public.bellaia_missions add constraint bellaia_missions_nature_check check (nature in ('mission','tache','activite','dossier','instruction','document','validation','information'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bellaia_missions_progression_check') then
    alter table public.bellaia_missions add constraint bellaia_missions_progression_check check (progression between 0 and 100);
  end if;
end $$;

create or replace function public.mission_accuser_reception(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if public.est_suspendu(auth.uid(), '*') then raise exception 'Compte suspendu'; end if;
  update public.bellaia_missions set accuse_reception_le = coalesce(accuse_reception_le, now()), updated_at = now()
   where id = p_id and assigne_a = auth.uid() and auth.uid() is not null;
  if not found then raise exception 'Mission introuvable ou non attribuée à ce compte'; end if;
  insert into public.bellaia_missions_fil(mission_id, auteur, type, texte) values (p_id, auth.uid(), 'statut', 'Réception confirmée');
end $$;

create or replace function public.mission_avancer(p_id uuid, p_progression integer, p_commentaire text default null) returns void language plpgsql security definer set search_path = public as $$
declare m public.bellaia_missions;
begin
  if public.est_suspendu(auth.uid(), '*') then raise exception 'Compte suspendu'; end if;
  select * into m from public.bellaia_missions where id = p_id and assigne_a = auth.uid() and auth.uid() is not null for update;
  if not found then raise exception 'Mission introuvable ou non attribuée à ce compte'; end if;
  if public.est_suspendu(auth.uid(), m.pole) then raise exception 'Accès à ce pôle suspendu'; end if;
  if m.statut in ('fait','annule') then raise exception 'Mission close'; end if;
  if p_progression < 0 or p_progression > 100 then raise exception 'Avancement entre 0 et 100'; end if;
  update public.bellaia_missions set progression = p_progression,
         accuse_reception_le = coalesce(accuse_reception_le, now()),
         statut = case when p_progression = 100 then 'a_valider' when p_progression > 0 and statut = 'a_faire' then 'en_cours' else statut end,
         updated_at = now()
   where id = p_id;
  insert into public.bellaia_missions_fil(mission_id, auteur, type, texte)
  values (p_id, auth.uid(), 'statut', 'Avancement : ' || p_progression || ' %' || case when p_progression = 100 then ' — à valider' else '' end || coalesce(' — ' || left(p_commentaire, 1000), ''));
end $$;

create or replace function public.mission_transferer(p_id uuid, p_destinataire uuid, p_motif text) returns void language plpgsql security definer set search_path = public as $$
declare m public.bellaia_missions;
begin
  select * into m from public.bellaia_missions where id = p_id for update;
  if not found then raise exception 'Mission introuvable'; end if;
  if not public.a_permission('missions.gerer', m.pole) then raise exception 'Non autorisé'; end if;
  if length(btrim(coalesce(p_motif,''))) < 3 then raise exception 'Motif obligatoire'; end if;
  if p_destinataire is null or public.est_suspendu(p_destinataire, m.pole) then raise exception 'Destinataire suspendu ou inconnu'; end if;
  update public.bellaia_missions set assigne_a = p_destinataire, accuse_reception_le = null, transmis_par = auth.uid(), updated_at = now() where id = p_id;
  insert into public.bellaia_missions_fil(mission_id, auteur, type, texte) values (p_id, auth.uid(), 'statut', 'Mission transférée — motif : ' || left(p_motif, 500));
end $$;

-- Lecture par la personne destinataire : refusée si son compte ou le pôle de la mission est suspendu
drop policy if exists missions_assignee_lecture on public.bellaia_missions;
create policy missions_assignee_lecture on public.bellaia_missions for select using (assigne_a = auth.uid() and not public.est_suspendu(auth.uid(), pole));

-- 2. Invitations sécurisées
create table if not exists public.bellaia_invitations (
  id uuid primary key default gen_random_uuid(),
  candidature_id uuid references public.bellaia_candidatures(id) on delete set null,
  email text not null,
  roles text[] not null default '{}',
  permissions text[] not null default '{}',
  univers text not null default '*',
  jeton_condense text not null unique,
  expire_le timestamptz not null default now() + interval '72 hours',
  utilisee_le timestamptz, utilisee_par uuid,
  annulee_le timestamptz,
  conditions_version text,
  conditions_acceptees_le timestamptz,
  cree_par uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint invitations_roles_non_privilegies check (roles <@ array['assistante','prestataire','fournisseur','hote','collaborateur','autre']::text[]),
  constraint invitations_permissions_non_privilegiees check (permissions <@ array['food.consulter','food.commandes','food.recettes.proposer','ia.utiliser','notifications.commandes']::text[])
);
alter table public.bellaia_invitations enable row level security;
drop policy if exists invit_fondatrice on public.bellaia_invitations;
create policy invit_fondatrice on public.bellaia_invitations for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
revoke all on public.bellaia_invitations from anon;

-- Création : fondatrice uniquement, candidature ACCEPTÉE par une personne ; renvoie le jeton en clair une seule fois
create or replace function public.creer_invitation(p_candidature uuid, p_roles text[], p_permissions text[], p_univers text default '*') returns text language plpgsql security definer set search_path = public, extensions as $$
declare c public.bellaia_candidatures; j text;
begin
  if not public.is_fondatrice() then raise exception 'Réservé à la fondatrice'; end if;
  select * into c from public.bellaia_candidatures where id = p_candidature;
  if not found or c.statut <> 'accepte' or c.decision_par is null then raise exception 'Candidature non acceptée par une personne habilitée'; end if;
  j := encode(gen_random_bytes(32), 'hex');
  insert into public.bellaia_invitations(candidature_id, email, roles, permissions, univers, jeton_condense)
  values (p_candidature, lower(c.email), coalesce(p_roles, '{}'), coalesce(p_permissions, '{}'), coalesce(p_univers, '*'), encode(digest(j, 'sha256'), 'hex'));
  return j;
end $$;

-- Acceptation : par la personne invitée, connectée avec la même adresse ; usage unique ; conditions enregistrées
create or replace function public.accepter_invitation(p_jeton text, p_conditions_version text) returns void language plpgsql security definer set search_path = public, extensions as $$
declare i public.bellaia_invitations; mel text; r text; p text;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if length(btrim(coalesce(p_conditions_version,''))) = 0 then raise exception 'Acceptation des conditions requise'; end if;
  select * into i from public.bellaia_invitations where jeton_condense = encode(digest(coalesce(p_jeton,''), 'sha256'), 'hex') for update;
  if not found or i.utilisee_le is not null or i.annulee_le is not null or i.expire_le <= now() then raise exception 'Invitation invalide, déjà utilisée ou expirée'; end if;
  select lower(email) into mel from auth.users where id = auth.uid();
  if mel is distinct from i.email then raise exception 'Cette invitation est destinée à une autre adresse'; end if;
  foreach r in array i.roles loop
    -- « on conflict do nothing » : compatible avec l'index d'unicité des fonctions de 0145 (une fonction déjà détenue n'est pas recréée).
    insert into public.bellaia_roles(user_id, role, statut, libelle) values (auth.uid(), r, 'actif', 'Invitation ' || i.id) on conflict do nothing;
  end loop;
  foreach p in array i.permissions loop
    insert into public.bellaia_permissions(user_id, permission, univers, accorde_par) values (auth.uid(), p, i.univers, i.cree_par) on conflict do nothing;
  end loop;
  update public.bellaia_invitations set utilisee_le = now(), utilisee_par = auth.uid(), conditions_version = p_conditions_version, conditions_acceptees_le = now() where id = i.id;
  perform set_config('bellaia.liaison_invitation', coalesce(i.candidature_id::text, ''), true);
  update public.bellaia_candidatures set profile_id = coalesce(profile_id, auth.uid()) where id = i.candidature_id;
  perform set_config('bellaia.liaison_invitation', '', true);
end $$;
revoke execute on function public.creer_invitation(uuid, text[], text[], text), public.accepter_invitation(text, text) from anon;
