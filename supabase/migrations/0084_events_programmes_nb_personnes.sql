-- ═══════════════════════════════════════════════════════════
-- 0084_events_programmes_nb_personnes.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-11
-- Objet : demande explicite de Renée-Lise — pouvoir indiquer le
--   nombre de personnes auquel un programme (menu + décoration) est
--   destiné. Le nombre de parts par ligne de menu (ex. "3 parts de
--   gâteau") vit dans la colonne jsonb "lignes" déjà existante
--   (ajout du champ "qte", aucune migration nécessaire pour ça) —
--   seul le total de personnes au niveau du programme a besoin d'une
--   vraie colonne.
-- Impact : 1 colonne nullable ajoutée à events_programmes
--   (préexistante, jamais modifiée ni supprimée).
-- ═══════════════════════════════════════════════════════════

alter table public.events_programmes
  add column if not exists nb_personnes int;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='events_programmes'
--     and column_name='nb_personnes';
--   → attendu : 1 ligne.
-- ═══════════════════════════════════════════════════════════
