-- ═══════════════════════════════════════════════════════════
-- 0144 — BSH Private Club, BSH Secret World (phase 1 à 3) et nominations des hôtes.
-- PRÉPARÉE, NON APPLIQUÉE. Application uniquement après sauvegarde complète restaurée
-- avec succès (« COMPLET ») et autorisation explicite de la fondatrice.
-- Dépendances présentes en production : profiles, is_fondatrice(), bsh_evenements,
-- bsh_musique, bsh_hotes, bellaia_missions, realtime.messages. Aucune table existante
-- n'est modifiée ni supprimée. Idempotente (réapplicable). Retour arrière :
-- rollback/0144_bsh_club_monde_nominations_rollback.sql.
--
-- Principes contrôlés en base (et non seulement à l'écran) :
--  • accès réservé aux adultes : profil avec âge vérifié, date de naissance ≥ 18 ans
--    lorsqu'elle est connue, charte communautaire acceptée ;
--  • une fonction d'hôte n'est active qu'après acceptation par la personne nommée,
--    dans les salles attribuées, pendant la durée du mandat, sans suspension ;
--  • aucun hôte ne peut nommer, étendre ses permissions, lire les conversations
--    privées ni porter les accessoires signature de la fondatrice ;
--  • votes : un seul par distinction et par votant, jamais pour soi-même, uniquement
--    entre participants admis, uniquement quand les votes sont ouverts, non modifiables ;
--  • Secret Coins : sans valeur monétaire, attribués uniquement par une fonction serveur,
--    jamais par une écriture directe ;
--  • conversations privées : lisibles par leurs seuls membres (ni les autres membres,
--    ni les hôtes, ni la fondatrice ; la modération passe par le signalement).
-- ═══════════════════════════════════════════════════════════

-- ── 0. Adultes autorisés et charte ───────────────────────────
create table if not exists public.bsh_club_charte (
  user_id uuid not null references public.profiles(id) on delete cascade,
  version text not null,
  accepte_le timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.bsh_club_charte enable row level security;
drop policy if exists bsh_club_charte_soi on public.bsh_club_charte;
create policy bsh_club_charte_soi on public.bsh_club_charte for select using (user_id = auth.uid() or public.is_fondatrice());
drop policy if exists bsh_club_charte_accepter on public.bsh_club_charte;
create policy bsh_club_charte_accepter on public.bsh_club_charte for insert with check (user_id = auth.uid());

create or replace function public.bsh_charte_version() returns text language sql immutable as $$ select 'v1-2026-11'::text $$;

create or replace function public.bsh_adulte_verifie(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = u and p.age_verifi is true
    and (p.date_naissance is null or p.date_naissance <= (current_date - interval '18 years')::date)
    and coalesce(p.statut, '') not in ('suspendu', 'bloque', 'supprime'))
$$;

/** Adulte vérifié ET charte en vigueur acceptée (la fondatrice est toujours autorisée). */
create or replace function public.bsh_adulte_autorise() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (public.is_fondatrice() or (public.bsh_adulte_verifie(auth.uid())
    and exists (select 1 from public.bsh_club_charte c where c.user_id = auth.uid() and c.version = public.bsh_charte_version())))
$$;

-- ── 1. Nominations des hôtes (un seul système, relié à bsh_hotes et aux missions) ──
create table if not exists public.bsh_hotes_nominations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  hote_id uuid references public.bsh_hotes(id) on delete set null,
  fonctions text[] not null,
  permissions text[] not null default '{}',
  salles text[] not null default '{*}',
  responsabilites text,
  regles text,
  debut timestamptz not null default now(),
  fin timestamptz,
  type_duree text not null default 'illimitee' check (type_duree in ('session','evenement','24h','7j','30j','personnalisee','illimitee')),
  statut text not null default 'proposee' check (statut in ('proposee','acceptee','refusee','suspendue','revoquee','expiree')),
  propose_par uuid not null references public.profiles(id),
  repondu_le timestamptz,
  motif text,
  remplace_nomination_id uuid references public.bsh_hotes_nominations(id) on delete set null,
  mission_id uuid references public.bellaia_missions(id) on delete set null,
  evenement_id uuid references public.bsh_evenements(id) on delete set null,
  session_id uuid,
  candidature_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bsh_nom_fonctions check (cardinality(fonctions) > 0 and fonctions <@ array['hote_principal','hote_titulaire','hote_remplacant','hote_evenementiel','moderateur']::text[]),
  constraint bsh_nom_permissions check (permissions <@ array['accueillir','animer','ouvrir_session','lancer_actes','organiser_votes','programmer','recompenser','moderer_public','signalements_mission','fermer_session','compte_rendu']::text[]),
  constraint bsh_nom_salles check (cardinality(salles) > 0),
  constraint bsh_nom_pas_soi check (user_id <> propose_par),
  constraint bsh_nom_periode check (fin is null or fin > debut)
);
create index if not exists bsh_hotes_nominations_user on public.bsh_hotes_nominations (user_id, statut);

create table if not exists public.bsh_hotes_nominations_journal (
  id bigserial primary key,
  nomination_id uuid not null,
  quand timestamptz not null default now(),
  par uuid,
  ancien_statut text,
  nouveau_statut text,
  detail jsonb
);

alter table public.bsh_hotes_nominations enable row level security;
alter table public.bsh_hotes_nominations_journal enable row level security;
drop policy if exists bsh_nom_lire on public.bsh_hotes_nominations;
create policy bsh_nom_lire on public.bsh_hotes_nominations for select using (user_id = auth.uid() or public.is_fondatrice());
drop policy if exists bsh_nom_fondatrice on public.bsh_hotes_nominations;
create policy bsh_nom_fondatrice on public.bsh_hotes_nominations for all using (public.is_fondatrice()) with check (public.is_fondatrice());
drop policy if exists bsh_nom_journal_lire on public.bsh_hotes_nominations_journal;
create policy bsh_nom_journal_lire on public.bsh_hotes_nominations_journal for select using (public.is_fondatrice()
  or exists (select 1 from public.bsh_hotes_nominations n where n.id = nomination_id and n.user_id = auth.uid()));

create or replace function public.bsh_nomination_controle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.statut <> 'proposee' then raise exception 'Une nomination commence toujours par une proposition.'; end if;
    if auth.uid() is not null and new.propose_par <> auth.uid() then raise exception 'La proposition doit être signée par son auteur.'; end if;
    if not public.bsh_adulte_verifie(new.user_id) then raise exception 'La personne nommée doit être un adulte vérifié.'; end if;
  else
    if new.user_id <> old.user_id or new.propose_par <> old.propose_par then raise exception 'Le titulaire et l''auteur d''une nomination ne changent pas.'; end if;
    -- Toute modification des fonctions, permissions, salles ou dates d'une nomination acceptée
    -- la repasse en proposition : la personne doit de nouveau accepter (jamais d'extension silencieuse).
    if old.statut = 'acceptee' and new.statut = 'acceptee' and (new.fonctions <> old.fonctions or new.permissions <> old.permissions or new.salles <> old.salles or new.fin is distinct from old.fin or new.debut <> old.debut) then
      new.statut := 'proposee'; new.repondu_le := null;
    end if;
    if old.statut in ('revoquee','refusee','expiree') and new.statut <> old.statut then raise exception 'Une nomination close ne peut pas être rouverte : créez une nouvelle proposition.'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists bsh_nomination_controle on public.bsh_hotes_nominations;
create trigger bsh_nomination_controle before insert or update on public.bsh_hotes_nominations for each row execute function public.bsh_nomination_controle();

create or replace function public.bsh_nomination_journal() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.bsh_hotes_nominations_journal (nomination_id, par, ancien_statut, nouveau_statut, detail)
  values (new.id, auth.uid(), case when tg_op = 'UPDATE' then old.statut end, new.statut,
          jsonb_build_object('fonctions', new.fonctions, 'permissions', new.permissions, 'salles', new.salles, 'fin', new.fin));
  return new;
end $$;
drop trigger if exists bsh_nomination_journal on public.bsh_hotes_nominations;
create trigger bsh_nomination_journal after insert or update on public.bsh_hotes_nominations for each row execute function public.bsh_nomination_journal();

/** Réponse de la personne nommée (seul chemin d'acceptation). */
create or replace function public.bsh_nomination_repondre(p_id uuid, p_accepte boolean) returns text
language plpgsql security definer set search_path = public as $$
declare n public.bsh_hotes_nominations;
begin
  select * into n from public.bsh_hotes_nominations where id = p_id for update;
  if n.id is null or n.user_id is distinct from auth.uid() then raise exception 'Proposition introuvable.'; end if;
  if n.statut <> 'proposee' then raise exception 'Cette proposition n''est plus en attente.'; end if;
  if n.fin is not null and n.fin <= now() then
    update public.bsh_hotes_nominations set statut = 'expiree' where id = p_id; return 'expiree';
  end if;
  update public.bsh_hotes_nominations set statut = case when p_accepte then 'acceptee' else 'refusee' end, repondu_le = now() where id = p_id;
  return case when p_accepte then 'acceptee' else 'refusee' end;
end $$;
revoke all on function public.bsh_nomination_repondre(uuid, boolean) from public, anon;
grant execute on function public.bsh_nomination_repondre(uuid, boolean) to authenticated;

/** Permission d'hôte effective (expiration automatique : la date de fin suffit). */
create or replace function public.bsh_hote_peut(p_permission text, p_salle text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (public.is_fondatrice() or exists (
    select 1 from public.bsh_hotes_nominations n
    where n.user_id = auth.uid() and n.statut = 'acceptee' and n.debut <= now() and (n.fin is null or n.fin > now())
      and p_permission = any (n.permissions) and ('*' = any (n.salles) or p_salle = any (n.salles))))
$$;

/** Marque comme expirées les nominations échues (affichage ; les droits cessent déjà à la date de fin). */
create or replace function public.bsh_nominations_expirer() returns int language plpgsql security definer set search_path = public as $$
declare k int; begin
  update public.bsh_hotes_nominations set statut = 'expiree' where statut in ('acceptee','proposee') and fin is not null and fin <= now();
  get diagnostics k = row_count; return k;
end $$;
revoke all on function public.bsh_nominations_expirer() from public, anon, authenticated;

-- ── 2. BSH Private Club ──────────────────────────────────────
create table if not exists public.bsh_club_salles (
  id text primary key,
  nom text not null,
  accroche text,
  description text,
  regles text[] not null default '{}',
  acces text not null default 'membres_adultes' check (acces in ('membres_adultes','membres_autorises','duo_prive')),
  lien_existant text,
  ouverte boolean not null default false,
  ordre int not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.bsh_club_salles (id, nom, accroche, acces, lien_existant, ordre) values
  ('the_red_room','THE RED ROOM','Le club des tentations','membres_adultes',null,1),
  ('dark_romance','DARK ROMANCE','Rivalités, secrets et bals masqués','membres_adultes',null,2),
  ('wild_saloon','WILD SALOON','Western glamour et duels de répartie','membres_adultes',null,3),
  ('cabaret_rouge','CABARET ROUGE','Sous les projecteurs','membres_adultes',null,4),
  ('midnight_boutique','MIDNIGHT BOUTIQUE','La boutique des secrets','membres_adultes',null,5),
  ('masquerade','MASQUERADE','Personne ne sait qui vous êtes','membres_adultes',null,6),
  ('secret_duo','SECRET DUO','L''univers des couples','duo_prive','/bsh/secret-duo',7),
  ('golden_room','GOLDEN ROOM','Le salon des membres autorisés','membres_autorises',null,8)
on conflict (id) do nothing;

create table if not exists public.bsh_club_scenarios (
  id uuid primary key default gen_random_uuid(),
  salle_id text not null references public.bsh_club_salles(id),
  titre text not null,
  contenu jsonb not null,
  intensite smallint not null check (intensite between 1 and 6),
  duree_min smallint, duree_max smallint,
  participants_min smallint not null default 1, participants_max smallint not null default 24,
  illustration text,
  statut text not null default 'brouillon' check (statut in ('brouillon','en_revision','publie','archive')),
  origine text not null default 'manuel' check (origine in ('manuel','import','ia')),
  version int not null default 1,
  duplique_de uuid references public.bsh_club_scenarios(id) on delete set null,
  cree_par uuid references public.profiles(id),
  valide_par uuid references public.profiles(id),
  valide_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Validation humaine obligatoire avant publication (y compris pour les propositions de l'assistant IA).
  constraint bsh_scenario_validation check (statut <> 'publie' or (valide_par is not null and valide_le is not null)),
  constraint bsh_scenario_participants check (participants_min <= participants_max)
);

create table if not exists public.bsh_club_sessions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.bsh_club_scenarios(id),
  salle_id text not null references public.bsh_club_salles(id),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  mode text not null default 'multijoueur' check (mode in ('solo','duo_prive','multijoueur','live_lounge','tournoi','histoire')),
  acces text not null default 'invitation' check (acces in ('invitation','membres')),
  statut text not null default 'programmee' check (statut in ('programmee','ouverte','en_cours','pause','votes','terminee','annulee')),
  programmee_le timestamptz,
  horaires jsonb not null default '[]',
  acte_courant text,
  acte_debut timestamptz,
  votes_ouverts boolean not null default false,
  etat jsonb not null default '{}',
  evenement_id uuid references public.bsh_evenements(id) on delete set null,
  musique_id uuid references public.bsh_musique(id) on delete set null,
  compte_rendu text,
  cree_par uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bsh_club_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bsh_club_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  pseudo text not null check (char_length(pseudo) between 1 and 30),
  personnage text,
  statut text not null default 'demande' check (statut in ('invite','demande','admis','present','parti','exclu')),
  motif_exclusion text,
  regles_acceptees_le timestamptz not null default now(),
  derniere_presence timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, user_id),
  unique (session_id, pseudo)
);

create table if not exists public.bsh_club_reponses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bsh_club_sessions(id) on delete cascade,
  acte_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  contenu jsonb not null default '{}',
  passe boolean not null default false,
  masquee boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, acte_id, user_id)
);

create table if not exists public.bsh_club_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bsh_club_sessions(id) on delete cascade,
  distinction_id text not null,
  votant_id uuid not null references public.profiles(id) on delete cascade,
  cible_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, distinction_id, votant_id),
  constraint bsh_vote_pas_soi check (votant_id <> cible_id)
);

