-- ═══════════════════════════════════════════════════════════
-- 0079_food_horaires_retrait_pause.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-03
-- Auteur : Claude Code · Date de rédaction : 2026-11-03
-- Objet : complète food_horaires_config (migration 0078, VALIDÉE)
--   pour le cahier des charges horaires/quotas qu'elle a donné :
--     - "Heure limite des commandes" (ex. 12h) : déjà couvert par
--       heure_ouverture/heure_fermeture existants (ex. 00:00 → 12:00
--       = commandes acceptées jusqu'à midi) — aucune colonne
--       nouvelle nécessaire pour ça.
--     - "Heure de retrait" (ex. 18h) : purement informative (affichée
--       à la cliente et à la fondatrice), n'entre dans aucune
--       validation bloquante — nouvelle colonne heure_retrait.
--     - "Possibilité de suspendre temporairement les commandes" :
--       un arrêt d'urgence distinct du planning normal (jours
--       fermés/horaires), qui bloque toute commande immédiatement
--       quels que soient les autres réglages — nouvelle colonne
--       commandes_suspendues, default false (jamais suspendu tant
--       qu'elle ne l'active pas elle-même).
--
-- Impact : 2 colonnes nullable/avec défaut ajoutées à
--   food_horaires_config. Aucune donnée existante supprimée ou
--   modifiée, aucune policy changée.
-- ═══════════════════════════════════════════════════════════

alter table public.food_horaires_config
  add column if not exists heure_retrait time,
  add column if not exists commandes_suspendues boolean not null default false;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='food_horaires_config'
--     and column_name in ('heure_retrait','commandes_suspendues')
--   order by column_name;
--   → attendu : 2 lignes.
-- ═══════════════════════════════════════════════════════════
