-- ═══════════════════════════════════════════════════════════
-- 0080_clients_adresse_naissance.sql
-- STATUT: PROPOSITION — à exécuter et vérifier par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-07
-- Objet : demande explicite de Renée-Lise — pouvoir enregistrer
--   l'adresse et la date de naissance de ses clientes (CRM), pour
--   permettre un rappel automatique d'anniversaire (voir la route
--   /api/cron/occasions). "clients" est une table préexistante,
--   jamais créée par une migration trackée ici (comme food_commandes
--   en son temps) — on ajoute donc seulement ces 2 colonnes, sans
--   recréer ni modifier le reste de la table.
--
-- Impact : 2 colonnes nullable ajoutées à clients. Aucune donnée
--   existante supprimée ou modifiée, aucune policy touchée (les
--   politiques RLS déjà en place sur "clients" couvrent automatique-
--   ment les nouvelles colonnes, une policy "for all"/"select *" ne
--   liste jamais les colonnes une par une).
-- ═══════════════════════════════════════════════════════════

alter table public.clients
  add column if not exists adresse text,
  add column if not exists date_naissance date;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='clients'
--     and column_name in ('adresse','date_naissance')
--   order by column_name;
--   → attendu : 2 lignes.
-- ═══════════════════════════════════════════════════════════
