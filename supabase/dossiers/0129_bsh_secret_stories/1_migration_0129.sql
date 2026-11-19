-- ═══════════════════════════════════════════════════════════
-- 0129_bsh_secret_stories.sql
-- STATUT: PRÉPARÉE — NON APPLIQUÉE (accord de la fondatrice requis)
-- Auteur : Claude Code · Date de rédaction : 2026-11-19
-- Objet : BSH Secret Stories — studio éditorial privé (fondatrice et
--   collaborateurs expressément autorisés) + bibliothèque cliente adulte
--   (découverte gratuite, achat individuel, abonnement).
--
-- ⚠️ Le dépôt GitHub est PUBLIC : AUCUN texte, titre ni média d'ouvrage
--   n'est dans ce fichier ni dans le code. Tout est saisi dans l'application.
--
-- Ne modifie AUCUNE table existante. Additive et réversible
--   (rollback/0129_bsh_secret_stories_rollback.sql).
--
-- Sécurité (contrôlée en base, jamais seulement à l'écran) :
--   • Studio : is_fondatrice() ou permission « secret_stories.studio » (univers
--     BSH) accordée MANUELLEMENT par la fondatrice. Aucune attribution ici.
--   • Manuscrits privés par défaut ; un ouvrage n'est visible des clientes que
--     s'il est « publie » ET validé par la fondatrice (trigger).
--   • Clientes : uniquement via les fonctions ss_* ; adulte = âge vérifié
--     (profiles.age_verifi) ET date de naissance ≥ 18 ans. Mineure, âge
--     inconnu, visiteur : rien n'est renvoyé, pas même le catalogue.
--   • Extraits : textes et fichiers audio DISTINCTS de l'ouvrage (copie du
--     passage choisi, fichier d'extrait séparé) : un extrait ne donne jamais
--     accès au fichier intégral.
--   • Droits = achats CONFIRMÉS (permanents, par format exact) + abonnement
--     ACTIF (contenus inclus de la formule, calculés à la volée). À
--     l'expiration ou la résiliation, seuls les droits d'abonnement tombent.
--   • Confirmation d'achat / activation d'abonnement : fondatrice seule
--     (aucun prestataire de paiement branché). Renouvellement automatique
--     interdit tant que la fondatrice ne l'a pas validé (contrainte).
--   • Tarifs, offres, formules : « brouillon » par défaut.
--   • Progression, marque-pages, notes, surlignages : visibles de la
--     cliente SEULE (pas même de la fondatrice) : habitudes de lecture privées.
--   • Traductions : studio ; droits (contrats, cessions) : fondatrice seule.
--   • Fichiers : bucket PRIVÉ « secret-stories-prive », lecture via URL
--     signée courte, autorisée seulement si la personne détient le droit.
--   • IA / audio : file de génération persistante ; toute génération payante
--     exige un coût estimé et l'approbation de la fondatrice (trigger) ;
--     quota mensuel ; une voix réelle ne peut être clonée sans autorisation
--     écrite enregistrée.
--   • Aucune publication, aucun paiement, aucun abonnement automatiques.
-- ═══════════════════════════════════════════════════════════

-- ── Accès ──────────────────────────────────────────────────
create or replace function public.ss_studio() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_fondatrice() or public.a_permission('secret_stories.studio', 'BSH');
$$;

create or replace function public.ss_est_adulte() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.profiles p
    where p.id = auth.uid() and p.age_verifi is true and p.date_naissance is not null
      and p.date_naissance <= (current_date - interval '18 years')::date);
$$;

-- ── Collections et sagas ───────────────────────────────────
create table if not exists public.ss_collections (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'collection' check (type in ('collection', 'saga', 'coffret')),
  titre text not null,
  description text,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'publie', 'archive')),
  exclusive_abonnes boolean not null default false,
  couverture_chemin text,
  cree_par uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Ouvrages ───────────────────────────────────────────────