create table if not exists public.bsh_club_distinctions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bsh_club_sessions(id) on delete cascade,
  distinction_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  saison text not null default to_char(now() at time zone 'America/Cayenne', 'YYYY'),
  voix int not null default 0,
  attribue_par uuid references public.profiles(id),
  afficher_profil boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, distinction_id, user_id)
);

alter table public.bsh_club_salles enable row level security;
alter table public.bsh_club_scenarios enable row level security;
alter table public.bsh_club_sessions enable row level security;
alter table public.bsh_club_participants enable row level security;
alter table public.bsh_club_reponses enable row level security;
alter table public.bsh_club_votes enable row level security;
alter table public.bsh_club_distinctions enable row level security;

/** Participant admis (ou présent) et non exclu d'une session. */
create or replace function public.bsh_club_participant(p_session uuid, u uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bsh_club_participants p where p.session_id = p_session and p.user_id = u and p.statut in ('admis','present'))
$$;
create or replace function public.bsh_club_salle_de(p_session uuid) returns text
language sql stable security definer set search_path = public as $$ select salle_id from public.bsh_club_sessions where id = p_session $$;

-- Salles : visibles par les adultes autorisés ; modifiables par la fondatrice ; ouverture/fermeture par un hôte « animer ».
drop policy if exists bsh_club_salles_lire on public.bsh_club_salles;
create policy bsh_club_salles_lire on public.bsh_club_salles for select using (public.bsh_adulte_autorise());
drop policy if exists bsh_club_salles_gerer on public.bsh_club_salles;
create policy bsh_club_salles_gerer on public.bsh_club_salles for all using (public.is_fondatrice()) with check (public.is_fondatrice());
drop policy if exists bsh_club_salles_ouvrir on public.bsh_club_salles;
create policy bsh_club_salles_ouvrir on public.bsh_club_salles for update using (public.bsh_hote_peut('animer', id)) with check (public.bsh_hote_peut('animer', id));
create or replace function public.bsh_club_salles_controle() returns trigger language plpgsql as $$
begin
  if not public.is_fondatrice() and (new.nom, new.accroche, new.description, new.regles, new.acces, new.lien_existant, new.ordre) is distinct from (old.nom, old.accroche, old.description, old.regles, old.acces, old.lien_existant, old.ordre) then
    raise exception 'Un hôte peut seulement ouvrir ou fermer la salle.';
  end if;
  new.updated_at := now(); return new;
