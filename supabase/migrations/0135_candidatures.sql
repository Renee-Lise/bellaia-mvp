-- ═══════════════════════════════════════════════════════════════════════════════
-- 0135 — Candidatures et demandes d'accès (hôte, assistant·e, modèle, espace Membres, autre)
-- PRÉPARÉE, NON APPLIQUÉE. Prérequis : 0134 appliquée ; sauvegarde vérifiée.
-- Principes :
--  • données minimales ; aucune donnée sensible (date de naissance, genre, origine, religion, santé,
--    orientation, photo, pièce d'identité…) acceptée, même dans le champ libre « donnees » ;
--  • un dépôt n'ouvre AUCUN accès ; statut initial forcé à « nouvelle » ;
--  • l'agent (règles ou IA) ne peut que PROPOSER un statut, jamais « accepte » ni « refuse » ;
--  • acceptation et refus : uniquement par une personne connectée habilitée (fondatrice ou
--    permission « candidatures.decider ») ; motif obligatoire pour un refus ;
--  • historique non modifiable de chaque changement ; conservation limitée (6 mois par défaut).
-- La table bsh_hotes_candidatures (0 ligne au 23/11) est conservée telle quelle (aucune suppression).
-- Idempotente. Retour arrière : rollback/0135_candidatures_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════════
create extension if not exists pgcrypto;

create table if not exists public.bellaia_candidatures (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('hote','assistant','modele','membres','autre')),
  profile_id uuid references auth.users(id) on delete set null,
  nom_affiche text not null check (length(btrim(nom_affiche)) between 1 and 120),
  email text not null check (length(email) <= 200 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  telephone text check (length(telephone) <= 30),
  ville text check (length(ville) <= 80),
  poles text[] not null default '{}',
  disponibilites text check (length(disponibilites) <= 1000),
  experience text check (length(experience) <= 3000),
  motivation text check (length(motivation) <= 3000),
  langues text[] not null default '{}',
  donnees jsonb not null default '{}'::jsonb,
  majeur_declare boolean not null default false,
  conditions_acceptees_le timestamptz,
  rgpd_accepte_le timestamptz,
  statut text not null default 'nouvelle',
  proposition jsonb,
  responsable uuid references auth.users(id) on delete set null,
  decision_par uuid references auth.users(id) on delete set null,
  decision_le timestamptz,
  decision_motif text check (length(decision_motif) <= 1000),
  conserver_jusqu_au date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidatures_statut_check check (statut in ('nouvelle','incomplet','a_analyser','a_contacter','entretien','preselectionne','accepte','refuse','en_attente','suspendu','archive')),
  constraint candidatures_donnees_minimales check (
    jsonb_typeof(donnees) = 'object' and length(donnees::text) <= 8000
    and not (donnees ?| array['date_naissance','age','genre','sexe','origine','nationalite','religion','sante','handicap','orientation','situation_familiale','photo','piece_identite','numero_securite_sociale','mensurations','poids'])),
  constraint candidatures_proposition_non_decisionnelle check (
    proposition is null or (
      jsonb_typeof(proposition) = 'object'
      and coalesce(proposition->>'statut_propose','') in ('incomplet','a_analyser','a_contacter','entretien','preselectionne','en_attente')
      and length(coalesce(proposition->>'explication','')) >= 10)),
  constraint candidatures_refus_motive check (statut <> 'refuse' or length(coalesce(decision_motif,'')) >= 3)
);
create index if not exists candidatures_statut_idx on public.bellaia_candidatures(statut, type, created_at desc);
create index if not exists candidatures_profil_idx on public.bellaia_candidatures(profile_id);

-- Historique non modifiable (aucune politique d'écriture : alimenté par déclencheur uniquement)
create table if not exists public.bellaia_candidatures_historique (
  id bigint generated always as identity primary key,
  candidature_id uuid not null references public.bellaia_candidatures(id) on delete cascade,
  action text not null,
  avant jsonb, apres jsonb,
  par uuid,
  motif text,
  le timestamptz not null default now()
);

-- Documents fournis (stockage privé « equipe-prive », dossier candidatures/<id>/…), reliés au dossier
create table if not exists public.bellaia_candidatures_documents (
  id uuid primary key default gen_random_uuid(),
  candidature_id uuid not null references public.bellaia_candidatures(id) on delete cascade,
  chemin text not null check (chemin ~ '^candidatures/[0-9a-f-]{36}/[^/]+$' and length(chemin) <= 300),
  type text not null default 'autre' check (type in ('cv','portfolio','attestation','autre')),
  taille integer check (taille between 1 and 15728640),
  ajoute_par uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table if not exists public.bellaia_documents_consultations (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.bellaia_candidatures_documents(id) on delete cascade,
  par uuid not null, le timestamptz not null default now()
);

-- Habilitations
create or replace function public.candidatures_gestion() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_fondatrice() or public.a_permission('candidatures.gerer') or public.a_permission('candidatures.decider') $$;
create or replace function public.candidatures_decision() returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (public.is_fondatrice() or public.a_permission('candidatures.decider')) $$;

-- Dépôt : statut forcé, consentements exigés, rattachement au compte connecté éventuel
create or replace function public.candidature_depot() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.candidatures_gestion() then
    new.statut := 'nouvelle'; new.proposition := null; new.responsable := null;
    new.decision_par := null; new.decision_le := null; new.decision_motif := null;
    new.profile_id := auth.uid();
  end if;
  if new.rgpd_accepte_le is null then raise exception 'Information sur les données personnelles non acceptée'; end if;
  if new.type in ('hote','modele','membres') and not new.majeur_declare then raise exception 'Déclaration de majorité requise pour cette demande'; end if;
  if new.type in ('hote','assistant','modele') and new.conditions_acceptees_le is null then raise exception 'Conditions de collaboration non acceptées'; end if;
  new.conserver_jusqu_au := coalesce(new.conserver_jusqu_au, (now() + interval '6 months')::date);
  new.created_at := now(); new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_candidature_depot on public.bellaia_candidatures;
create trigger trg_candidature_depot before insert on public.bellaia_candidatures for each row execute function public.candidature_depot();

-- Modifications : la candidate complète son dossier ; la gestion suit ; seule une personne habilitée décide
create or replace function public.candidature_controle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id; new.created_at := old.created_at; new.type := old.type; new.updated_at := now();
  if not public.candidatures_gestion() then
    -- rattachement du compte lors de l'acceptation d'une invitation (seul champ modifié ; drapeau posé par accepter_invitation)
    if current_setting('bellaia.liaison_invitation', true) = old.id::text then
      new := old; new.profile_id := coalesce(old.profile_id, auth.uid()); new.updated_at := now(); return new;
    end if;
    -- candidate (ou toute autre personne passée par la RLS) : contenu seulement, tant que le dossier est ouvert
    if old.statut not in ('nouvelle','incomplet') then raise exception 'Dossier en cours d''instruction : modification impossible'; end if;
    new.profile_id := old.profile_id; new.proposition := old.proposition; new.responsable := old.responsable;
    new.decision_par := old.decision_par; new.decision_le := old.decision_le; new.decision_motif := old.decision_motif;
    new.conserver_jusqu_au := old.conserver_jusqu_au;
    new.statut := case when old.statut = 'incomplet' then 'a_analyser' else old.statut end;  -- dossier complété → réexamen
    return new;
  end if;
  -- gestion : la décision finale exige une personne habilitée, connectée (jamais un traitement automatique)
  if new.statut in ('accepte','refuse') and new.statut is distinct from old.statut then
    if not public.candidatures_decision() then raise exception 'Décision réservée à une personne habilitée'; end if;
    new.decision_par := auth.uid(); new.decision_le := now();
  else
    new.decision_par := old.decision_par; new.decision_le := old.decision_le;
    if new.statut is not distinct from old.statut then new.decision_motif := coalesce(new.decision_motif, old.decision_motif); end if;
  end if;
  if new.statut = 'refuse' and new.statut is distinct from old.statut then
    new.conserver_jusqu_au := (now() + interval '6 months')::date;
  end if;
  return new;
end $$;
drop trigger if exists trg_candidature_controle on public.bellaia_candidatures;
create trigger trg_candidature_controle before update on public.bellaia_candidatures for each row execute function public.candidature_controle();

create or replace function public.candidature_journal() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.bellaia_candidatures_historique(candidature_id, action, avant, apres, par, motif)
  values (coalesce(new.id, old.id), lower(tg_op) || case when tg_op = 'UPDATE' and new.statut is distinct from old.statut then ':' || old.statut || '→' || new.statut else '' end,
          case when tg_op <> 'INSERT' then to_jsonb(old) - 'donnees' end, case when tg_op <> 'DELETE' then to_jsonb(new) - 'donnees' end,
          auth.uid(), case when tg_op = 'UPDATE' then new.decision_motif end);
  return coalesce(new, old);
end $$;
drop trigger if exists trg_candidature_journal on public.bellaia_candidatures;
create trigger trg_candidature_journal after insert or update on public.bellaia_candidatures for each row execute function public.candidature_journal();

-- Proposition de l'agent (règles ou IA) : jamais décisionnelle (contrôlée aussi par contrainte)
create or replace function public.candidature_proposer(p_id uuid, p_proposition jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.candidatures_gestion() then raise exception 'Non autorisé'; end if;
  update public.bellaia_candidatures set proposition = p_proposition || jsonb_build_object('le', now()) where id = p_id;
end $$;

-- Consultation d'un document : journalisée, réservée à la gestion
create or replace function public.document_candidature_consulter(p_id uuid) returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.candidatures_gestion() then raise exception 'Non autorisé'; end if;
  select chemin into c from public.bellaia_candidatures_documents where id = p_id;
  if c is null then raise exception 'Document introuvable'; end if;
  insert into public.bellaia_documents_consultations(document_id, par) values (p_id, auth.uid());
  return c;
end $$;

-- Purge RGPD des dossiers échus (refusés, archivés, ou jamais traités) : fondatrice uniquement
create or replace function public.candidatures_purger() returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_fondatrice() then raise exception 'Réservé à la fondatrice'; end if;
  delete from public.bellaia_candidatures where conserver_jusqu_au < current_date and statut in ('refuse','archive','nouvelle','incomplet');
  get diagnostics n = row_count; return n;
end $$;

-- Règles d'accès
alter table public.bellaia_candidatures enable row level security;
alter table public.bellaia_candidatures_historique enable row level security;
alter table public.bellaia_candidatures_documents enable row level security;
alter table public.bellaia_documents_consultations enable row level security;
drop policy if exists cand_depot on public.bellaia_candidatures;
create policy cand_depot on public.bellaia_candidatures for insert to anon, authenticated with check (true);
drop policy if exists cand_lecture on public.bellaia_candidatures;
create policy cand_lecture on public.bellaia_candidatures for select to authenticated using (public.candidatures_gestion() or profile_id = auth.uid());
drop policy if exists cand_maj on public.bellaia_candidatures;
create policy cand_maj on public.bellaia_candidatures for update to authenticated using (public.candidatures_gestion() or profile_id = auth.uid()) with check (public.candidatures_gestion() or profile_id = auth.uid());
drop policy if exists cand_suppression on public.bellaia_candidatures;
create policy cand_suppression on public.bellaia_candidatures for delete to authenticated using (public.is_fondatrice());
drop policy if exists cand_hist_lecture on public.bellaia_candidatures_historique;
create policy cand_hist_lecture on public.bellaia_candidatures_historique for select to authenticated using (public.candidatures_gestion());
drop policy if exists cand_docs_lecture on public.bellaia_candidatures_documents;
create policy cand_docs_lecture on public.bellaia_candidatures_documents for select to authenticated using (public.candidatures_gestion() or exists (select 1 from public.bellaia_candidatures c where c.id = candidature_id and c.profile_id = auth.uid()));
drop policy if exists cand_docs_depot on public.bellaia_candidatures_documents;
create policy cand_docs_depot on public.bellaia_candidatures_documents for insert to authenticated with check (
  chemin like 'candidatures/' || candidature_id::text || '/%'
  and (public.candidatures_gestion() or exists (select 1 from public.bellaia_candidatures c where c.id = candidature_id and c.profile_id = auth.uid() and c.statut in ('nouvelle','incomplet'))));
drop policy if exists cand_docs_suppression on public.bellaia_candidatures_documents;
create policy cand_docs_suppression on public.bellaia_candidatures_documents for delete to authenticated using (public.is_fondatrice());
drop policy if exists cand_consult_lecture on public.bellaia_documents_consultations;
create policy cand_consult_lecture on public.bellaia_documents_consultations for select to authenticated using (public.is_fondatrice());

revoke all on public.bellaia_candidatures_historique, public.bellaia_documents_consultations from anon;
revoke all on public.bellaia_candidatures_documents from anon;
grant insert on public.bellaia_candidatures to anon;
grant select, insert, update, delete on public.bellaia_candidatures, public.bellaia_candidatures_documents to authenticated;
grant select on public.bellaia_candidatures_historique, public.bellaia_documents_consultations to authenticated;
revoke execute on function public.candidature_proposer(uuid, jsonb), public.document_candidature_consulter(uuid), public.candidatures_purger() from anon;