create table if not exists public.ss_oeuvres (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  sous_titre text,
  type text not null default 'roman' check (type in ('roman', 'nouvelle', 'tome_saga', 'recueil')),
  collection_id uuid references public.ss_collections(id) on delete set null,
  numero_dans_collection int,
  origine text not null default 'idee' check (origine in ('idee', 'synopsis', 'import', 'manuscrit')),
  -- genre, ambiance, point de vue, longueur, nb de chapitres, style littéraire
  parametres jsonb not null default '{}'::jsonb,
  public_adulte boolean not null default true check (public_adulte),
  synopsis text,
  avertissements text[] not null default '{}',
  memoire jsonb not null default '{}'::jsonb,            -- mémoire narrative (lieux, faits, règles)
  statut text not null default 'brouillon' check (statut in ('brouillon', 'ecriture', 'relecture', 'pret', 'publie', 'archive')),
  prive boolean not null default true,
  couverture_chemin text,
  couverture_validee boolean not null default false,
  nb_mots int, duree_audio_s int,
  date_publication timestamptz, valide_par uuid, valide_le timestamptz,
  acces_anticipe_jusqua timestamptz,                      -- réservé aux abonnés jusqu'à cette date
  cree_par uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Publication : jamais automatique ; seule la fondatrice publie, avec validation horodatée.
create or replace function public.ss_garde_publication() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.statut = 'publie' and (tg_op = 'INSERT' or old.statut is distinct from 'publie') then
    if not public.is_fondatrice() then raise exception 'Publication réservée à la fondatrice'; end if;
    new.valide_par := auth.uid(); new.valide_le := now(); new.prive := false;
    new.date_publication := coalesce(new.date_publication, now());
  end if;
  if new.statut <> 'publie' then new.prive := true; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists ss_garde_publication on public.ss_oeuvres;
create trigger ss_garde_publication before insert or update on public.ss_oeuvres for each row execute function public.ss_garde_publication();

-- ── Chapitres + versions (sauvegardes automatiques) ────────
create table if not exists public.ss_chapitres (
  id uuid primary key default gen_random_uuid(),
  oeuvre_id uuid not null references public.ss_oeuvres(id) on delete cascade,
  ordre int not null,
  titre text,
  texte text not null default '',
  statut text not null default 'brouillon' check (statut in ('brouillon', 'a_relire', 'valide')),
  version int not null default 1,
  nb_mots int generated always as (coalesce(array_length(regexp_split_to_array(nullif(trim(texte), ''), '\s+'), 1), 0)) stored,
  narration jsonb not null default '{}'::jsonb,           -- voix, émotions, rythme, pauses, prononciations
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (oeuvre_id, ordre)
);

create table if not exists public.ss_chapitres_versions (
  id uuid primary key default gen_random_uuid(),
  chapitre_id uuid not null references public.ss_chapitres(id) on delete cascade,
  version int not null,
  titre text, texte text not null,
  source text not null default 'manuelle' check (source in ('manuelle', 'autosauvegarde', 'ia', 'import', 'restauration')),
  auteur uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (chapitre_id, version)
);

-- Chaque modification du texte archive l'état précédent (aucune perte).
create or replace function public.ss_versionner_chapitre() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.texte is distinct from old.texte or new.titre is distinct from old.titre then
    insert into public.ss_chapitres_versions (chapitre_id, version, titre, texte, source, auteur)
    values (old.id, old.version, old.titre, old.texte, 'autosauvegarde', auth.uid()) on conflict (chapitre_id, version) do nothing;
    new.version := old.version + 1;
  end if;
  new.updated_at := now(); new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists ss_versionner_chapitre on public.ss_chapitres;
create trigger ss_versionner_chapitre before update on public.ss_chapitres for each row execute function public.ss_versionner_chapitre();

-- ── Personnages, relations, chronologie ────────────────────
create table if not exists public.ss_personnages (
  id uuid primary key default gen_random_uuid(),
  oeuvre_id uuid references public.ss_oeuvres(id) on delete cascade,
  collection_id uuid references public.ss_collections(id) on delete cascade,
  nom text not null, role text, description text,
  presentation_publique text,                              -- texte montré en découverte gratuite (facultatif)
  relations jsonb not null default '[]'::jsonb,            -- [{personnage_id, nature, evolution}]
  voix jsonb not null default '{}'::jsonb,                 -- voix de narration choisie (synthétique)
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  check (oeuvre_id is not null or collection_id is not null)
);

create table if not exists public.ss_chronologie (
  id uuid primary key default gen_random_uuid(),
  oeuvre_id uuid references public.ss_oeuvres(id) on delete cascade,
  collection_id uuid references public.ss_collections(id) on delete cascade,
  ordre int not null default 0,
  moment text, evenement text not null, lieu text,
  personnages uuid[] not null default '{}',
  chapitre_id uuid references public.ss_chapitres(id) on delete set null,
  created_at timestamptz not null default now(),
  check (oeuvre_id is not null or collection_id is not null)
);

-- ── Traductions (œuvre entière ou chapitre) ───────────────
create table if not exists public.ss_traductions (
  id uuid primary key default gen_random_uuid(),
  oeuvre_id uuid not null references public.ss_oeuvres(id) on delete cascade,
  chapitre_id uuid references public.ss_chapitres(id) on delete cascade,   -- null = titre / synopsis de l'œuvre
  langue text not null check (langue ~ '^[a-z]{2}(-[A-Z]{2})?$'),          -- ex. en, es, pt-BR
  titre text, synopsis text, texte text,
  origine text not null default 'humaine' check (origine in ('humaine', 'ia_relue', 'ia')),
  traducteur text,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'relecture', 'valide')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (oeuvre_id, chapitre_id, langue)
);