end $$;
drop trigger if exists bsh_club_salles_controle on public.bsh_club_salles;
create trigger bsh_club_salles_controle before update on public.bsh_club_salles for each row execute function public.bsh_club_salles_controle();

-- Scénarios : atelier de la fondatrice ; les adultes autorisés lisent les scénarios publiés ;
-- un hôte lit ceux des salles qu'il anime.
drop policy if exists bsh_club_scenarios_lire on public.bsh_club_scenarios;
create policy bsh_club_scenarios_lire on public.bsh_club_scenarios for select using (public.is_fondatrice()
  or (statut = 'publie' and public.bsh_adulte_autorise()) or public.bsh_hote_peut('animer', salle_id));
drop policy if exists bsh_club_scenarios_atelier on public.bsh_club_scenarios;
create policy bsh_club_scenarios_atelier on public.bsh_club_scenarios for all using (public.is_fondatrice()) with check (public.is_fondatrice());

-- Sessions
drop policy if exists bsh_club_sessions_lire on public.bsh_club_sessions;
create policy bsh_club_sessions_lire on public.bsh_club_sessions for select using (public.is_fondatrice()
  or public.bsh_hote_peut('animer', salle_id) or public.bsh_hote_peut('accueillir', salle_id)
  or (public.bsh_adulte_autorise() and (acces = 'membres' or exists (select 1 from public.bsh_club_participants p where p.session_id = bsh_club_sessions.id and p.user_id = auth.uid() and p.statut <> 'exclu'))));
drop policy if exists bsh_club_sessions_creer on public.bsh_club_sessions;
create policy bsh_club_sessions_creer on public.bsh_club_sessions for insert with check (public.bsh_hote_peut('ouvrir_session', salle_id) and cree_par = auth.uid());
drop policy if exists bsh_club_sessions_piloter on public.bsh_club_sessions;
create policy bsh_club_sessions_piloter on public.bsh_club_sessions for update using (public.bsh_hote_peut('animer', salle_id)) with check (public.bsh_hote_peut('animer', salle_id));

create or replace function public.bsh_club_sessions_controle() returns trigger language plpgsql as $$
begin
  if new.salle_id <> old.salle_id or new.scenario_id <> old.scenario_id or new.code <> old.code then raise exception 'Salle, scénario et code d''une session ne changent pas.'; end if;
  if old.statut in ('terminee','annulee') and new.statut <> old.statut then raise exception 'Session close.'; end if;
  if new.acte_courant is distinct from old.acte_courant and not public.bsh_hote_peut('lancer_actes', new.salle_id) then raise exception 'Permission requise : lancer les actes.'; end if;
  if new.votes_ouverts <> old.votes_ouverts and not public.bsh_hote_peut('organiser_votes', new.salle_id) then raise exception 'Permission requise : organiser les votes.'; end if;
  if new.statut in ('terminee','annulee') and new.statut <> old.statut and not public.bsh_hote_peut('fermer_session', new.salle_id) then raise exception 'Permission requise : fermer la session.'; end if;
  if new.compte_rendu is distinct from old.compte_rendu and not public.bsh_hote_peut('compte_rendu', new.salle_id) then raise exception 'Permission requise : compte rendu.'; end if;
  if new.statut in ('terminee','annulee') then new.votes_ouverts := false; end if;
  if new.acte_courant is distinct from old.acte_courant then new.acte_debut := now(); end if;
  new.updated_at := now(); return new;
end $$;
drop trigger if exists bsh_club_sessions_controle on public.bsh_club_sessions;
create trigger bsh_club_sessions_controle before update on public.bsh_club_sessions for each row execute function public.bsh_club_sessions_controle();

-- Participants
drop policy if exists bsh_club_participants_lire on public.bsh_club_participants;
create policy bsh_club_participants_lire on public.bsh_club_participants for select using (user_id = auth.uid()
  or public.bsh_club_participant(session_id) or public.bsh_hote_peut('accueillir', public.bsh_club_salle_de(session_id)) or public.bsh_hote_peut('animer', public.bsh_club_salle_de(session_id)));
drop policy if exists bsh_club_participants_rejoindre on public.bsh_club_participants;
create policy bsh_club_participants_rejoindre on public.bsh_club_participants for insert with check (
  (user_id = auth.uid() and public.bsh_adulte_autorise())
  or public.bsh_hote_peut('accueillir', public.bsh_club_salle_de(session_id)));
drop policy if exists bsh_club_participants_maj on public.bsh_club_participants;
create policy bsh_club_participants_maj on public.bsh_club_participants for update using (user_id = auth.uid()
  or public.bsh_hote_peut('accueillir', public.bsh_club_salle_de(session_id)) or public.bsh_hote_peut('moderer_public', public.bsh_club_salle_de(session_id)));

