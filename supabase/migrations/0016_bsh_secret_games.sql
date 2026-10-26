-- ═══════════════════════════════════════════════════════════
-- 0016_bsh_secret_games.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-10-26
-- Objet : fait exister BSH Secret Games EN BASE, pour remplacer la
--   démo purement locale (renee-lise.github.io/bsh-secret-games,
--   localStorage uniquement, aucune donnée partagée) par un vrai
--   jeu intégré à Bellaïa : catalogue de cartes piloté par la
--   fondatrice, tirage et historique réels pour chaque cliente
--   connectée, et propositions de thèmes modérées par la fondatrice
--   (plus de pré-partage manuel obligatoire par WhatsApp pour
--   recevoir une idée — la modération reste 100% manuelle : rien
--   n'est publié sans qu'elle change le statut elle-même).
--
--   Priorité confirmée par Renée-Lise ("la mise en ligne et en
--   fonction de BSH Game est primordiale et importante").
--
-- Choix de modélisation :
--   - bsh_jeux_cartes : catalogue, gérable par la fondatrice depuis
--     son espace BSH, lu publiquement (comme stocks pour la
--     boutique : lecture publique des cartes actives seulement).
--   - bsh_jeux_themes : soumissions ouvertes à tout le monde
--     (comme le formulaire "Proposer un thème" du site existant),
--     mais lecture réservée à la fondatrice — ce n'est pas un
--     répertoire public, juste une boîte de suggestions.
--   - bsh_jeux_tirages : historique des tirages, uniquement pour
--     les clientes connectées (la visite anonyme peut tirer une
--     carte mais n'a pas d'historique conservé, comme pour
--     favoris/panier ailleurs dans BSH qui exigent déjà un compte).
--
-- Impact : entièrement additif.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bsh_jeux_cartes (
  id         uuid primary key default gen_random_uuid(),
  emoji      text not null,
  nom        text not null,
  question   text not null,
  ordre      integer not null default 0,
  statut     text not null default 'active' check (statut in ('active','inactive')),
  created_at timestamptz not null default now()
);

comment on table public.bsh_jeux_cartes is
  'Catalogue des cartes BSH Secret Games — géré par la fondatrice, lu publiquement (cartes actives uniquement).';

create table if not exists public.bsh_jeux_themes (
  id            uuid primary key default gen_random_uuid(),
  pseudo        text,
  titre         text not null,
  espace        text check (espace in ('le_cercle','bsh_lounge','secret_games','tous_espaces')),
  type_jeu      text check (type_jeu in ('cartes_defis','jeu_de_role','quiz_sondage','enigme_mystere','autre')),
  description   text,
  statut        text not null default 'en_attente' check (statut in ('en_attente','approuve','refuse')),
  notes_fondatrice text,
  created_at    timestamptz not null default now(),
  moderee_le    timestamptz
);

comment on table public.bsh_jeux_themes is
  'Propositions de thèmes/jeux soumises par les client·es — boîte de suggestions modérée manuellement par la fondatrice, jamais publiée automatiquement.';

create table if not exists public.bsh_jeux_tirages (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references public.profiles(id) on delete cascade,
  carte_id   uuid references public.bsh_jeux_cartes(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.bsh_jeux_tirages is
  'Historique des tirages de cartes Secret Games, par cliente connectée.';

alter table public.bsh_jeux_cartes enable row level security;
alter table public.bsh_jeux_themes enable row level security;
alter table public.bsh_jeux_tirages enable row level security;

-- Cartes : lecture publique des cartes actives, gestion fondatrice
drop policy if exists bsh_jeux_cartes_lecture_publique on public.bsh_jeux_cartes;
create policy bsh_jeux_cartes_lecture_publique on public.bsh_jeux_cartes
  for select to anon, authenticated
  using (statut = 'active');

drop policy if exists bsh_jeux_cartes_fondatrice on public.bsh_jeux_cartes;
create policy bsh_jeux_cartes_fondatrice on public.bsh_jeux_cartes
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- Thèmes : n'importe qui peut proposer, seule la fondatrice relit/modère
drop policy if exists bsh_jeux_themes_proposer on public.bsh_jeux_themes;
create policy bsh_jeux_themes_proposer on public.bsh_jeux_themes
  for insert to anon, authenticated
  with check (true);

drop policy if exists bsh_jeux_themes_fondatrice on public.bsh_jeux_themes;
create policy bsh_jeux_themes_fondatrice on public.bsh_jeux_themes
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- Tirages : une cliente connectée peut enregistrer et relire les siens
drop policy if exists bsh_jeux_tirages_propres on public.bsh_jeux_tirages;
create policy bsh_jeux_tirages_propres on public.bsh_jeux_tirages
  for select to authenticated
  using (client_id = auth.uid());

drop policy if exists bsh_jeux_tirages_creer on public.bsh_jeux_tirages;
create policy bsh_jeux_tirages_creer on public.bsh_jeux_tirages
  for insert to authenticated
  with check (client_id = auth.uid());

drop policy if exists bsh_jeux_tirages_fondatrice on public.bsh_jeux_tirages;
create policy bsh_jeux_tirages_fondatrice on public.bsh_jeux_tirages
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- Amorce du catalogue avec les 3 cartes déjà en ligne sur le site
-- GitHub Pages (reprises telles quelles, pour ne rien perdre de ce
-- qui existe déjà) — la fondatrice pourra en ajouter/modifier/
-- désactiver depuis son espace BSH.
insert into public.bsh_jeux_cartes (emoji, nom, question, ordre)
values
  ('❤️', 'AMOUR',  'Quel geste discret vous fait craquer ?', 1),
  ('👑', 'GLOIRE', 'Quelle phrase utiliseriez-vous pour séduire avec élégance ?', 2),
  ('🔥', 'AUDACE', 'Comment montrer votre intérêt tout en respectant les limites de l''autre ?', 3)
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select table_name from information_schema.tables
--   where table_schema='public'
--   and table_name in ('bsh_jeux_cartes','bsh_jeux_themes','bsh_jeux_tirages');
--   → attendu : les 3 noms.
--
--   select count(*) from public.bsh_jeux_cartes where statut='active';
--   → attendu : 3 (AMOUR/GLOIRE/AUDACE).
--
--   select tablename, policyname, cmd, permissive from pg_policies
--   where tablename in ('bsh_jeux_cartes','bsh_jeux_themes','bsh_jeux_tirages')
--   order by tablename, policyname;
--   → attendu : 7 lignes au total (2+2+3), toutes permissive = true.
--
--   Test décisif anon (doit renvoyer les 3 cartes, sans être connectée) :
--   begin;
--   set local role anon;
--   select nom from public.bsh_jeux_cartes;
--   rollback;
-- ═══════════════════════════════════════════════════════════