-- ── Droits (auteur, traduction, audio, illustration, voix, adaptation) ──
create table if not exists public.ss_droits (
  id uuid primary key default gen_random_uuid(),
  oeuvre_id uuid references public.ss_oeuvres(id) on delete cascade,
  collection_id uuid references public.ss_collections(id) on delete cascade,
  nature text not null check (nature in ('auteur', 'traduction', 'audio', 'illustration', 'couverture', 'voix', 'adaptation', 'autre')),
  titulaire text not null,
  cession text,                                            -- étendue des droits cédés ou concédés
  territoire text, langues text[], debut date, fin date,
  remuneration text,                                       -- texte libre (pourcentage, forfait…) ; aucun paiement ici
  document_chemin text,                                    -- contrat signé (bucket privé)
  statut text not null default 'a_verifier' check (statut in ('a_verifier', 'valide', 'expire', 'litige')),
  created_at timestamptz not null default now(),
  check (oeuvre_id is not null or collection_id is not null)
);

-- ── Extraits gratuits (copies distinctes, jamais l'intégral) ──
create table if not exists public.ss_extraits (
  id uuid primary key default gen_random_uuid(),
  oeuvre_id uuid not null references public.ss_oeuvres(id) on delete cascade,
  type text not null check (type in ('texte', 'audio')),
  mode text not null default 'personnalise' check (mode in ('pages', 'chapitre', 'duree_audio', 'personnalise')),
  reglage jsonb not null default '{}'::jsonb,              -- {pages:n} | {chapitre_id} | {debut_s, duree_s} | {}
  texte text,                                              -- passage copié, choisi par la fondatrice
  audio_chemin text,                                       -- fichier d'extrait SÉPARÉ (dossier extraits/)
  statut text not null default 'brouillon' check (statut in ('brouillon', 'publie')),
  created_at timestamptz not null default now(),
  check ((type = 'texte' and texte is not null) or (type = 'audio' and audio_chemin is not null)),
  check (audio_chemin is null or audio_chemin like 'extraits/%')
);

-- ── Fichiers des ouvrages (bucket privé) ───────────────────
create table if not exists public.ss_fichiers (
  id uuid primary key default gen_random_uuid(),
  oeuvre_id uuid not null references public.ss_oeuvres(id) on delete cascade,
  format text not null check (format in ('ebook', 'audio')),
  type_fichier text not null check (type_fichier in ('epub', 'pdf', 'audio_chapitre', 'audio_complet')),
  chapitre_id uuid references public.ss_chapitres(id) on delete set null,
  chemin text not null unique check (chemin like 'oeuvres/%'),
  taille_octets bigint, sha256 text, duree_s int,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'valide')),
  created_at timestamptz not null default now()
);

-- ── Offres, formules, contenus des formules (tarifs en brouillon) ──
create table if not exists public.ss_offres (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('ebook', 'audio', 'pack', 'nouvelle', 'saga', 'coffret')),
  oeuvre_id uuid references public.ss_oeuvres(id) on delete cascade,
  collection_id uuid references public.ss_collections(id) on delete cascade,
  formats text[] not null check (formats <@ array['ebook', 'audio']::text[] and cardinality(formats) > 0),
  libelle text,
  prix_centimes int check (prix_centimes is null or prix_centimes >= 0),
  prix_promo_centimes int, promo_debut timestamptz, promo_fin timestamptz,
  remise_membres_pct numeric(5,2) check (remise_membres_pct is null or remise_membres_pct between 0 and 100),
  statut text not null default 'brouillon' check (statut in ('brouillon', 'valide', 'publie', 'archive')),
  valide_par uuid, valide_le timestamptz,
  created_at timestamptz not null default now(),
  check (oeuvre_id is not null or collection_id is not null)
);

