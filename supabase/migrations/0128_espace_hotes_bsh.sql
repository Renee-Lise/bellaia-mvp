-- 0128_espace_hotes_bsh.sql — Espace hôte / hôtesse Bella'Secret Home
-- Ajouts uniquement (aucune suppression, aucune donnée modifiée).
-- Garde-fous en base :
--  • Une mission RÉELLE (simulation = false) ne peut être confirmée que si
--    l'hôte est autorisé·e (autorise_missions) par la fondatrice.
--  • Une rémunération ne peut passer « validée » ou « payée » que si la
--    mission est réelle et l'hôte autorisé·e à être rémunéré·e, avec un
--    statut juridique renseigné et les conditions validées. Aucun paiement
--    n'est effectué par l'application (suivi uniquement).
--  • Les hôtes ne voient que leurs propres données ; leurs actions passent
--    par des fonctions contrôlées.

-- ── Copie de sécurité des profils hôtes existants (accès serveur uniquement)
create table if not exists public.zz_sauvegarde_0128_bsh_hotes as select now() as sauvegarde_le, h.* from public.bsh_hotes h;
alter table public.zz_sauvegarde_0128_bsh_hotes enable row level security;
revoke all on public.zz_sauvegarde_0128_bsh_hotes from anon, authenticated;

-- ── Profil hôte : champs complémentaires
alter table public.bsh_hotes add column if not exists pseudo_scene text;
alter table public.bsh_hotes add column if not exists ville text;
alter table public.bsh_hotes add column if not exists langues text[] not null default '{}';
alter table public.bsh_hotes add column if not exists competences text[] not null default '{}';
alter table public.bsh_hotes add column if not exists presentation text;
alter table public.bsh_hotes add column if not exists majeur_confirme boolean not null default false;
alter table public.bsh_hotes add column if not exists identite_verifiee boolean not null default false;
alter table public.bsh_hotes add column if not exists statut_juridique text check (statut_juridique in ('auto_entrepreneur', 'salarie', 'benevole', 'a_definir'));
alter table public.bsh_hotes add column if not exists conditions_validees boolean not null default false;
alter table public.bsh_hotes add column if not exists charte_signee_le timestamptz;
alter table public.bsh_hotes add column if not exists autorise_missions boolean not null default false;
alter table public.bsh_hotes add column if not exists autorise_remuneration boolean not null default false;
alter table public.bsh_hotes add column if not exists permissions jsonb not null default '{"voir_invites": false, "pointer_invites": false, "voir_documents": true, "messagerie": true}'::jsonb;

-- ── Missions : champs complémentaires + statuts de réponse
alter table public.bsh_missions add column if not exists role_mission text;
alter table public.bsh_missions add column if not exists heure_debut time;
alter table public.bsh_missions add column if not exists heure_fin time;
alter table public.bsh_missions add column if not exists consignes text;
alter table public.bsh_missions add column if not exists simulation boolean not null default true;
alter table public.bsh_missions add column if not exists reponse_hote text;
alter table public.bsh_missions add column if not exists reponse_le timestamptz;
alter table public.bsh_missions drop constraint if exists bsh_missions_statut_check;
alter table public.bsh_missions add constraint bsh_missions_statut_check check (statut in ('proposee', 'acceptee', 'refusee', 'confirmee', 'terminee', 'annulee'));

