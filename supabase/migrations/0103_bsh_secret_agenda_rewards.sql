-- ═══════════════════════════════════════════════════════════
-- 0103_bsh_secret_agenda_rewards.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-17 (10 tables, RLS actif,
--   15 policies, 7 jours de programmation, 5 campagnes, statuts reporte/annule)
-- Auteur : Claude Code · Date de rédaction : 2026-11-17
-- Objet : cahier des charges « BSH SECRET AGENDA & REWARDS » (17/11).
--
-- Audit préalable (base réelle, 17/11) :
--   • bsh_communications (0 ligne) = publications : titre, contenu,
--     espace chaine/cercle/lounge, date_programmee, visuel_url,
--     lien_externe, jeu_id, statuts brouillon→publie/archive.
--     → RÉUTILISÉE et complétée (thématique, fuseau, hôte, notes
--       internes, date de publication effective, créneau, campagne,
--       série de récurrence). Statuts « reporte » et « annule » ajoutés.
--   • bsh_jeux (8 lignes) est LISIBLE PAR TOUS quand statut = publie :
--     on n'y ajoute donc PAS les questions/réponses (elles fuiteraient).
--     → nouvelle table bsh_animations (privée), reliée à bsh_jeux.
--   • bsh_hotes (2 hôtes actives), bsh_missions, bsh_checklist_items
--     (cible_type 'hote' déjà prévu) → réutilisées pour planning et
--     checklists des hôtes.
--   • bsh_evenements.categorie = 'boudoir_session' existe déjà
--     → Boudoir Sessions = ces événements (aucune table en double).
--   • bsh_playlists liée aux événements → conservée ; la bibliothèque
--     Diamond B est une table dédiée (droits de diffusion par titre).
--   • Fonctions RLS existantes : is_fondatrice(), est_hote_bsh().
--
-- Nouvelles tables : bsh_agenda_reglages, bsh_programmation_jours,
--   bsh_campagnes, bsh_sondages, bsh_sondages_votes, bsh_animations,
--   bsh_rewards_campagnes, bsh_rewards_participants, bsh_musique,
--   bsh_musique_liens.
-- Sécurité :
--   • fondatrice : tout (is_fondatrice()).
--   • hôte : lecture seule des publications et animations qui lui sont
--     attribuées (hote_id = sa fiche), jamais le reste.
--   • membre connecté : lecture des sondages natifs ouverts, vote
--     unique en son nom pendant la période, lecture de son propre vote.
--   • Rewards : participants (données personnelles) fondatrice seule.
--     Une campagne ne peut PAS passer « participation ouverte » sans les
--     3 validations (fondatrice, juridique, plateforme) — contrainte SQL.
-- Idempotent : if not exists partout, policies créées si absentes.
--   Seule instruction destructive : le remplacement de la contrainte de
--   statut de bsh_communications (section 9, exécutée à part).
-- ═══════════════════════════════════════════════════════════

-- 1. Réglages généraux de l'agenda (une seule ligne) ──────────
create table if not exists public.bsh_agenda_reglages (
  id int primary key default 1 check (id = 1),
  fuseau text not null default 'America/Cayenne',
  horaires_principaux text[] not null default array['08:00','21:00'],
  pensee_actif boolean not null default true,
  pensee_frequence_jours int not null default 2 check (pensee_frequence_jours between 1 and 14),
  pensee_heure text not null default '08:00',
  pensee_date_reference date not null default date '2026-11-16',
  updated_at timestamptz not null default now()
);
insert into public.bsh_agenda_reglages (id) values (1) on conflict (id) do nothing;