create table if not exists public.ss_codes_promo (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, description text,
  remise_pct numeric(5,2), remise_centimes int,
  debut timestamptz, fin timestamptz, utilisations_max int,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'actif', 'archive')),
  created_at timestamptz not null default now()
);

create table if not exists public.ss_formules (
  id uuid primary key default gen_random_uuid(),
  libelle text not null,
  periodicite text not null check (periodicite in ('mensuel', 'annuel')),
  prix_centimes int,
  integre_bsh_members boolean not null default false,
  acces_anticipe boolean not null default false,
  avantages jsonb not null default '[]'::jsonb,
  renouvellement_auto_valide boolean not null default false,   -- validation fondatrice préalable
  statut text not null default 'brouillon' check (statut in ('brouillon', 'valide', 'publie', 'archive')),
  created_at timestamptz not null default now()
);

create table if not exists public.ss_formules_contenus (
  formule_id uuid not null references public.ss_formules(id) on delete cascade,
  oeuvre_id uuid references public.ss_oeuvres(id) on delete cascade,
  collection_id uuid references public.ss_collections(id) on delete cascade,
  formats text[] not null default array['ebook', 'audio'],
  inclus boolean not null default true,                    -- false = exclu explicitement
  check (oeuvre_id is not null or collection_id is not null),
  unique (formule_id, oeuvre_id, collection_id)
);

-- ── Achats et abonnements (confirmés par la fondatrice seule) ──
create table if not exists public.ss_achats (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid(),
  offre_id uuid not null references public.ss_offres(id),
  formats text[] not null,                                 -- copie figée des formats acquis
  oeuvres uuid[] not null default '{}',                    -- copie figée des ouvrages couverts
  montant_centimes int,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'confirme', 'rembourse', 'annule')),
  reference_paiement text,
  confirme_par uuid, confirme_le timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ss_abonnements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid(),
  formule_id uuid not null references public.ss_formules(id),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'actif', 'expire', 'resilie')),
  debut timestamptz, fin timestamptz,
  renouvellement_auto boolean not null default false,
  active_par uuid, active_le timestamptz,
  created_at timestamptz not null default now()
);

-- Une cliente ne crée que des demandes « en attente » à son nom ; la fondatrice confirme.
create or replace function public.ss_garde_commerce() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_fondatrice() then
    if tg_table_name = 'ss_achats' and new.statut = 'confirme' and (tg_op = 'INSERT' or old.statut <> 'confirme') then
      new.confirme_par := auth.uid(); new.confirme_le := now();
    end if;
    if tg_table_name = 'ss_abonnements' then
      if new.statut = 'actif' and (tg_op = 'INSERT' or old.statut <> 'actif') then new.active_par := auth.uid(); new.active_le := now(); new.debut := coalesce(new.debut, now()); end if;
      if new.renouvellement_auto and not exists (select 1 from public.ss_formules f where f.id = new.formule_id and f.renouvellement_auto_valide) then
        raise exception 'Renouvellement automatique non validé pour cette formule';
      end if;
    end if;
    return new;
  end if;
  if tg_op <> 'INSERT' then raise exception 'Modification réservée à la fondatrice'; end if;
  if new.client_id is distinct from auth.uid() then raise exception 'Demande au nom d''une autre personne refusée'; end if;
  if not public.ss_est_adulte() then raise exception 'Espace réservé aux adultes vérifiés'; end if;
  new.statut := 'en_attente';
  if tg_table_name = 'ss_achats' then
    new.confirme_par := null; new.confirme_le := null;
    select o.formats, case when o.oeuvre_id is not null then array[o.oeuvre_id]
             else coalesce((select array_agg(x.id) from public.ss_oeuvres x where x.collection_id = o.collection_id and x.statut = 'publie'), '{}') end,
           coalesce(o.prix_promo_centimes, o.prix_centimes)
      into new.formats, new.oeuvres, new.montant_centimes
      from public.ss_offres o where o.id = new.offre_id and o.statut = 'publie';
    if new.formats is null then raise exception 'Offre indisponible'; end if;
  else
    new.active_par := null; new.active_le := null; new.renouvellement_auto := false; new.debut := null; new.fin := null;
    if not exists (select 1 from public.ss_formules f where f.id = new.formule_id and f.statut = 'publie') then raise exception 'Formule indisponible'; end if;
  end if;
  return new;