create or replace function public.bsh_club_participants_controle() returns trigger language plpgsql security definer set search_path = public as $$
declare s public.bsh_club_sessions; animateur boolean;
begin
  select * into s from public.bsh_club_sessions where id = new.session_id;
  animateur := public.bsh_hote_peut('accueillir', s.salle_id) or public.bsh_hote_peut('moderer_public', s.salle_id);
  if tg_op = 'INSERT' then
    if not public.bsh_adulte_verifie(new.user_id) and not exists (select 1 from public.profiles where id = new.user_id and role = 'fondatrice') then raise exception 'Réservé aux adultes vérifiés.'; end if;
    if s.statut in ('terminee','annulee') then raise exception 'Session close.'; end if;
    if new.user_id = auth.uid() and not animateur then
      -- Arrivée par soi-même : admis d'office si la session est ouverte aux membres, sinon simple demande.
      new.statut := case when s.acces = 'membres' then 'admis' else 'demande' end;
    elsif new.user_id <> auth.uid() then
      new.statut := 'invite';   -- un hôte invite ; la personne accepte elle-même
    end if;
  else
    if new.user_id <> old.user_id or new.session_id <> old.session_id then raise exception 'Participant non modifiable.'; end if;
    if old.statut = 'exclu' and not public.is_fondatrice() then raise exception 'Participant exclu.'; end if;
    if new.user_id = auth.uid() and not animateur then
      -- Soi-même : accepter une invitation, être présent, partir, revenir (jamais s'admettre sur demande).
      if not ((old.statut = 'invite' and new.statut in ('admis','parti'))
           or (old.statut in ('admis','present','parti') and new.statut in ('admis','present','parti'))
           or (old.statut = 'demande' and new.statut in ('demande','parti'))) then
        raise exception 'Changement de statut non autorisé.';
      end if;
    else
      if new.statut = 'exclu' and coalesce(trim(new.motif_exclusion), '') = '' then raise exception 'Motif d''exclusion obligatoire.'; end if;
      if new.statut = 'exclu' and exists (select 1 from public.profiles where id = new.user_id and role = 'fondatrice') then raise exception 'La fondatrice ne peut pas être exclue.'; end if;
    end if;
  end if;
  -- Capacité : contrôlée à chaque entrée dans la session (arrivée, admission, acceptation d'invitation).
  if new.statut in ('admis','present') and (tg_op = 'INSERT' or old.statut not in ('admis','present'))
     and (select count(*) from public.bsh_club_participants p where p.session_id = new.session_id and p.statut in ('admis','present') and p.id <> new.id)
         >= coalesce((select participants_max from public.bsh_club_scenarios where id = s.scenario_id), 24) then
    raise exception 'Session complète.';
  end if;
  return new;
end $$;
drop trigger if exists bsh_club_participants_controle on public.bsh_club_participants;
create trigger bsh_club_participants_controle before insert or update on public.bsh_club_participants for each row execute function public.bsh_club_participants_controle();

-- Réponses : chacun écrit la sienne pour l'acte en cours ; les participants voient celles de la session (sauf masquées) ;
-- un hôte « modérer » peut masquer une réponse.
drop policy if exists bsh_club_reponses_lire on public.bsh_club_reponses;
create policy bsh_club_reponses_lire on public.bsh_club_reponses for select using (user_id = auth.uid()
  or (public.bsh_club_participant(session_id) and not masquee) or public.bsh_hote_peut('animer', public.bsh_club_salle_de(session_id)));
drop policy if exists bsh_club_reponses_ecrire on public.bsh_club_reponses;
create policy bsh_club_reponses_ecrire on public.bsh_club_reponses for insert with check (user_id = auth.uid() and public.bsh_club_participant(session_id)
  and exists (select 1 from public.bsh_club_sessions s where s.id = session_id and s.statut = 'en_cours' and s.acte_courant = acte_id));
drop policy if exists bsh_club_reponses_modifier on public.bsh_club_reponses;
create policy bsh_club_reponses_modifier on public.bsh_club_reponses for update using ((user_id = auth.uid() and public.bsh_club_participant(session_id))
  or public.bsh_hote_peut('moderer_public', public.bsh_club_salle_de(session_id)));
create or replace function public.bsh_club_reponses_controle() returns trigger language plpgsql as $$
begin
  if new.user_id <> old.user_id or new.session_id <> old.session_id or new.acte_id <> old.acte_id then raise exception 'Réponse non déplaçable.'; end if;
  if new.user_id = auth.uid() and not public.bsh_hote_peut('moderer_public', public.bsh_club_salle_de(new.session_id)) then
    if new.masquee <> old.masquee then raise exception 'Seule la modération masque une réponse.'; end if;
    if not exists (select 1 from public.bsh_club_sessions s where s.id = new.session_id and s.statut = 'en_cours' and s.acte_courant = new.acte_id) then raise exception 'Acte terminé.'; end if;
  elsif new.user_id <> auth.uid() and (new.contenu <> old.contenu or new.passe <> old.passe) then
    raise exception 'La modération masque une réponse, elle ne la réécrit pas.';
  end if;
  new.updated_at := now(); return new;
end $$;
drop trigger if exists bsh_club_reponses_controle on public.bsh_club_reponses;
create trigger bsh_club_reponses_controle before update on public.bsh_club_reponses for each row execute function public.bsh_club_reponses_controle();

-- Votes : insertion seule (ni modification ni suppression par les joueurs).
drop policy if exists bsh_club_votes_lire on public.bsh_club_votes;
create policy bsh_club_votes_lire on public.bsh_club_votes for select using (votant_id = auth.uid() or public.bsh_hote_peut('organiser_votes', public.bsh_club_salle_de(session_id)));
drop policy if exists bsh_club_votes_voter on public.bsh_club_votes;
create policy bsh_club_votes_voter on public.bsh_club_votes for insert with check (votant_id = auth.uid()
  and public.bsh_club_participant(session_id, votant_id) and public.bsh_club_participant(session_id, cible_id)
  and exists (select 1 from public.bsh_club_sessions s where s.id = session_id and s.votes_ouverts and s.statut in ('en_cours','votes')));

-- Dépouillement (agrégé, sans révéler qui a voté pour qui), réservé aux animateurs de la salle.
create or replace function public.bsh_club_depouiller(p_session uuid) returns table (distinction_id text, cible_id uuid, voix bigint)
language sql stable security definer set search_path = public as $$
  select v.distinction_id, v.cible_id, count(*) from public.bsh_club_votes v
  where v.session_id = p_session and public.bsh_hote_peut('organiser_votes', public.bsh_club_salle_de(p_session))
    and public.bsh_club_participant(p_session, v.votant_id) and public.bsh_club_participant(p_session, v.cible_id)
  group by 1, 2 order by 1, 3 desc
$$;

-- Distinctions : attribuées par un animateur « organiser_votes » (votes fermés) ; affichage public facultatif, choisi par la personne.
drop policy if exists bsh_club_distinctions_lire on public.bsh_club_distinctions;
create policy bsh_club_distinctions_lire on public.bsh_club_distinctions for select using (user_id = auth.uid() or public.is_fondatrice()
  or (afficher_profil and public.bsh_adulte_autorise()) or public.bsh_hote_peut('organiser_votes', public.bsh_club_salle_de(session_id)));
drop policy if exists bsh_club_distinctions_attribuer on public.bsh_club_distinctions;
create policy bsh_club_distinctions_attribuer on public.bsh_club_distinctions for insert with check (public.bsh_hote_peut('organiser_votes', public.bsh_club_salle_de(session_id))
  and attribue_par = auth.uid() and public.bsh_club_participant(session_id, user_id)
  and exists (select 1 from public.bsh_club_sessions s where s.id = session_id and not s.votes_ouverts));
drop policy if exists bsh_club_distinctions_affichage on public.bsh_club_distinctions;
create policy bsh_club_distinctions_affichage on public.bsh_club_distinctions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create or replace function public.bsh_club_distinctions_controle() returns trigger language plpgsql as $$
begin
  if (new.session_id, new.distinction_id, new.user_id, new.saison, new.voix, new.attribue_par) is distinct from (old.session_id, old.distinction_id, old.user_id, old.saison, old.voix, old.attribue_par) then
    raise exception 'Seul le choix d''affichage sur le profil est modifiable.';
  end if;
  return new;
end $$;
drop trigger if exists bsh_club_distinctions_controle on public.bsh_club_distinctions;
create trigger bsh_club_distinctions_controle before update on public.bsh_club_distinctions for each row execute function public.bsh_club_distinctions_controle();

-- Classement saisonnier (distinctions dont la personne a accepté l'affichage, ou les siennes).
create or replace view public.v_bsh_club_classement_saison with (security_invoker = true) as
  select saison, user_id, count(*) as distinctions, sum(voix) as voix from public.bsh_club_distinctions group by saison, user_id;

-- ── 3. BSH Secret World ──────────────────────────────────────
create table if not exists public.bsh_monde_accessoires (
  id text primary key,
  nom text not null,
  categorie text not null check (categorie in ('masque','coiffure','vetement','chaussures','bijou','accessoire','maquillage','mobilier','decoration')),
  exclusif_fondatrice boolean not null default false,
  ressource text,
  droits_verifies boolean not null default false,
  created_at timestamptz not null default now()
);
insert into public.bsh_monde_accessoires (id, nom, categorie, exclusif_fondatrice, droits_verifies) values
  ('masque_black_secret','Black Secret — dentelle noire','masque',true,true),
  ('masque_red_mystery','Red Mystery — dentelle rouge bordeaux','masque',true,true),
  ('masque_golden_secret','Golden Secret — dentelle noire et dorée','masque',true,true),
  ('masque_bal_simple','Masque de bal (membres)','masque',false,true)
on conflict (id) do nothing;

create table if not exists public.bsh_monde_avatars (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pseudo text not null unique check (char_length(pseudo) between 2 and 24),
  apparence jsonb not null default '{}',
  tenues jsonb not null default '[]',
  salle_actuelle text,
  invitations_refusees text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.bsh_monde_salles (
  id text primary key,
  nom text not null,
  type text not null default 'publique' check (type in ('publique','vip','personnelle','evenement')),
  proprietaire_id uuid references public.profiles(id) on delete cascade,
  acces text not null default 'membres' check (acces in ('prive','amis','invitation','membres','autorises')),
  capacite smallint not null default 25 check (capacite between 1 and 200),
  ouverte boolean not null default true,
  decor jsonb not null default '{}',
  musique_id uuid references public.bsh_musique(id) on delete set null,
  ordre int not null default 0,
  updated_at timestamptz not null default now(),
  constraint bsh_monde_salle_perso check ((type = 'personnelle') = (proprietaire_id is not null))
);
insert into public.bsh_monde_salles (id, nom, type, acces, ordre) values
  ('grand_hall','BSH Grand Hall','publique','membres',1),
  ('the_red_room','The Red Room','publique','membres',2),
  ('secret_games_arena','Secret Games Arena','publique','membres',3),
  ('cabaret_rouge','Cabaret Rouge','publique','membres',4),
  ('wild_saloon','Wild Saloon','publique','membres',5),
  ('rooftop','BSH Rooftop','publique','membres',6),
  ('midnight_boutique','Midnight Boutique','publique','membres',7),
  ('golden_room','Golden Room','vip','autorises',8)
on conflict (id) do nothing;

create table if not exists public.bsh_monde_salle_acces (
  salle_id text not null references public.bsh_monde_salles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  statut text not null check (statut in ('demande','invite','autorise','refuse','retire')),
  updated_at timestamptz not null default now(),
  primary key (salle_id, user_id)
);
create table if not exists public.bsh_monde_amities (
  demandeur uuid not null references public.profiles(id) on delete cascade,
  destinataire uuid not null references public.profiles(id) on delete cascade,
  statut text not null default 'demande' check (statut in ('demande','acceptee','refusee')),
  created_at timestamptz not null default now(),
  primary key (demandeur, destinataire),
  constraint bsh_amitie_pas_soi check (demandeur <> destinataire)
);
create table if not exists public.bsh_monde_blocages (
  bloqueur uuid not null references public.profiles(id) on delete cascade,
  bloque uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bloqueur, bloque),
  constraint bsh_blocage_pas_soi check (bloqueur <> bloque)
);
create table if not exists public.bsh_monde_invitations (
  id uuid primary key default gen_random_uuid(),
  de uuid not null references public.profiles(id) on delete cascade,
  pour uuid not null references public.profiles(id) on delete cascade,
  categorie text not null check (categorie in ('saluer','danser','partie','salon','salle','groupe','amitie')),
  cible text,
  statut text not null default 'envoyee' check (statut in ('envoyee','acceptee','refusee','expiree')),
  created_at timestamptz not null default now(),
  expire_le timestamptz not null default now() + interval '10 minutes',
  constraint bsh_invitation_pas_soi check (de <> pour)
);
create table if not exists public.bsh_monde_conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('prive','groupe')),
  titre text,
  cree_par uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.bsh_monde_conversation_membres (
  conversation_id uuid not null references public.bsh_monde_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  statut text not null default 'membre' check (statut in ('invite','membre','parti')),
  primary key (conversation_id, user_id)
);
create table if not exists public.bsh_monde_messages (
  id uuid primary key default gen_random_uuid(),
  salle_id text references public.bsh_monde_salles(id) on delete cascade,
  conversation_id uuid references public.bsh_monde_conversations(id) on delete cascade,
  auteur uuid not null references public.profiles(id) on delete cascade,
  contenu text not null check (char_length(contenu) between 1 and 500),
  masque boolean not null default false,
  created_at timestamptz not null default now(),
  constraint bsh_message_un_lieu check ((salle_id is null) <> (conversation_id is null))
);
create index if not exists bsh_monde_messages_salle on public.bsh_monde_messages (salle_id, created_at desc);
create index if not exists bsh_monde_messages_conv on public.bsh_monde_messages (conversation_id, created_at desc);
create table if not exists public.bsh_monde_signalements (
  id uuid primary key default gen_random_uuid(),
  signale_par uuid not null references public.profiles(id) on delete cascade,
  vise uuid references public.profiles(id) on delete set null,
  salle_id text,
  session_id uuid,
  -- Extrait choisi et transmis par la personne qui signale (jamais une lecture de la conversation privée).
  extrait text check (char_length(extrait) <= 1000),
  motif text not null,
  prive boolean not null default false,
  statut text not null default 'ouvert' check (statut in ('ouvert','en_cours','traite','classe')),
  traite_par uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.bsh_monde_inventaire (
  user_id uuid not null references public.profiles(id) on delete cascade,
  objet_id text not null references public.bsh_monde_accessoires(id),
  quantite int not null default 1 check (quantite >= 0),
  obtenu_le timestamptz not null default now(),
  primary key (user_id, objet_id)
);
-- Secret Coins : gratuits, sans valeur monétaire, non convertibles, non retirables.
create table if not exists public.bsh_monde_coins (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null check (delta between -1000 and 1000 and delta <> 0),
  motif text not null,
  attribue_par uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.bsh_monde_accessoires enable row level security;
alter table public.bsh_monde_avatars enable row level security;
alter table public.bsh_monde_salles enable row level security;
alter table public.bsh_monde_salle_acces enable row level security;
alter table public.bsh_monde_amities enable row level security;
alter table public.bsh_monde_blocages enable row level security;
alter table public.bsh_monde_invitations enable row level security;
alter table public.bsh_monde_conversations enable row level security;
alter table public.bsh_monde_conversation_membres enable row level security;
alter table public.bsh_monde_messages enable row level security;
alter table public.bsh_monde_signalements enable row level security;
alter table public.bsh_monde_inventaire enable row level security;
alter table public.bsh_monde_coins enable row level security;

create or replace function public.bsh_bloque(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bsh_monde_blocages where (bloqueur = a and bloque = b) or (bloqueur = b and bloque = a)) $$;
create or replace function public.bsh_conv_membre(c uuid, u uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bsh_monde_conversation_membres m where m.conversation_id = c and m.user_id = u and m.statut = 'membre') $$;

-- Accessoires : catalogue visible (sauf ressources exclusives pour les autres membres), géré par la fondatrice.
drop policy if exists bsh_acc_lire on public.bsh_monde_accessoires;
create policy bsh_acc_lire on public.bsh_monde_accessoires for select using (public.bsh_adulte_autorise() and (not exclusif_fondatrice or public.is_fondatrice()));
drop policy if exists bsh_acc_gerer on public.bsh_monde_accessoires;
create policy bsh_acc_gerer on public.bsh_monde_accessoires for all using (public.is_fondatrice()) with check (public.is_fondatrice());

-- Avatars : visibles par les adultes autorisés (apparence publique), modifiables par leur titulaire seul.
drop policy if exists bsh_avatar_lire on public.bsh_monde_avatars;
create policy bsh_avatar_lire on public.bsh_monde_avatars for select using (public.bsh_adulte_autorise());
drop policy if exists bsh_avatar_creer on public.bsh_monde_avatars;
create policy bsh_avatar_creer on public.bsh_monde_avatars for insert with check (user_id = auth.uid() and public.bsh_adulte_autorise());
drop policy if exists bsh_avatar_maj on public.bsh_monde_avatars;
create policy bsh_avatar_maj on public.bsh_monde_avatars for update using (user_id = auth.uid()) with check (user_id = auth.uid());

/** Accessoires exclusifs (masques signature, ressources « fondatrice_* ») réservés à la fondatrice,
 *  dans l'apparence portée comme dans les tenues enregistrées. Le badge et le rôle ne dépendent
 *  jamais de l'apparence : ils sont lus dans le profil et les nominations. */
create or replace function public.bsh_avatar_controle() returns trigger language plpgsql security definer set search_path = public as $$
declare portes text[]; interdit text; fondatrice boolean;
begin
  fondatrice := exists (select 1 from public.profiles where id = new.user_id and role = 'fondatrice');
  select array_agg(distinct v) into portes from (
    select new.apparence->>'masque' as v
    union all select jsonb_array_elements_text(coalesce(new.apparence->'accessoires', '[]'))
    union all select t->>'masque' from jsonb_array_elements(coalesce(new.tenues, '[]')) t
    union all select jsonb_array_elements_text(coalesce(t->'accessoires', '[]')) from jsonb_array_elements(coalesce(new.tenues, '[]')) t
  ) x where v is not null;
  if not fondatrice then
    select p into interdit from unnest(coalesce(portes, '{}')) p
      where p like 'fondatrice\_%' or exists (select 1 from public.bsh_monde_accessoires a where a.id = p and a.exclusif_fondatrice) limit 1;
    if interdit is not null then raise exception 'Accessoire réservé à la fondatrice : %', interdit; end if;
    if new.apparence ? 'badge' or new.apparence ? 'titre' or new.apparence ? 'personnage_officiel' then raise exception 'Badge, titre et personnage officiel ne font pas partie de l''apparence.'; end if;
  end if;
  new.updated_at := now(); return new;
end $$;
drop trigger if exists bsh_avatar_controle on public.bsh_monde_avatars;
create trigger bsh_avatar_controle before insert or update on public.bsh_monde_avatars for each row execute function public.bsh_avatar_controle();

-- Salles du monde
create or replace function public.bsh_monde_peut_entrer(p_salle text) returns boolean language sql stable security definer set search_path = public as $$
  select public.bsh_adulte_autorise() and exists (select 1 from public.bsh_monde_salles s where s.id = p_salle and (
    public.is_fondatrice() or s.proprietaire_id = auth.uid()
    or (s.ouverte and (
         (s.acces = 'membres')
      or (s.acces = 'autorises' and exists (select 1 from public.bsh_monde_salle_acces a where a.salle_id = s.id and a.user_id = auth.uid() and a.statut = 'autorise'))
      or (s.acces = 'invitation' and exists (select 1 from public.bsh_monde_salle_acces a where a.salle_id = s.id and a.user_id = auth.uid() and a.statut = 'autorise'))
      or (s.acces = 'amis' and exists (select 1 from public.bsh_monde_amities f where f.statut = 'acceptee' and ((f.demandeur = s.proprietaire_id and f.destinataire = auth.uid()) or (f.destinataire = s.proprietaire_id and f.demandeur = auth.uid()))))
    ) and not (s.proprietaire_id is not null and public.bsh_bloque(s.proprietaire_id, auth.uid()))
      and not exists (select 1 from public.bsh_monde_salle_acces a where a.salle_id = s.id and a.user_id = auth.uid() and a.statut in ('retire','refuse')))))
$$;
drop policy if exists bsh_salles_lire on public.bsh_monde_salles;
create policy bsh_salles_lire on public.bsh_monde_salles for select using (public.bsh_adulte_autorise() and (type <> 'personnelle' or acces <> 'prive' or proprietaire_id = auth.uid()));
drop policy if exists bsh_salles_fondatrice on public.bsh_monde_salles;
create policy bsh_salles_fondatrice on public.bsh_monde_salles for all using (public.is_fondatrice()) with check (public.is_fondatrice());
drop policy if exists bsh_salles_perso on public.bsh_monde_salles;
create policy bsh_salles_perso on public.bsh_monde_salles for all using (proprietaire_id = auth.uid()) with check (proprietaire_id = auth.uid() and type = 'personnelle' and public.bsh_adulte_autorise());
drop policy if exists bsh_salles_hote on public.bsh_monde_salles;
create policy bsh_salles_hote on public.bsh_monde_salles for update using (type <> 'personnelle' and public.bsh_hote_peut('animer', id)) with check (type <> 'personnelle' and public.bsh_hote_peut('animer', id));
create or replace function public.bsh_monde_salles_controle() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and not public.is_fondatrice() and coalesce(old.proprietaire_id, '00000000-0000-0000-0000-000000000000') <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000001')
     and (new.nom, new.type, new.proprietaire_id, new.acces, new.capacite, new.decor, new.ordre) is distinct from (old.nom, old.type, old.proprietaire_id, old.acces, old.capacite, old.decor, old.ordre) then
    raise exception 'Un hôte peut ouvrir, fermer la salle ou changer sa musique autorisée, pas la reconstruire.';
  end if;
  if tg_op = 'UPDATE' and new.proprietaire_id is distinct from old.proprietaire_id and not public.is_fondatrice() then raise exception 'Propriétaire non modifiable.'; end if;
  new.updated_at := now(); return new;
end $$;
drop trigger if exists bsh_monde_salles_controle on public.bsh_monde_salles;
create trigger bsh_monde_salles_controle before insert or update on public.bsh_monde_salles for each row execute function public.bsh_monde_salles_controle();

drop policy if exists bsh_salle_acces_lire on public.bsh_monde_salle_acces;
create policy bsh_salle_acces_lire on public.bsh_monde_salle_acces for select using (user_id = auth.uid() or public.is_fondatrice()
  or exists (select 1 from public.bsh_monde_salles s where s.id = salle_id and s.proprietaire_id = auth.uid()));
drop policy if exists bsh_salle_acces_demander on public.bsh_monde_salle_acces;
create policy bsh_salle_acces_demander on public.bsh_monde_salle_acces for insert with check (
  (user_id = auth.uid() and statut = 'demande' and public.bsh_adulte_autorise())
  or exists (select 1 from public.bsh_monde_salles s where s.id = salle_id and (s.proprietaire_id = auth.uid() or (s.proprietaire_id is null and public.is_fondatrice())) and statut in ('invite','autorise')));
drop policy if exists bsh_salle_acces_decider on public.bsh_monde_salle_acces;
create policy bsh_salle_acces_decider on public.bsh_monde_salle_acces for update using (public.is_fondatrice()
  or exists (select 1 from public.bsh_monde_salles s where s.id = salle_id and s.proprietaire_id = auth.uid()) or user_id = auth.uid());
create or replace function public.bsh_salle_acces_controle() returns trigger language plpgsql as $$
begin
  -- La personne elle-même peut accepter une invitation (invite → autorise) ou y renoncer ; jamais s'autoriser sur une demande.
  if tg_op = 'UPDATE' and new.user_id = auth.uid() and not public.is_fondatrice()
     and not exists (select 1 from public.bsh_monde_salles s where s.id = new.salle_id and s.proprietaire_id = auth.uid())
     and not ((old.statut = 'invite' and new.statut in ('autorise','refuse')) or new.statut = old.statut) then
    raise exception 'Seul le propriétaire du salon accepte une demande.';
  end if;
  new.updated_at := now(); return new;
end $$;
drop trigger if exists bsh_salle_acces_controle on public.bsh_monde_salle_acces;
create trigger bsh_salle_acces_controle before update on public.bsh_monde_salle_acces for each row execute function public.bsh_salle_acces_controle();

-- Amitiés, blocages, invitations (aucune interaction imposée)
drop policy if exists bsh_amities_lire on public.bsh_monde_amities;
create policy bsh_amities_lire on public.bsh_monde_amities for select using (auth.uid() in (demandeur, destinataire));
drop policy if exists bsh_amities_demander on public.bsh_monde_amities;
create policy bsh_amities_demander on public.bsh_monde_amities for insert with check (demandeur = auth.uid() and statut = 'demande' and public.bsh_adulte_autorise()
  and not public.bsh_bloque(demandeur, destinataire)
  and not exists (select 1 from public.bsh_monde_avatars a where a.user_id = destinataire and 'amitie' = any (a.invitations_refusees)));
drop policy if exists bsh_amities_repondre on public.bsh_monde_amities;
create policy bsh_amities_repondre on public.bsh_monde_amities for update using (destinataire = auth.uid()) with check (destinataire = auth.uid());
drop policy if exists bsh_amities_retirer on public.bsh_monde_amities;
create policy bsh_amities_retirer on public.bsh_monde_amities for delete using (auth.uid() in (demandeur, destinataire));

drop policy if exists bsh_blocages_soi on public.bsh_monde_blocages;
create policy bsh_blocages_soi on public.bsh_monde_blocages for all using (bloqueur = auth.uid()) with check (bloqueur = auth.uid());

drop policy if exists bsh_invitations_lire on public.bsh_monde_invitations;
create policy bsh_invitations_lire on public.bsh_monde_invitations for select using (auth.uid() in (de, pour));
drop policy if exists bsh_invitations_envoyer on public.bsh_monde_invitations;
create policy bsh_invitations_envoyer on public.bsh_monde_invitations for insert with check (de = auth.uid() and statut = 'envoyee' and public.bsh_adulte_autorise()
  and not public.bsh_bloque(de, pour)
  and not exists (select 1 from public.bsh_monde_avatars a where a.user_id = bsh_monde_invitations.pour and bsh_monde_invitations.categorie = any (a.invitations_refusees))
  and (select count(*) from public.bsh_monde_invitations i where i.de = auth.uid() and i.pour = bsh_monde_invitations.pour and i.created_at > now() - interval '10 minutes') < 3);
drop policy if exists bsh_invitations_repondre on public.bsh_monde_invitations;
create policy bsh_invitations_repondre on public.bsh_monde_invitations for update using (pour = auth.uid()) with check (pour = auth.uid() and statut in ('acceptee','refusee'));

-- Conversations : privées et de groupe, lisibles par leurs seuls membres.
drop policy if exists bsh_conv_lire on public.bsh_monde_conversations;
create policy bsh_conv_lire on public.bsh_monde_conversations for select using (cree_par = auth.uid() or public.bsh_conv_membre(id));
drop policy if exists bsh_conv_creer on public.bsh_monde_conversations;
create policy bsh_conv_creer on public.bsh_monde_conversations for insert with check (cree_par = auth.uid() and public.bsh_adulte_autorise());
drop policy if exists bsh_conv_membres_lire on public.bsh_monde_conversation_membres;
create policy bsh_conv_membres_lire on public.bsh_monde_conversation_membres for select using (user_id = auth.uid() or public.bsh_conv_membre(conversation_id));
drop policy if exists bsh_conv_membres_ajouter on public.bsh_monde_conversation_membres;
create policy bsh_conv_membres_ajouter on public.bsh_monde_conversation_membres for insert with check (
  exists (select 1 from public.bsh_monde_conversations c where c.id = conversation_id and c.cree_par = auth.uid())
  and (user_id = auth.uid() or (statut = 'invite' and not public.bsh_bloque(auth.uid(), user_id)
       and not exists (select 1 from public.bsh_monde_avatars a where a.user_id = bsh_monde_conversation_membres.user_id and 'groupe' = any (a.invitations_refusees)))));
drop policy if exists bsh_conv_membres_maj on public.bsh_monde_conversation_membres;
create policy bsh_conv_membres_maj on public.bsh_monde_conversation_membres for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists bsh_messages_lire on public.bsh_monde_messages;
create policy bsh_messages_lire on public.bsh_monde_messages for select using (
  (conversation_id is not null and public.bsh_conv_membre(conversation_id))
  or (salle_id is not null and public.bsh_adulte_autorise() and (not masque or public.bsh_hote_peut('moderer_public', salle_id)) and not public.bsh_bloque(auteur, auth.uid())));
drop policy if exists bsh_messages_ecrire on public.bsh_monde_messages;
create policy bsh_messages_ecrire on public.bsh_monde_messages for insert with check (auteur = auth.uid() and (
  (conversation_id is not null and public.bsh_conv_membre(conversation_id)
     and not exists (select 1 from public.bsh_monde_conversation_membres m where m.conversation_id = bsh_monde_messages.conversation_id and m.user_id <> auth.uid() and public.bsh_bloque(m.user_id, auth.uid())))
  or (salle_id is not null and public.bsh_monde_peut_entrer(salle_id))));
drop policy if exists bsh_messages_moderer on public.bsh_monde_messages;
create policy bsh_messages_moderer on public.bsh_monde_messages for update using (salle_id is not null and public.bsh_hote_peut('moderer_public', salle_id)) with check (salle_id is not null);
create or replace function public.bsh_messages_controle() returns trigger language plpgsql as $$
begin
  if (new.contenu, new.auteur, new.salle_id, new.conversation_id, new.created_at) is distinct from (old.contenu, old.auteur, old.salle_id, old.conversation_id, old.created_at) then
    raise exception 'La modération masque un message, elle ne le réécrit pas.';
  end if;
  return new;
end $$;
drop trigger if exists bsh_messages_controle on public.bsh_monde_messages;
create trigger bsh_messages_controle before update on public.bsh_monde_messages for each row execute function public.bsh_messages_controle();

-- Signalements : tout adulte autorisé signale ; la fondatrice traite tout ; un hôte « signalements_mission »
-- voit ceux des salles publiques de sa mission (jamais ceux issus d'une conversation privée).
drop policy if exists bsh_signalements_creer on public.bsh_monde_signalements;
create policy bsh_signalements_creer on public.bsh_monde_signalements for insert with check (signale_par = auth.uid() and public.bsh_adulte_autorise() and statut = 'ouvert');
drop policy if exists bsh_signalements_lire on public.bsh_monde_signalements;
create policy bsh_signalements_lire on public.bsh_monde_signalements for select using (signale_par = auth.uid() or public.is_fondatrice()
  or (not prive and salle_id is not null and public.bsh_hote_peut('signalements_mission', salle_id)));
drop policy if exists bsh_signalements_traiter on public.bsh_monde_signalements;
create policy bsh_signalements_traiter on public.bsh_monde_signalements for update using (public.is_fondatrice()
  or (not prive and salle_id is not null and public.bsh_hote_peut('signalements_mission', salle_id)))
  with check (traite_par = auth.uid());

-- Inventaire et Secret Coins : lecture de ses propres lignes ; aucune écriture directe.
drop policy if exists bsh_inventaire_lire on public.bsh_monde_inventaire;
create policy bsh_inventaire_lire on public.bsh_monde_inventaire for select using (user_id = auth.uid() or public.is_fondatrice());
drop policy if exists bsh_coins_lire on public.bsh_monde_coins;
create policy bsh_coins_lire on public.bsh_monde_coins for select using (user_id = auth.uid() or public.is_fondatrice());

create or replace function public.bsh_coins_solde(u uuid default auth.uid()) returns int language sql stable security definer set search_path = public as $$
  select case when u = auth.uid() or public.is_fondatrice() then coalesce((select sum(delta)::int from public.bsh_monde_coins where user_id = u), 0) end $$;

/** Attribution de Secret Coins : fondatrice, ou hôte « recompenser » dans la salle indiquée.
 *  Plafond par hôte : 200 coins par personne et par jour. Jamais pour soi-même. */
create or replace function public.bsh_coins_attribuer(p_user uuid, p_montant int, p_motif text, p_salle text) returns int
language plpgsql security definer set search_path = public as $$
declare deja int;
begin
  if p_user = auth.uid() then raise exception 'Impossible de s''attribuer des Secret Coins.'; end if;
  if not public.bsh_hote_peut('recompenser', p_salle) then raise exception 'Permission requise : distribuer des récompenses.'; end if;
  if p_montant is null or p_montant = 0 or abs(p_montant) > 1000 then raise exception 'Montant invalide.'; end if;
  if p_montant < 0 and not public.is_fondatrice() then raise exception 'Seule la fondatrice peut retirer des Secret Coins.'; end if;
  if coalesce(trim(p_motif), '') = '' then raise exception 'Motif obligatoire.'; end if;
  if not public.is_fondatrice() then
    select coalesce(sum(delta), 0) into deja from public.bsh_monde_coins where user_id = p_user and attribue_par = auth.uid() and created_at > now() - interval '1 day';
    if deja + p_montant > 200 then raise exception 'Plafond journalier atteint pour cette personne.'; end if;
  end if;
  insert into public.bsh_monde_coins (user_id, delta, motif, attribue_par) values (p_user, p_montant, left(p_motif, 200), auth.uid());
  return coalesce((select sum(delta)::int from public.bsh_monde_coins where user_id = p_user), 0);
end $$;
revoke all on function public.bsh_coins_attribuer(uuid, int, text, text) from public, anon;
grant execute on function public.bsh_coins_attribuer(uuid, int, text, text) to authenticated;

/** Remise d'un objet d'inventaire (récompense) : mêmes règles que les coins. Les objets exclusifs ne se donnent pas. */
create or replace function public.bsh_inventaire_donner(p_user uuid, p_objet text, p_salle text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user = auth.uid() and not public.is_fondatrice() then raise exception 'Impossible de se récompenser soi-même.'; end if;
  if not public.bsh_hote_peut('recompenser', p_salle) then raise exception 'Permission requise : distribuer des récompenses.'; end if;
  if exists (select 1 from public.bsh_monde_accessoires where id = p_objet and exclusif_fondatrice) then raise exception 'Objet exclusif de la fondatrice.'; end if;
  insert into public.bsh_monde_inventaire (user_id, objet_id) values (p_user, p_objet)
  on conflict (user_id, objet_id) do update set quantite = public.bsh_monde_inventaire.quantite + 1;
end $$;
revoke all on function public.bsh_inventaire_donner(uuid, text, text) from public, anon;
grant execute on function public.bsh_inventaire_donner(uuid, text, text) to authenticated;

-- ── 4. Temps réel : présence et diffusion autorisées (Supabase Realtime Authorization) ──
-- Canaux privés : « monde:<salle> » (adultes autorisés pouvant entrer), « club:<session> »
-- (participants admis et animateurs). Les positions et la présence ne sont pas stockées en base.
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists bsh_rt_lire on realtime.messages';
    execute $p$create policy bsh_rt_lire on realtime.messages for select to authenticated using (
      (split_part(realtime.topic(), ':', 1) = 'monde' and public.bsh_monde_peut_entrer(split_part(realtime.topic(), ':', 2)))
      or (split_part(realtime.topic(), ':', 1) = 'club' and split_part(realtime.topic(), ':', 2) ~ '^[0-9a-f-]{36}$'
          and (public.bsh_club_participant(split_part(realtime.topic(), ':', 2)::uuid)
               or public.bsh_hote_peut('animer', public.bsh_club_salle_de(split_part(realtime.topic(), ':', 2)::uuid)))))$p$;
    execute 'drop policy if exists bsh_rt_ecrire on realtime.messages';
    execute $p$create policy bsh_rt_ecrire on realtime.messages for insert to authenticated with check (
      (split_part(realtime.topic(), ':', 1) = 'monde' and public.bsh_monde_peut_entrer(split_part(realtime.topic(), ':', 2)))
      or (split_part(realtime.topic(), ':', 1) = 'club' and split_part(realtime.topic(), ':', 2) ~ '^[0-9a-f-]{36}$'
          and (public.bsh_club_participant(split_part(realtime.topic(), ':', 2)::uuid)
               or public.bsh_hote_peut('animer', public.bsh_club_salle_de(split_part(realtime.topic(), ':', 2)::uuid)))))$p$;
  end if;
end $$;

-- ── 5. Conservation ─────────────────────────────────────────
-- Messages de salle : 30 jours. Conversations privées et de groupe : 180 jours.
-- Réponses des sessions terminées : 90 jours (votes agrégés et distinctions conservés).
-- Invitations : 30 jours. Signalements traités : 1 an. Exécution manuelle ou planifiée
-- après accord (aucune planification n'est créée ici).
create or replace function public.bsh_monde_purger() returns jsonb language plpgsql security definer set search_path = public as $$
declare a int; b int; c int; d int; e int;
begin
  delete from public.bsh_monde_messages where salle_id is not null and created_at < now() - interval '30 days'; get diagnostics a = row_count;
  delete from public.bsh_monde_messages where conversation_id is not null and created_at < now() - interval '180 days'; get diagnostics b = row_count;
  delete from public.bsh_club_reponses r using public.bsh_club_sessions s where s.id = r.session_id and s.statut in ('terminee','annulee') and s.updated_at < now() - interval '90 days'; get diagnostics c = row_count;
  delete from public.bsh_monde_invitations where created_at < now() - interval '30 days'; get diagnostics d = row_count;
  delete from public.bsh_monde_signalements where statut in ('traite','classe') and created_at < now() - interval '1 year'; get diagnostics e = row_count;
  return jsonb_build_object('messages_salle', a, 'messages_prives', b, 'reponses', c, 'invitations', d, 'signalements', e);
end $$;
revoke all on function public.bsh_monde_purger() from public, anon, authenticated;

-- Aucune lecture anonyme : les rôles API n'atteignent ces tables que via la RLS ci-dessus.
revoke all on public.bsh_hotes_nominations_journal from anon;
revoke all on public.bsh_monde_coins, public.bsh_monde_inventaire from anon;
revoke insert, update, delete on public.bsh_monde_coins, public.bsh_monde_inventaire from authenticated;