-- 2. Programmation par défaut (jour de la semaine, 0 = dimanche) ─
create table if not exists public.bsh_programmation_jours (
  jour_semaine int primary key check (jour_semaine between 0 and 6),
  thematique text not null,
  en_pause boolean not null default false,
  creneaux text[] not null default array['08:00','21:00'],
  creneaux_facultatifs text[] not null default '{}',
  note text,
  updated_at timestamptz not null default now()
);
insert into public.bsh_programmation_jours (jour_semaine, thematique, en_pause, creneaux, creneaux_facultatifs, note) values
  (1, 'Mystérieux', false, array['08:00','21:00'], array['12:30','18:00'], null),
  (2, 'Joueuse',    false, array['08:00','21:00'], array['12:30','18:00'], null),
  (3, 'Audacieux',  false, array['08:00','21:00'], array['12:30','18:00'], null),
  (4, 'Complice',   false, array['08:00','21:00'], array['12:30','18:00'], null),
  (5, 'Élégance',   false, array['08:00','21:00'], array['12:30','18:00'], null),
  (6, 'Pause',      true,  array[]::text[],        array['20:00'],         'Réouverture facultative à 20 h'),
  (0, 'Douceur',    false, array['08:00','21:00'], array['12:30','18:00'], null)
on conflict (jour_semaine) do nothing;

-- 3. Campagnes saisonnières ───────────────────────────────────
create table if not exists public.bsh_campagnes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  saison text not null default 'autre' check (saison in ('noel','saint_valentin','paques','toussaint','anniversaire_bsh','autre')),
  description text,
  date_debut date,
  date_fin date,
  date_cible timestamptz,               -- compte à rebours
  recurrence_annuelle boolean not null default true,
  couleur_principale text default '#5c1522',
  couleur_secondaire text default '#c6a15b',
  visuel_url text,
  statut text not null default 'brouillon' check (statut in ('brouillon','preparation','active','terminee','archivee')),
  notes_internes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.bsh_campagnes (nom, saison, description, date_debut, date_fin, date_cible, statut)
select v.nom, v.saison, v.description, v.d1, v.d2, v.cible, 'brouillon'
from (values
  ('Noël BSH',            'noel',            'Campagne de Noël',               date '2026-12-01', date '2026-12-26', timestamptz '2026-12-25 00:00-03'),
  ('Saint-Valentin BSH',  'saint_valentin',  'Campagne de la Saint-Valentin',  date '2027-02-01', date '2027-02-15', timestamptz '2027-02-14 00:00-03'),
  ('Pâques BSH',          'paques',          'Campagne de Pâques',             date '2027-03-15', date '2027-03-29', timestamptz '2027-03-28 00:00-03'),
  ('Toussaint BSH',       'toussaint',       'Campagne de la Toussaint',       date '2027-10-20', date '2027-11-02', timestamptz '2027-11-01 00:00-03'),
  ('Anniversaire de BSH', 'anniversaire_bsh','Date à confirmer par la fondatrice', null, null, null)
) as v(nom, saison, description, d1, d2, cible)
where not exists (select 1 from public.bsh_campagnes c where c.saison = v.saison);

-- 4. Publications : extension de bsh_communications ───────────
alter table public.bsh_communications
  add column if not exists thematique text,
  add column if not exists fuseau text not null default 'America/Cayenne',
  add column if not exists hote_id uuid references public.bsh_hotes(id) on delete set null,
  add column if not exists notes_internes text,
  add column if not exists date_publication_effective timestamptz,
  add column if not exists creneau text,
  add column if not exists campagne_id uuid references public.bsh_campagnes(id) on delete set null,
  add column if not exists serie_id uuid,
  add column if not exists recurrence jsonb,
  add column if not exists rappel_le timestamptz,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists bsh_communications_date_idx on public.bsh_communications(date_programmee);
create index if not exists bsh_communications_hote_idx on public.bsh_communications(hote_id);