create table if not exists public.bsh_hotes_candidatures (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid default auth.uid(),
  prenom text not null, pseudo text, ville text, telephone text, email text,
  motivation text, experience text, disponibilites text, langues text[] not null default '{}',
  majeur_confirme boolean not null default false, charte_acceptee boolean not null default false,
  statut text not null default 'recue' check (statut in ('recue', 'entretien', 'acceptee', 'refusee')),
  note_interne text, decide_par uuid, decision_le timestamptz, hote_id uuid references public.bsh_hotes(id),
  created_at timestamptz not null default now()
);
create table if not exists public.bsh_hotes_disponibilites (
  id uuid primary key default gen_random_uuid(),
  hote_id uuid not null references public.bsh_hotes(id) on delete cascade,
  jour date not null, debut time, fin time,
  type text not null default 'disponible' check (type in ('disponible', 'indisponible')),
  note text, created_at timestamptz not null default now()
);
create table if not exists public.bsh_missions_presences (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.bsh_missions(id) on delete cascade,
  hote_id uuid not null references public.bsh_hotes(id) on delete cascade,
  arrivee timestamptz, depart timestamptz,
  statut text not null default 'prevu' check (statut in ('prevu', 'present', 'retard', 'absent')),
  valide_par uuid, valide_le timestamptz, note text,
  unique (mission_id, hote_id)
);
create table if not exists public.bsh_interventions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references public.bsh_missions(id) on delete set null,
  hote_id uuid references public.bsh_hotes(id) on delete set null,
  auteur uuid default auth.uid(),
  type text not null default 'compte_rendu' check (type in ('compte_rendu', 'incident', 'demande', 'note')),
  gravite text check (gravite in ('faible', 'moyenne', 'haute')),
  contenu text not null, traite boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.bsh_hotes_documents (
  id uuid primary key default gen_random_uuid(),
  hote_id uuid not null references public.bsh_hotes(id) on delete cascade,
  type text not null check (type in ('charte', 'contrat', 'confidentialite', 'attestation', 'identite', 'statut', 'autre')),
  titre text not null, storage_path text,
  statut text not null default 'a_fournir' check (statut in ('a_fournir', 'a_signer', 'recu', 'signe', 'valide', 'expire')),
  echeance date, signe_le timestamptz, visible_hote boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.bsh_remunerations (
  id uuid primary key default gen_random_uuid(),
  hote_id uuid not null references public.bsh_hotes(id),
  mission_id uuid references public.bsh_missions(id),
  libelle text not null, montant numeric(10,2) not null check (montant >= 0),
  statut text not null default 'prevue' check (statut in ('prevue', 'validee', 'payee', 'annulee')),
  simulation boolean not null default true,
  valide_par uuid, valide_le timestamptz, paye_le date, mode text, note text,
  created_at timestamptz not null default now()
);
create table if not exists public.bsh_hotes_messages (
  id uuid primary key default gen_random_uuid(),
  hote_id uuid not null references public.bsh_hotes(id) on delete cascade,
  de_fondatrice boolean not null default false,
  auteur uuid default auth.uid(),
  contenu text not null check (length(contenu) between 1 and 4000),
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Identifiant hôte de la personne connectée
create or replace function public.bsh_mon_hote() returns uuid language sql stable security definer set search_path = public as $$
  select id from public.bsh_hotes where profile_id = auth.uid() and statut = 'active' limit 1;
$$;

-- ── RLS
do $$ declare t text; begin
  foreach t in array array['bsh_hotes_candidatures','bsh_hotes_disponibilites','bsh_missions_presences','bsh_interventions','bsh_hotes_documents','bsh_remunerations','bsh_hotes_messages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_fondatrice') then
      execute format('create policy %I on public.%I for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice())', t || '_fondatrice', t);
    end if;
  end loop;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'cand_propre') then
    create policy cand_propre on public.bsh_hotes_candidatures for select to authenticated using (profile_id = auth.uid());
    create policy cand_depot on public.bsh_hotes_candidatures for insert to authenticated with check (profile_id = auth.uid() and statut = 'recue' and note_interne is null and decide_par is null and hote_id is null);
    create policy dispo_propres on public.bsh_hotes_disponibilites for all to authenticated using (hote_id = public.bsh_mon_hote()) with check (hote_id = public.bsh_mon_hote());
    create policy presences_propres on public.bsh_missions_presences for select to authenticated using (hote_id = public.bsh_mon_hote());
    create policy interv_propres on public.bsh_interventions for select to authenticated using (hote_id = public.bsh_mon_hote());
    create policy interv_depot on public.bsh_interventions for insert to authenticated with check (hote_id = public.bsh_mon_hote() and auteur = auth.uid() and traite = false
      and (mission_id is null or mission_id in (select id from public.bsh_missions where hote_id = public.bsh_mon_hote())));
    create policy docs_propres on public.bsh_hotes_documents for select to authenticated using (hote_id = public.bsh_mon_hote() and visible_hote);
    create policy remu_propres on public.bsh_remunerations for select to authenticated using (hote_id = public.bsh_mon_hote());
    create policy msg_propres on public.bsh_hotes_messages for select to authenticated using (hote_id = public.bsh_mon_hote());
    create policy msg_depot on public.bsh_hotes_messages for insert to authenticated with check (hote_id = public.bsh_mon_hote() and de_fondatrice = false and auteur = auth.uid() and lu = false);
  end if;
end $$;

-- ── Garde-fous : missions réelles et rémunérations
create or replace function public.bsh_garde_mission() returns trigger language plpgsql security definer set search_path = public as $$
declare h public.bsh_hotes;
begin
  if new.hote_id is not null and new.simulation = false and new.statut in ('confirmee', 'terminee') then
    select * into h from public.bsh_hotes where id = new.hote_id;
    if not coalesce(h.autorise_missions, false) or not coalesce(h.majeur_confirme, false) or h.charte_signee_le is null then
      raise exception 'Mission réelle impossible : l''hôte n''est pas autorisé·e (majorité, charte signée et autorisation de la fondatrice requises).';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists bsh_garde_mission on public.bsh_missions;
create trigger bsh_garde_mission before insert or update on public.bsh_missions for each row execute function public.bsh_garde_mission();

create or replace function public.bsh_garde_remuneration() returns trigger language plpgsql security definer set search_path = public as $$
declare h public.bsh_hotes; m public.bsh_missions;
begin
  if new.statut in ('validee', 'payee') then
    if new.simulation then raise exception 'Rémunération en simulation : validation et paiement impossibles.'; end if;
    select * into h from public.bsh_hotes where id = new.hote_id;
    if not coalesce(h.autorise_remuneration, false) or not coalesce(h.conditions_validees, false) or coalesce(h.statut_juridique, 'a_definir') = 'a_definir' then
      raise exception 'Rémunération impossible : autorisation, statut juridique et conditions de l''hôte à valider par la fondatrice.';
    end if;
    if new.mission_id is not null then
      select * into m from public.bsh_missions where id = new.mission_id;
      if m.simulation or m.statut <> 'terminee' then raise exception 'Rémunération impossible : la mission doit être réelle et terminée.'; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists bsh_garde_remuneration on public.bsh_remunerations;
create trigger bsh_garde_remuneration before insert or update on public.bsh_remunerations for each row execute function public.bsh_garde_remuneration();

-- ── Actions de l'hôte (fonctions contrôlées)
create or replace function public.bsh_hote_repondre(p_mission uuid, p_reponse text, p_message text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare moi uuid := public.bsh_mon_hote(); m public.bsh_missions;
begin
  if moi is null then raise exception 'Espace réservé aux hôtes actifs.'; end if;
  if p_reponse not in ('acceptee', 'refusee') then raise exception 'Réponse invalide.'; end if;
  select * into m from public.bsh_missions where id = p_mission and hote_id = moi for update;
  if m.id is null then raise exception 'Mission introuvable.'; end if;
  if m.statut not in ('proposee', 'acceptee', 'refusee') then raise exception 'Cette mission ne peut plus être modifiée.'; end if;
  update public.bsh_missions set statut = p_reponse, reponse_hote = left(p_message, 1000), reponse_le = now(), updated_at = now() where id = p_mission;
  return jsonb_build_object('ok', true, 'statut', p_reponse);
end $$;

create or replace function public.bsh_hote_pointer(p_mission uuid, p_type text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare moi uuid := public.bsh_mon_hote(); m public.bsh_missions;
begin
  if moi is null then raise exception 'Espace réservé aux hôtes actifs.'; end if;
  select * into m from public.bsh_missions where id = p_mission and hote_id = moi;
  if m.id is null then raise exception 'Mission introuvable.'; end if;
  if m.statut <> 'confirmee' then raise exception 'Pointage possible uniquement sur une mission confirmée.'; end if;
  insert into public.bsh_missions_presences (mission_id, hote_id, arrivee, statut) values (p_mission, moi, case when p_type = 'arrivee' then now() end, 'present')
  on conflict (mission_id, hote_id) do update set arrivee = coalesce(public.bsh_missions_presences.arrivee, case when p_type = 'arrivee' then now() end),
    depart = case when p_type = 'depart' then now() else public.bsh_missions_presences.depart end;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.bsh_hote_messages_lus() returns void language sql security definer set search_path = public as $$
  update public.bsh_hotes_messages set lu = true where hote_id = public.bsh_mon_hote() and de_fondatrice and not lu;
$$;

revoke all on function public.bsh_hote_repondre(uuid, text, text) from public, anon;
revoke all on function public.bsh_hote_pointer(uuid, text) from public, anon;
revoke all on function public.bsh_hote_messages_lus() from public, anon;
revoke all on function public.bsh_mon_hote() from public, anon;
grant execute on function public.bsh_hote_repondre(uuid, text, text), public.bsh_hote_pointer(uuid, text), public.bsh_hote_messages_lus(), public.bsh_mon_hote() to authenticated;