end $$;
drop trigger if exists ss_garde_achats on public.ss_achats;
create trigger ss_garde_achats before insert or update on public.ss_achats for each row execute function public.ss_garde_commerce();
drop trigger if exists ss_garde_abonnements on public.ss_abonnements;
create trigger ss_garde_abonnements before insert or update on public.ss_abonnements for each row execute function public.ss_garde_commerce();

-- ── Lecture privée de la cliente (invisible de tous les autres) ──
create table if not exists public.ss_lecture (
  client_id uuid not null default auth.uid(),
  oeuvre_id uuid not null references public.ss_oeuvres(id) on delete cascade,
  format text not null check (format in ('ebook', 'audio')),
  position jsonb not null default '{}'::jsonb,             -- {chapitre, pourcentage} | {fichier, seconde}
  marque_pages jsonb not null default '[]'::jsonb,
  surlignages jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,          -- thème, taille de police, vitesse
  updated_at timestamptz not null default now(),
  primary key (client_id, oeuvre_id, format)
);

-- ── File de génération IA / audio / couvertures ────────────
create table if not exists public.ss_generations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('texte', 'reecriture', 'correction', 'audio', 'couverture')),
  oeuvre_id uuid references public.ss_oeuvres(id) on delete cascade,
  chapitre_id uuid references public.ss_chapitres(id) on delete set null,
  fournisseur text,
  parametres jsonb not null default '{}'::jsonb,
  payante boolean not null default true,
  cout_estime_centimes int,
  cout_reel_centimes int,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'approuvee', 'en_cours', 'terminee', 'erreur', 'annulee')),
  approuve_par uuid, approuve_le timestamptz,
  tentatives int not null default 0, derniere_erreur text, reprise_depuis jsonb,
  resultat jsonb,
  demande_par uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ss_quotas (
  mois date primary key,                                   -- 1er du mois
  plafond_centimes int not null default 0,                 -- 0 = aucune dépense autorisée
  note text
);

create table if not exists public.ss_voix_autorisations (
  id uuid primary key default gen_random_uuid(),
  personne text not null,                                  -- personne dont la voix serait reproduite
  document_chemin text not null,                           -- autorisation écrite (bucket privé)
  portee text, expire_le date,
  valide_par uuid default auth.uid(), created_at timestamptz not null default now()
);

-- Aucune génération payante sans coût estimé, approbation de la fondatrice et quota suffisant ;
-- aucune voix clonée sans autorisation enregistrée.
create or replace function public.ss_garde_generation() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_plafond int; v_engage int;
begin
  new.updated_at := now();
  if (new.parametres ->> 'voix_clonee') is not null
     and not exists (select 1 from public.ss_voix_autorisations a where a.id::text = new.parametres ->> 'voix_autorisation_id' and (a.expire_le is null or a.expire_le >= current_date)) then
    raise exception 'Voix réelle : autorisation écrite requise';
  end if;
  if new.payante and new.statut in ('approuvee', 'en_cours', 'terminee') and (tg_op = 'INSERT' or old.statut not in ('approuvee', 'en_cours', 'terminee')) then
    if not public.is_fondatrice() then raise exception 'Approbation de la fondatrice requise'; end if;
    if new.cout_estime_centimes is null then raise exception 'Coût estimé requis avant toute génération payante'; end if;
    select plafond_centimes into v_plafond from public.ss_quotas where mois = date_trunc('month', now())::date;
    select coalesce(sum(coalesce(cout_reel_centimes, cout_estime_centimes)), 0) into v_engage from public.ss_generations
      where id <> new.id and payante and statut in ('approuvee', 'en_cours', 'terminee') and date_trunc('month', created_at) = date_trunc('month', now());
    if coalesce(v_plafond, 0) < v_engage + new.cout_estime_centimes then raise exception 'Quota mensuel IA insuffisant'; end if;
    new.approuve_par := auth.uid(); new.approuve_le := now();
  end if;
  return new;
end $$;
drop trigger if exists ss_garde_generation on public.ss_generations;
create trigger ss_garde_generation before insert or update on public.ss_generations for each row execute function public.ss_garde_generation();