-- 5. Sondages ─────────────────────────────────────────────────
create table if not exists public.bsh_sondages (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  choix jsonb not null default '[]'::jsonb,         -- [{ "id": "a", "libelle": "…" }]
  choix_multiple boolean not null default false,
  date_debut timestamptz,
  date_fin timestamptz,
  destination text not null default 'chaine' check (destination in ('chaine','cercle','lounge','bellaia')),
  source text not null default 'whatsapp' check (source in ('whatsapp','natif')),
  statut text not null default 'brouillon' check (statut in ('brouillon','programme','actif','clos','archive')),
  resultats_manuels jsonb not null default '{}'::jsonb, -- { "a": 12, "b": 5 } (saisie WhatsApp)
  participants_manuels int,
  communication_id uuid references public.bsh_communications(id) on delete set null,
  campagne_id uuid references public.bsh_campagnes(id) on delete set null,
  hote_id uuid references public.bsh_hotes(id) on delete set null,
  notes_internes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.bsh_sondages_votes (
  id uuid primary key default gen_random_uuid(),
  sondage_id uuid not null references public.bsh_sondages(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  choix text[] not null,
  created_at timestamptz not null default now(),
  unique (sondage_id, user_id)
);

-- 6. Jeux et animations (contenu privé, relié à bsh_jeux) ──────
create table if not exists public.bsh_animations (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text not null default 'quiz' check (categorie in ('quiz','enigme','jeu_musical','defi_collectif','complicite','enquete','saisonniere')),
  regles text,
  difficulte text not null default 'moyen' check (difficulte in ('facile','moyen','difficile','expert')),
  duree_minutes int,
  participants_min int,
  participants_max int,
  questions jsonb not null default '[]'::jsonb,     -- [{ "question": "…", "reponse": "…", "points": 1 }]
  points_actifs boolean not null default false,
  jeu_id uuid references public.bsh_jeux(id) on delete set null,
  hote_id uuid references public.bsh_hotes(id) on delete set null,
  campagne_id uuid references public.bsh_campagnes(id) on delete set null,
  date_prevue timestamptz,
  espace text check (espace in ('chaine','cercle','lounge','evenement')),
  statut text not null default 'brouillon' check (statut in ('brouillon','a_valider','valide','programme','realise','archive')),
  notes_internes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bsh_animations_date_idx on public.bsh_animations(date_prevue);

-- 7. BSH Rewards ──────────────────────────────────────────────
create table if not exists public.bsh_rewards_campagnes (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text,
  reglement text,
  conditions_eligibilite text,
  date_debut timestamptz,
  date_cloture timestamptz,
  lots jsonb not null default '[]'::jsonb,           -- [{ "libelle": "…", "quantite": 1, "valeur": 0 }]
  quantite_disponible int,
  budget numeric,
  statut text not null default 'brouillon' check (statut in ('brouillon','en_verification','validee','active','cloturee','annulee')),
  validation_fondatrice boolean not null default false,
  validation_juridique boolean not null default false,
  validation_juridique_note text,
  validation_plateforme boolean not null default false,
  validation_plateforme_note text,
  participation_ouverte boolean not null default false,
  campagne_id uuid references public.bsh_campagnes(id) on delete set null,
  notes_internes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bsh_rewards_ouverture_validee check (
    (participation_ouverte = false and statut <> 'active')
    or (validation_fondatrice and validation_juridique and validation_plateforme)
  )
);
create table if not exists public.bsh_rewards_participants (
  id uuid primary key default gen_random_uuid(),
  campagne_id uuid not null references public.bsh_rewards_campagnes(id) on delete cascade,
  pseudo text not null,
  contact text,
  user_id uuid,
  date_participation timestamptz not null default now(),
  eligible boolean,
  gagnant boolean not null default false,
  lot text,
  statut_remise text not null default 'non_concerne' check (statut_remise in ('non_concerne','a_remettre','remis','refuse')),
  date_remise timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- 8. Diamond B — bibliothèque musicale ────────────────────────
create table if not exists public.bsh_musique (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  artiste text not null default 'Diamond B',
  lien_ecoute text,
  ambiance text,
  duree_secondes int,
  autorisation_diffusion text not null default 'a_verifier' check (autorisation_diffusion in ('a_verifier','autorisee','refusee')),
  autorisation_note text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.bsh_musique_liens (
  id uuid primary key default gen_random_uuid(),
  musique_id uuid not null references public.bsh_musique(id) on delete cascade,
  cible_type text not null check (cible_type in ('campagne','animation','evenement')),
  cible_id uuid not null,
  created_at timestamptz not null default now(),
  unique (musique_id, cible_type, cible_id)
);

-- RLS ─────────────────────────────────────────────────────────
alter table public.bsh_agenda_reglages enable row level security;
alter table public.bsh_programmation_jours enable row level security;
alter table public.bsh_campagnes enable row level security;
alter table public.bsh_sondages enable row level security;
alter table public.bsh_sondages_votes enable row level security;
alter table public.bsh_animations enable row level security;
alter table public.bsh_rewards_campagnes enable row level security;
alter table public.bsh_rewards_participants enable row level security;
alter table public.bsh_musique enable row level security;
alter table public.bsh_musique_liens enable row level security;

do $$
declare t text;
begin
  -- Fondatrice : accès complet à toutes les nouvelles tables
  foreach t in array array['bsh_agenda_reglages','bsh_programmation_jours','bsh_campagnes','bsh_sondages','bsh_sondages_votes','bsh_animations','bsh_rewards_campagnes','bsh_rewards_participants','bsh_musique','bsh_musique_liens'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_fondatrice') then
      execute format('create policy %I on public.%I for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice())', t||'_fondatrice', t);
    end if;
  end loop;

  -- Hôte : uniquement les publications qui lui sont attribuées
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bsh_communications' and policyname='bsh_communications_hote_attribuee') then
    create policy bsh_communications_hote_attribuee on public.bsh_communications for select to authenticated
      using (hote_id is not null and hote_id in (select h.id from public.bsh_hotes h where h.profile_id = auth.uid() and h.statut = 'active'));
  end if;
  -- Hôte : uniquement les animations qui lui sont attribuées
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bsh_animations' and policyname='bsh_animations_hote_attribuee') then
    create policy bsh_animations_hote_attribuee on public.bsh_animations for select to authenticated
      using (hote_id is not null and hote_id in (select h.id from public.bsh_hotes h where h.profile_id = auth.uid() and h.statut = 'active'));
  end if;
  -- Membre connecté : sondages natifs ouverts
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bsh_sondages' and policyname='bsh_sondages_natifs_lecture') then
    create policy bsh_sondages_natifs_lecture on public.bsh_sondages for select to authenticated
      using (source = 'natif' and statut in ('actif','clos'));
  end if;
  -- Membre connecté : un vote, en son nom, pendant la période d'ouverture
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bsh_sondages_votes' and policyname='bsh_sondages_votes_membre_insert') then
    create policy bsh_sondages_votes_membre_insert on public.bsh_sondages_votes for insert to authenticated
      with check (user_id = auth.uid() and exists (
        select 1 from public.bsh_sondages s where s.id = sondage_id and s.source = 'natif' and s.statut = 'actif'
          and (s.date_debut is null or s.date_debut <= now()) and (s.date_fin is null or s.date_fin > now())));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bsh_sondages_votes' and policyname='bsh_sondages_votes_membre_lecture') then
    create policy bsh_sondages_votes_membre_lecture on public.bsh_sondages_votes for select to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- Résultats agrégés d'un sondage natif (sans exposer qui a voté quoi)
create or replace function public.bsh_sondage_resultats(p_sondage uuid)
returns table (choix text, nb bigint, participants bigint)
language sql stable security definer set search_path = public as $$
  select c.choix, count(*) as nb, (select count(*) from public.bsh_sondages_votes v2 where v2.sondage_id = p_sondage) as participants
  from public.bsh_sondages_votes v, unnest(v.choix) as c(choix)
  where v.sondage_id = p_sondage
    and exists (select 1 from public.bsh_sondages s where s.id = p_sondage and (public.is_fondatrice() or (s.source = 'natif' and s.statut in ('actif','clos'))))
  group by c.choix;
$$;
grant execute on function public.bsh_sondage_resultats(uuid) to authenticated;

-- 9. (exécuté à part — seule instruction destructive) ─────────
-- Ajout des statuts « reporte » et « annule » aux publications,
-- en conservant tous les statuts existants.
alter table public.bsh_communications drop constraint if exists bsh_communications_statut_check,
  add constraint bsh_communications_statut_check
  check (statut in ('brouillon','en_attente','valide','programme','pret','publie','reporte','annule','archive'));
