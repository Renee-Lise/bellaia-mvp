-- ═══════════════════════════════════════════════════════════
-- 0121_atelier_import_food.sql — Atelier d'import intelligent Bella'Food
-- STATUT: APPLIQUÉ le 19/11 (autorisé par la fondatrice après erreur de bouton), complément file d'attente inclus
-- (même principe que la médiathèque Bella'Events, classement alimentaire)
--  • bibliotheque_fiches : rubrique proposée / retenue (modules Food),
--    confiance, recette ou image associée proposée, lot d'import.
--  • food_import_lots : historique et reprise des imports (par espace).
--  • ia_consommation : chaque appel IA journalisé (jetons, coût estimé)
--    → quotas journaliers et suivi des coûts (aussi pour /api/chat).
-- Tout reste PRIVÉ (fondatrice / permission bibliotheque.gerer ;
-- Vil'Dor : uniquement son organisation). Ajouts uniquement.
-- ═══════════════════════════════════════════════════════════
alter table public.bibliotheque_fiches add column if not exists rubrique text;
alter table public.bibliotheque_fiches add column if not exists rubrique_proposee text;
alter table public.bibliotheque_fiches add column if not exists confiance numeric;
alter table public.bibliotheque_fiches add column if not exists type_mime text;
alter table public.bibliotheque_fiches add column if not exists dossier text;
alter table public.bibliotheque_fiches add column if not exists nom_fichier text;
alter table public.bibliotheque_fiches add column if not exists recette_proposee_id uuid references public.food_recettes(id) on delete set null;
alter table public.bibliotheque_fiches add column if not exists import_lot_id uuid;

create table if not exists public.food_import_lots (
  id uuid primary key default gen_random_uuid(),
  espace text not null default 'BELLAFOOD' check (espace in ('BELLAFOOD','VILDOR','PARTAGE')),
  organisation_id uuid references public.bellaia_organisations(id),
  cree_par uuid default auth.uid(),
  libelle text,
  total integer not null default 0, importes integer not null default 0, ignores integer not null default 0,
  erreurs integer not null default 0, analyses integer not null default 0,
  statut text not null default 'en_cours' check (statut in ('en_cours','interrompu','termine')),
  journal jsonb not null default '[]',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.food_import_lots enable row level security;

create table if not exists public.ia_consommation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, route text not null, modele text,
  jetons_entree integer not null default 0, jetons_sortie integer not null default 0,
  cout_estime_eur numeric, cible text, ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists ia_consommation_user_jour on public.ia_consommation (user_id, created_at);
alter table public.ia_consommation enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='food_import_lots' and policyname='import_lots_equipe') then
    create policy import_lots_equipe on public.food_import_lots for all to authenticated
      using (public.est_staff_bellaia() or public.a_permission('bibliotheque.gerer') or (espace='VILDOR' and organisation_id is not null and public.membre_organisation(organisation_id)))
      with check (public.est_staff_bellaia() or public.a_permission('bibliotheque.gerer') or (espace='VILDOR' and organisation_id is not null and public.membre_organisation(organisation_id)));
  end if;
  -- Consommation IA : lecture fondatrice uniquement ; écriture par le serveur (clé serveur).
  if not exists (select 1 from pg_policies where tablename='ia_consommation' and policyname='ia_conso_fondatrice') then
    create policy ia_conso_fondatrice on public.ia_consommation for select to authenticated using (public.is_fondatrice());
  end if;
end $$;

-- ── Complément (validé le 19/11 : « mettre autorisé ») ─────────────
-- File d'attente PERSISTANTE (indépendante de toute session) : chaque
-- document est un élément de file avec son état, ses tentatives et un
-- verrou de traitement (reprise automatique après interruption).
alter table public.bibliotheque_fiches add column if not exists etat text not null default 'recu';
alter table public.bibliotheque_fiches add column if not exists tentatives integer not null default 0;
alter table public.bibliotheque_fiches add column if not exists derniere_erreur text;
alter table public.bibliotheque_fiches add column if not exists verrou_le timestamptz;
alter table public.bibliotheque_fiches add column if not exists source_url text;
alter table public.bibliotheque_fiches add column if not exists texte_extrait text;
alter table public.bibliotheque_fiches add column if not exists methode text;          -- sans_ia | ia_vision | ia_texte | jsonld …
alter table public.bibliotheque_fiches add column if not exists cout_estime_eur numeric;
alter table public.bibliotheque_fiches add column if not exists taille_octets bigint;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bibliotheque_fiches_etat_valide') then
    alter table public.bibliotheque_fiches add constraint bibliotheque_fiches_etat_valide check (etat in
      ('recu','en_attente','analyse','extraite','doublon','a_classer','a_completer','a_valider','valide','erreur','suspendu'));
  end if;
end $$;
create index if not exists bibliotheque_fiches_etat on public.bibliotheque_fiches (etat, created_at);
-- Les 119 fiches Drive déjà inventoriées : en attente ; les 8 extraites : à valider.
update public.bibliotheque_fiches set etat = case when recette_id is not null or extraction is not null then 'a_valider' else 'en_attente' end where etat = 'recu';

alter table public.food_import_lots add column if not exists budget_eur numeric;
alter table public.food_import_lots add column if not exists cout_estime_eur numeric;
alter table public.food_import_lots add column if not exists cout_reel_eur numeric not null default 0;

-- Limites IA configurables (une ligne par espace) + alerte budgétaire.
create table if not exists public.ia_limites (
  espace text primary key,
  appels_jour integer not null default 200,
  budget_mensuel_eur numeric not null default 20,
  alerte_pct integer not null default 80,
  prix_entree_mtok numeric not null default 3,     -- estimation, à ajuster selon la facturation réelle
  prix_sortie_mtok numeric not null default 15,
  suspendu boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.ia_limites enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='ia_limites' and policyname='ia_limites_fondatrice') then
    create policy ia_limites_fondatrice on public.ia_limites for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
end $$;
insert into public.ia_limites (espace) values ('BELLAFOOD'), ('VILDOR'), ('GENERAL') on conflict (espace) do nothing;