-- ── RLS ────────────────────────────────────────────────────
alter table public.ss_collections enable row level security;
alter table public.ss_oeuvres enable row level security;
alter table public.ss_chapitres enable row level security;
alter table public.ss_chapitres_versions enable row level security;
alter table public.ss_personnages enable row level security;
alter table public.ss_chronologie enable row level security;
alter table public.ss_extraits enable row level security;
alter table public.ss_fichiers enable row level security;
alter table public.ss_offres enable row level security;
alter table public.ss_codes_promo enable row level security;
alter table public.ss_formules enable row level security;
alter table public.ss_formules_contenus enable row level security;
alter table public.ss_achats enable row level security;
alter table public.ss_abonnements enable row level security;
alter table public.ss_lecture enable row level security;
alter table public.ss_generations enable row level security;
alter table public.ss_quotas enable row level security;
alter table public.ss_voix_autorisations enable row level security;
alter table public.ss_traductions enable row level security;
alter table public.ss_droits enable row level security;

do $$ declare t text; begin
  -- Contenu éditorial : studio (fondatrice + collaborateurs autorisés)
  foreach t in array array['ss_collections', 'ss_oeuvres', 'ss_chapitres', 'ss_personnages', 'ss_chronologie', 'ss_extraits', 'ss_fichiers', 'ss_generations', 'ss_traductions'] loop
    execute format('drop policy if exists %I on public.%I', t || '_studio', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.ss_studio()) with check (public.ss_studio())', t || '_studio', t);
  end loop;
  -- Historique des versions : lecture studio, jamais modifié ni supprimé à la main
  drop policy if exists ss_chapitres_versions_lecture on public.ss_chapitres_versions;
  create policy ss_chapitres_versions_lecture on public.ss_chapitres_versions for select to authenticated using (public.ss_studio());
  -- Commerce, quotas, voix : fondatrice seule
  foreach t in array array['ss_offres', 'ss_codes_promo', 'ss_formules', 'ss_formules_contenus', 'ss_quotas', 'ss_voix_autorisations', 'ss_droits'] loop
    execute format('drop policy if exists %I on public.%I', t || '_fondatrice', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice())', t || '_fondatrice', t);
  end loop;
  -- Achats / abonnements : la cliente voit et demande les siens ; la fondatrice gère
  foreach t in array array['ss_achats', 'ss_abonnements'] loop
    execute format('drop policy if exists %I on public.%I', t || '_fondatrice', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice())', t || '_fondatrice', t);
    execute format('drop policy if exists %I on public.%I', t || '_moi_lecture', t);
    execute format('create policy %I on public.%I for select to authenticated using (client_id = auth.uid())', t || '_moi_lecture', t);
    execute format('drop policy if exists %I on public.%I', t || '_moi_demande', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (client_id = auth.uid())', t || '_moi_demande', t);
  end loop;
  -- Lecture privée : la cliente uniquement (aucune politique pour la fondatrice)
  drop policy if exists ss_lecture_moi on public.ss_lecture;
  create policy ss_lecture_moi on public.ss_lecture for all to authenticated using (client_id = auth.uid() and public.ss_est_adulte()) with check (client_id = auth.uid() and public.ss_est_adulte());
end $$;

revoke all on public.ss_collections, public.ss_oeuvres, public.ss_chapitres, public.ss_chapitres_versions, public.ss_personnages, public.ss_chronologie,
  public.ss_extraits, public.ss_fichiers, public.ss_offres, public.ss_codes_promo, public.ss_formules, public.ss_formules_contenus, public.ss_achats,
  public.ss_abonnements, public.ss_lecture, public.ss_generations, public.ss_quotas, public.ss_voix_autorisations, public.ss_traductions, public.ss_droits from anon;

-- ── Droits calculés ────────────────────────────────────────
-- Un ouvrage est « visible clientes » s'il est publié, validé, non privé.
create or replace function public.ss_oeuvre_visible(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ss_oeuvres o where o.id = p and o.statut = 'publie' and not o.prive and o.valide_le is not null);
$$;

-- Droits de la personne connectée : (ouvrage, format, origine).
create or replace function public.ss_droits_de(p_client uuid)
returns table (oeuvre_id uuid, format text, origine text)
language sql stable security definer set search_path = public as $$
  select distinct u.oeuvre_id, f.format, 'achat'::text
    from public.ss_achats a cross join lateral unnest(a.oeuvres) as u(oeuvre_id) cross join lateral unnest(a.formats) as f(format)
   where a.client_id = p_client and a.statut = 'confirme'
  union
  select distinct o.id, fm.format, 'abonnement'::text
    from public.ss_abonnements ab
    join public.ss_formules_contenus c on c.formule_id = ab.formule_id and c.inclus
    join public.ss_oeuvres o on (o.id = c.oeuvre_id or o.collection_id = c.collection_id)
    cross join lateral unnest(c.formats) as fm(format)
   where ab.client_id = p_client and ab.statut = 'actif' and ab.debut <= now() and (ab.fin is null or ab.fin > now())
     and not exists (select 1 from public.ss_formules_contenus x where x.formule_id = ab.formule_id and not x.inclus and (x.oeuvre_id = o.id or x.collection_id = o.collection_id));
$$;
revoke all on function public.ss_droits_de(uuid) from public, anon, authenticated;   -- usage interne uniquement

create or replace function public.ss_a_droit(p_oeuvre uuid, p_format text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.ss_studio() or public.ss_est_adulte() and public.ss_oeuvre_visible(p_oeuvre)
     and exists (select 1 from public.ss_droits_de(auth.uid()) d where d.oeuvre_id = p_oeuvre and d.format = p_format);
$$;

-- ── Fonctions clientes ─────────────────────────────────────
-- Catalogue : adultes vérifiées uniquement ; jamais les fichiers, jamais le texte intégral.
create or replace function public.ss_catalogue() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not public.ss_est_adulte() then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'titre', o.titre, 'sous_titre', o.sous_titre, 'type', o.type, 'synopsis', o.synopsis,
      'avertissements', o.avertissements, 'nb_mots', o.nb_mots, 'duree_audio_s', o.duree_audio_s,
      'couverture', case when o.couverture_validee then o.couverture_chemin end,
      'collection', (select jsonb_build_object('id', c.id, 'type', c.type, 'titre', c.titre, 'description', c.description, 'exclusive', c.exclusive_abonnes) from public.ss_collections c where c.id = o.collection_id and c.statut = 'publie'),
      'numero', o.numero_dans_collection,
      'nb_chapitres', (select count(*) from public.ss_chapitres ch where ch.oeuvre_id = o.id and ch.statut = 'valide'),
      'personnages', (select coalesce(jsonb_agg(jsonb_build_object('nom', p.nom, 'presentation', p.presentation_publique) order by p.ordre), '[]'::jsonb) from public.ss_personnages p where p.oeuvre_id = o.id and p.presentation_publique is not null),
      'extraits', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'type', e.type)), '[]'::jsonb) from public.ss_extraits e where e.oeuvre_id = o.id and e.statut = 'publie'),
      'offres', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'type', f.type, 'formats', f.formats, 'libelle', f.libelle, 'prix_centimes', f.prix_centimes,
                   'prix_promo_centimes', case when now() between coalesce(f.promo_debut, '-infinity') and coalesce(f.promo_fin, 'infinity') then f.prix_promo_centimes end)), '[]'::jsonb)
                 from public.ss_offres f where f.statut = 'publie' and (f.oeuvre_id = o.id or f.collection_id = o.collection_id)),
      'mes_formats', (select coalesce(jsonb_agg(distinct d.format), '[]'::jsonb) from public.ss_droits_de(auth.uid()) d where d.oeuvre_id = o.id),
      'acces_anticipe', o.acces_anticipe_jusqua is not null and o.acces_anticipe_jusqua > now()
    ) order by o.date_publication desc)
    from public.ss_oeuvres o where o.statut = 'publie' and not o.prive and o.valide_le is not null), '[]'::jsonb) end;
