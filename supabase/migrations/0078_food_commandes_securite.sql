-- ═══════════════════════════════════════════════════════════
-- 0078_food_commandes_securite.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-11-03
-- Objet : durcissement de /api/food/commandes/create avant tout test
--   de commande réelle (demande explicite de Renée-Lise, 7 points).
--   Deux ajouts additifs, aucune colonne ni table existante modifiée :
--
--   1. bellaia_commandes.idempotency_key — un double envoi (double
--      clic, retry réseau) ne doit jamais créer deux commandes. Le
--      client génère une clé une fois par tentative de paiement ; la
--      route vérifie d'abord si une commande porte déjà cette clé et
--      renvoie celle-ci au lieu d'en recréer une. Nullable (les
--      autres univers n'envoient pas cette clé, rien ne change pour
--      eux) + unique (filet de sécurité serveur si deux requêtes
--      identiques arrivaient malgré tout en parallèle).
--
--   2. food_horaires_config — jours fermés, horaires de prise de
--      commande et quota quotidien. Une seule ligne attendue,
--      actif=false par défaut : tant que la fondatrice n'a rien
--      configuré, aucune commande n'est bloquée (jamais de jour/
--      horaire inventé). Écriture réservée fondatrice ; aucune policy
--      de lecture publique — seule la route serveur (clé service-
--      role) la consulte, jamais le navigateur directement.
--
-- Impact : 1 colonne nullable + unique ajoutée à bellaia_commandes
--   (migration 0069, VALIDÉE), 1 table créée, 1 policy.
-- ═══════════════════════════════════════════════════════════

alter table public.bellaia_commandes
  add column if not exists idempotency_key text unique;

create table if not exists public.food_horaires_config (
  id uuid primary key default gen_random_uuid(),
  actif boolean not null default false,
  jours_fermes int[] not null default '{}',  -- 0=dimanche .. 6=samedi (ISO JS Date.getDay())
  heure_ouverture time,
  heure_fermeture time,
  quota_commandes_jour integer,
  updated_at timestamptz not null default now()
);

alter table public.food_horaires_config enable row level security;

drop policy if exists food_horaires_config_fondatrice on public.food_horaires_config;
create policy food_horaires_config_fondatrice on public.food_horaires_config
  for all to authenticated
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='bellaia_commandes'
--     and column_name='idempotency_key';
--   → attendu : 1 ligne.
--
--   select to_regclass('public.food_horaires_config');
--   → attendu : non nul.
--
--   select policyname, cmd from pg_policies
--   where schemaname='public' and tablename='food_horaires_config';
--   → attendu : 1 ligne (food_horaires_config_fondatrice, ALL).
-- ═══════════════════════════════════════════════════════════