$$;

-- Extrait gratuit : uniquement le passage copié (ou le chemin du fichier d'extrait séparé).
create or replace function public.ss_extrait(p_extrait uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', e.id, 'type', e.type, 'texte', e.texte, 'audio_chemin', e.audio_chemin)
    from public.ss_extraits e
   where e.id = p_extrait and e.statut = 'publie' and public.ss_est_adulte() and public.ss_oeuvre_visible(e.oeuvre_id);
$$;

-- Lecture d'un chapitre (livre numérique acheté ou inclus dans l'abonnement actif).
create or replace function public.ss_lire_chapitre(p_oeuvre uuid, p_ordre int) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ordre', c.ordre, 'titre', c.titre, 'texte', c.texte,
           'sommaire', (select jsonb_agg(jsonb_build_object('ordre', x.ordre, 'titre', x.titre) order by x.ordre) from public.ss_chapitres x where x.oeuvre_id = p_oeuvre and x.statut = 'valide'))
    from public.ss_chapitres c
   where c.oeuvre_id = p_oeuvre and c.ordre = p_ordre and c.statut = 'valide' and public.ss_a_droit(p_oeuvre, 'ebook');
$$;

-- Bibliothèque personnelle : ouvrages détenus, avec l'origine de chaque droit.
create or replace function public.ss_ma_bibliotheque() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not public.ss_est_adulte() then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object('oeuvre_id', d.oeuvre_id, 'titre', o.titre, 'format', d.format, 'origine', d.origine) order by o.titre)
      from public.ss_droits_de(auth.uid()) d join public.ss_oeuvres o on o.id = d.oeuvre_id
     where public.ss_oeuvre_visible(d.oeuvre_id)), '[]'::jsonb) end;
$$;

-- Fichiers détenus pour un ouvrage (chemins à signer ensuite ; refusé sans droit sur le format).
create or replace function public.ss_mes_fichiers(p_oeuvre uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('format', f.format, 'type', f.type_fichier, 'chemin', f.chemin, 'duree_s', f.duree_s,
           'chapitre', c.ordre, 'titre', c.titre) order by c.ordre nulls first), '[]'::jsonb)
    from public.ss_fichiers f left join public.ss_chapitres c on c.id = f.chapitre_id
   where f.oeuvre_id = p_oeuvre and f.statut = 'valide' and public.ss_a_droit(p_oeuvre, f.format);
$$;

-- Fichier : autorisé si studio, ou fichier d'extrait publié (adulte), ou fichier validé d'un format détenu.
create or replace function public.ss_fichier_autorise(p_chemin text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.ss_studio()
    or (public.ss_est_adulte() and exists (select 1 from public.ss_extraits e where e.audio_chemin = p_chemin and e.statut = 'publie' and public.ss_oeuvre_visible(e.oeuvre_id)))
    or exists (select 1 from public.ss_fichiers f where f.chemin = p_chemin and f.statut = 'valide' and public.ss_a_droit(f.oeuvre_id, f.format))
    or exists (select 1 from public.ss_oeuvres o where o.couverture_chemin = p_chemin and o.couverture_validee and public.ss_est_adulte() and public.ss_oeuvre_visible(o.id));
$$;

revoke all on function public.ss_catalogue(), public.ss_mes_fichiers(uuid), public.ss_extrait(uuid), public.ss_lire_chapitre(uuid, int), public.ss_ma_bibliotheque(),
  public.ss_fichier_autorise(text), public.ss_a_droit(uuid, text), public.ss_oeuvre_visible(uuid), public.ss_est_adulte(), public.ss_studio() from public, anon;
grant execute on function public.ss_catalogue(), public.ss_mes_fichiers(uuid), public.ss_extrait(uuid), public.ss_lire_chapitre(uuid, int), public.ss_ma_bibliotheque(),
  public.ss_fichier_autorise(text), public.ss_a_droit(uuid, text), public.ss_oeuvre_visible(uuid), public.ss_est_adulte(), public.ss_studio() to authenticated;

-- ── Bucket privé ───────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('secret-stories-prive', 'secret-stories-prive', false) on conflict (id) do nothing;
do $$ begin
  drop policy if exists ss_fichiers_lecture on storage.objects;
  create policy ss_fichiers_lecture on storage.objects for select to authenticated
    using (bucket_id = 'secret-stories-prive' and public.ss_fichier_autorise(name));
  drop policy if exists ss_fichiers_ecriture on storage.objects;
  create policy ss_fichiers_ecriture on storage.objects for insert to authenticated with check (bucket_id = 'secret-stories-prive' and public.ss_studio());
  drop policy if exists ss_fichiers_maj on storage.objects;
  create policy ss_fichiers_maj on storage.objects for update to authenticated using (bucket_id = 'secret-stories-prive' and public.ss_studio()) with check (bucket_id = 'secret-stories-prive' and public.ss_studio());
  drop policy if exists ss_fichiers_suppression on storage.objects;
  create policy ss_fichiers_suppression on storage.objects for delete to authenticated using (bucket_id = 'secret-stories-prive' and public.is_fondatrice());
end $$;
